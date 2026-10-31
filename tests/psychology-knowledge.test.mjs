import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
function env(){
 const state={version:2,subjects:[{id:'cog',name:'Cognitive Psychology'}],notes:[],cards:[],stickies:[],research:[],
  dictionaryEntries:[],dictionaryBookmarks:[],timelineEvents:[],timelineBookmarks:[],timelineAnnotations:[]};
 let next=0,saves=0,tab='';
 const listeners={};
 const core={esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;"),
  getData:()=>state,id:()=>String(++next),save:()=>{saves++;},render:()=>{},setTab:value=>{tab=value;},
  openModal:()=>{},closeModal:()=>{},toast:()=>{},today:()=>'2026-11-01'};
 const doc={addEventListener:(event,cb)=>{(listeners[event] ||= []).push(cb)},querySelector:()=>null};
 const window={PsychDeskCore:core,addEventListener(){}};
 const context=vm.createContext({window,document:doc,URL,Date,console,confirm:()=>true,setTimeout:()=>1,clearTimeout:()=>{},
  navigator:{clipboard:{writeText:async()=>{}}}});
 vm.runInContext(source('psychology-data.js'),context);
 vm.runInContext(source('psychology-knowledge.js'),context);
 vm.runInContext(source('reference-manager.js'),context);
 return {state,core,window,listeners,context,get saves(){return saves},get tab(){return tab}};
}
test('curated dictionary includes accurate, searchable concepts without storing built-in data in Firestore',()=>{
 const a=env(),dict=a.window.PsychDeskKnowledge,curated=a.window.PSYCHDESK_PSYCHOLOGY_REFERENCE;
 assert.ok(curated.definitions.length>=50);
 assert.ok(dict.findTerms('negative reinforcement').some(x=>x.id==='negative-reinforcement'));
 assert.match(dict.termById('negative-reinforcement').definition,/removing or reducing an aversive stimulus/i);
 assert.equal(a.state.dictionaryEntries.length,0);
 assert.equal(a.state.dictionaryBookmarks.length,0);
 assert.match(dict.renderDictionary(),/Psychology Dictionary/);
});
test('timeline links to sourced milestones and retains personal selection',()=>{
 const a=env(),knowledge=a.window.PsychDeskKnowledge;
 assert.ok(knowledge.history().length>=34);
 assert.ok(knowledge.history().some(x=>x.year===1879&&/Wundt/i.test(x.title)));
 assert.ok(knowledge.timelineEntries('1913').some(x=>/Watson/i.test(x.people)));
 assert.ok(knowledge.timelineEntries('2022').some(x=>/ICD-11/i.test(x.title)));
 assert.ok(knowledge.timelineEntries('2015').some(x=>/reproducibility/i.test(x.title)));

 assert.match(knowledge.renderTimeline(),/Psychology Timeline/);
 knowledge.openTerm('working-memory');assert.equal(a.tab,'dictionary');
 knowledge.openEvent('milestone-2');assert.equal(a.tab,'timeline');
});
test('dictionary bookmark and one-click notebook copy save only user data',()=>{
 const a=env();
 const click=dataset=>a.listeners.click.forEach(listener=>listener({target:{closest:()=>({dataset})},preventDefault(){}}));
 click({psy:'bookmark',id:'working-memory'});
 assert.equal(a.state.dictionaryBookmarks[0],'working-memory');
 click({psy:'noteTerm',id:'working-memory'});
 assert.equal(a.state.notes.length,1);
 assert.match(a.state.notes[0].body,/limited-capacity/);
 assert.equal(a.state.dictionaryEntries.length,0);
 assert.ok(a.saves>=2);
});
test('legacy references render in upgraded manager without rewriting data',()=>{
 const a=env();
 a.state.research.push({id:'legacy',title:'Longstanding Study',authors:'Ada Lovelace',year:2001,doi:'10.1000/example',createdAt:'2025-01-01'});
 const content=a.window.PsychDeskReferences.render();
 assert.match(content,/Longstanding Study/);
 assert.match(content,/Copy citation/);
 assert.equal(a.state.research[0].type,undefined);
});
test('RIS import/export preserves essential metadata for reference managers',()=>{
 const a=env(),api=a.window.PsychDeskReferences;
 const input={id:'x',type:'journal',title:'Memory and Learning',authors:'Ada Lovelace; Alan Turing',
  journal:'Journal of Memory',year:2020,volume:'12',issue:'3',pages:'45-60',doi:'10.1000/test-2020',url:'https://doi.org/10.1000/test-2020'};
 const ris=api.exportRIS([input]),back=api.parseRIS(ris);
 assert.match(ris,/TY\s+- JOUR/);
 assert.equal(back.length,1);
 assert.equal(back[0].title,input.title);
 assert.equal(back[0].journal,input.journal);
 assert.equal(back[0].pages,input.pages);
 assert.equal(back[0].doi,input.doi);
 assert.match(back[0].authors,/Alan Turing/);
});
test('BibTeX import/export supports nested braces and title metadata',()=>{
 const a=env(),api=a.window.PsychDeskReferences;
 const source='@article{smith2022,\n title = {Studies of {Long-Term} Memory},\n author = {Smith, Jane and Doe, John},\n journal = {Psychology Review},\n year = {2022},\n volume = {4},\n number = {2},\n pages = {10--20},\n doi = {10.1000/foo}\n}';
 const result=api.parseBibTeX(source);
 assert.equal(result.length,1);
 assert.match(result[0].title,/Long-Term/);
 assert.equal(result[0].year,2022);
 const exported=api.exportBibTeX(result),roundtrip=api.parseBibTeX(exported);
 assert.equal(roundtrip.length,1);
 assert.equal(roundtrip[0].title,result[0].title);
 assert.equal(roundtrip[0].doi,'10.1000/foo');
});
test('import preview rejects duplicate DOI and duplicate normalized title without altering existing records',()=>{
 const a=env(),api=a.window.PsychDeskReferences;
 a.state.research=[{id:'old',title:'Existing Research',year:2019,doi:'10.1000/original'}];
 const preview=api.importPreview([
  {title:'Different title same DOI',year:2019,doi:'10.1000/ORIGINAL'},
  {title:'New Source',year:2020},
  {title:'New Source',year:2020},
  {title:'Existing Research',year:2019}
 ]);
 assert.equal(preview.length,1);
 assert.equal(preview[0].title,'New Source');
 assert.equal(a.state.research.length,1);
});
test('APA-style draft includes author initials, publication year and DOI link',()=>{
 const a=env(),api=a.window.PsychDeskReferences;
 const rendered=api.apaDraft({title:'Testing behavior',authors:'Ada Lovelace; Alan Turing',year:2023,
  journal:'Journal of Psychology',volume:'8',issue:'2',pages:'30-45',doi:'10.1000/abc'});
 assert.match(rendered,/Lovelace, A\./);
 assert.match(rendered,/Turing, A\./);
 assert.match(rendered,/\(2023\)/);
 assert.match(rendered,/https:\/\/doi\.org\/10\.1000\/abc/);
 assert.ok(!rendered.includes('<script'));
});
test('reference cards escape HTML in imported title and show verified URLs only',()=>{
 const a=env();
 a.state.research.push({id:'injected',title:'<img src=x onerror=alert(1)>',authors:'Researcher',
 url:'javascript:alert(1)',doi:''});
 const markup=a.window.PsychDeskReferences.render();
 assert.ok(markup.includes('&lt;img'));
 assert.ok(!markup.includes('href="javascript:'));
});

