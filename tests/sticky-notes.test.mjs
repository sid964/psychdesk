import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../sticky-notes.js',import.meta.url),'utf8');
function harness(){
 const data={subjects:[{id:'cog',name:'Cognitive Psychology'}],stickies:[],notes:[]};
 const events={};let counter=0,saves=0,pending=null;
 const core={
  esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
  id:()=>String(++counter),getData:()=>data,save:()=>{saves++},
  setTab:()=>{},toast:()=>{}
 };
 const window={PsychDeskCore:core,addEventListener:(name,fn)=>{events['window:'+name]=fn}};
 const document={addEventListener:(name,fn)=>{events[name]=fn},querySelector:()=>null,visibilityState:'visible'};
 const context=vm.createContext({
  window,document,confirm:()=>true,Date,
  setTimeout:(fn)=>{pending=fn;return 1},
  clearTimeout:()=>{pending=null},
  console
 });
 vm.runInContext(source,context);
 return {data,window,events,runSave:()=>{const cb=pending;if(cb)cb()},get saves(){return saves}};
}
test('long study notes become linked cards while preserving original source',()=>{
 const env=harness();
 const source='Classical conditioning\n'+Array.from({length:18},(_,i)=>'A conditioned stimulus and response example number '+(i+1)+'.').join('\n');
 const result=env.window.PsychDeskStickies.generate(source,'', 'cog','rose','batch-a');
 assert.ok(result.length>=3);
 assert.equal(result[0].rawText,source);
 assert.equal(result[1].rawText,'');
 assert.ok(result.every(n=>n.groupId==='batch-a'&&n.subjectId==='cog'&&n.color==='rose'));
 assert.equal(result.length,result.filter(n=>Array.isArray(n.lines)&&n.lines.length).length);
 assert.ok(result.every(n=>n.lines.length<=5));
});
test('typing automatically saves and rewrites same sticky without duplicates',()=>{
 const env=harness();
 env.events.input({target:{id:'stickyText',value:'Operant conditioning uses consequences.'}});
 assert.equal(env.data.stickies.length,0);
 env.runSave();
 assert.equal(env.data.stickies.length,1);
 const firstId=env.data.stickies[0].id;
 env.events.input({target:{id:'stickyText',value:'Operant conditioning uses consequences.\nPositive reinforcement strengthens behavior.'}});
 env.runSave();
 assert.equal(env.data.stickies.length,1);
 assert.equal(env.data.stickies[0].id,firstId);
 assert.match(env.data.stickies[0].rawText,/Positive reinforcement/);
 assert.equal(env.saves,2);
});
test('notebook-to-sticky keeps original note unchanged',()=>{
 const env=harness();
 const note={id:'note1',title:'Piaget stages',body:'Sensorimotor stage\nPreoperational stage',subjectId:'cog'};
 env.data.notes.push(note);
 env.window.PsychDeskStickies.fromNote(note);
 env.runSave();
 assert.equal(env.data.notes[0].body,'Sensorimotor stage\nPreoperational stage');
 assert.equal(env.data.stickies[0].subjectId,'cog');
 assert.equal(env.data.stickies[0].title,'Piaget stages');
 assert.ok(env.data.stickies[0].rawText.includes('Sensorimotor'));
});
test('sticky rendering escapes untrusted text',()=>{
 const env=harness();
 const html=env.window.PsychDeskStickies.generate('<img src=x onerror=alert(1)>','', '', 'cream','batch')[0];
 env.data.stickies.push(html);
 const markup=env.window.PsychDeskStickies.render();
 assert.ok(!markup.includes('<img src=x'));
 assert.match(markup,/&lt;img/);
});