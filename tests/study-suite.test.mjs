import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
function makeEnv(){
 const storage={subjects:[{id:'cog',name:'Cognitive Psychology'}],notes:[],cards:[],tasks:[],materials:[],stickies:[],pdfHighlights:[],research:[],boardItems:[],mindMaps:[],sessions:[],reviews:[]};
 let saves=0,tab='today',prompts=[];
 const callbacks={};
 const core={
  esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  getData:()=>storage,save:()=>{saves++},render:()=>{},setTab:name=>{tab=name},toast:()=>{},
  id:(()=>{let i=0;return()=>String(++i)})(),today:()=>'2026-10-31',openModal:()=>{},closeModal:()=>{}
 };
 const doc={addEventListener:(type,cb)=>{callbacks['doc:'+type]=cb},querySelector:()=>null,activeElement:{tagName:'BODY'},fullscreenElement:null};
 const window={PsychDeskCore:core,addEventListener:(type,cb)=>{callbacks['window:'+type]=cb}};
 const env=vm.createContext({window,document:doc,Date,console,URL,URLSearchParams,confirm:()=>true,prompt:()=>prompts.shift()||null,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},navigator:{language:'en-IN'},location:{search:'',pathname:'/psychdesk/'},history:{replaceState(){}}});
 return {storage,core,window,callbacks,env,setPrompts:p=>{prompts=[...p]},get saves(){return saves},get tab(){return tab}};
}
test('universal search indexes every requested study category without leaking HTML',()=>{
 const a=makeEnv();
 a.storage.notes.push({id:'n',title:'Memory',body:'Hippocampus and memory encoding',tags:'learning'});
 a.storage.stickies.push({id:'s',title:'Memory sticky',lines:['Encoding']});
 a.storage.research.push({id:'r',title:'Memory research',authors:'Researcher',doi:'10.1234/memory'});
 a.storage.pdfHighlights.push({id:'h',text:'Memory consolidation',note:'sleep'});
 vm.runInContext(code('study-extras.js'),a.env);
 const all=a.window.PsychDeskExtras.searchItems('memory');
 assert.equal(all.length,4);
 assert.equal(a.window.PsychDeskExtras.searchItems('memory','research').length,1);
 assert.equal(a.window.PsychDeskExtras.searchItems('memory','cards').length,0);
 assert.match(a.window.PsychDeskExtras.renderSearch(),/Search your desk/);
});
test('local flashcard extraction uses exact definitions and enforces limits',()=>{
 const a=makeEnv();
 vm.runInContext(code('study-extras.js'),a.env);
 const cards=a.window.PsychDeskExtras.generateCards('Classical conditioning: Learning by association between two stimuli.\nOperant conditioning: Learning through the consequences of actions.','cog');
 assert.equal(cards.length,2);
 assert.match(cards[0].answer,/association between two stimuli/);
 assert.equal(cards[0].subjectId,'cog');
 assert.equal(cards[0].due,'2026-10-31');
 assert.equal(a.window.PsychDeskExtras.validDOI('10.1037/ABC-100'),true);
 assert.equal(a.window.PsychDeskExtras.validDOI('https://evil.test'),false);
});
test('board and mind maps are backed by structured account data',()=>{
 const a=makeEnv();
 vm.runInContext(code('study-boards.js'),a.env);
 a.setPrompts(['Learning and Memory']);
 a.callbacks['doc:click']({target:{closest(selector){if(selector==='[data-board],[data-mind],[data-mind-node]')return {dataset:{mind:'newMap'}};return null;}},preventDefault(){}});
 assert.equal(a.storage.mindMaps.length,1);
 assert.equal(a.storage.mindMaps[0].title,'Learning and Memory');
 assert.match(a.window.PsychDeskBoards.renderMind(),/Learning and Memory/);
 assert.match(a.window.PsychDeskBoards.renderBoard(),/study board/);
});
test('PDF reader exposes a safe bookshelf before content is loaded',()=>{
 const a=makeEnv();
 a.window.PsychDeskCloud={fetchStudyMaterial:async()=>{throw Error('not authorized')}};
 a.storage.materials=[{id:'book-1',title:'Intro to Psychology',kind:'pdf',driveId:'0123456789ABCDE',fileName:'intro.pdf'}];
 vm.runInContext(code('pdf-reader.js'),a.env);
 const html=a.window.PsychDeskReader.render();
 assert.match(html,/Intro to Psychology/);
 assert.match(html,/Book reader/);
 assert.match(html,/openBook/);
});