test('personal timeline reflections can be bookmarked and stored without modifying curated milestones',()=>{
 const a=env();
 a.core.getData().timelineEvents.push({id:'my-event',year:1982,title:'My local milestone',
  description:'Academic history in my town',era:'foundations',people:'Local researchers',personal:true});
 const click=dataset=>a.listeners.click.forEach(cb=>cb({target:{closest:()=>({dataset})},preventDefault(){}}));
 click({psy:'bookmarkEvent',id:'my-event'});
 assert.equal(a.state.timelineBookmarks[0],'my-event');
 assert.ok(a.window.PSYCHDESK_PSYCHOLOGY_REFERENCE.timeline.length>=34);
 a.window.PsychDeskKnowledge.openEvent('my-event');
 assert.equal(a.tab,'timeline');
});

test('BibTeX export makes duplicate citation keys unique without editing stored references',()=>{
 const a=env(),api=a.window.PsychDeskReferences;
 const entries=[{title:'First Paper',citationKey:'same2023',year:2023},{title:'Second Paper',citationKey:'same2023',year:2023}];
 const bib=api.exportBibTeX(entries);
 assert.match(bib,/@article\{same2023,/);
 assert.match(bib,/@article\{same2023_2,/);
 assert.equal(api.parseBibTeX(bib).length,2);
 assert.equal(entries[1].citationKey,'same2023');
});
