const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function harness({saveOk=true,native=false}={}){
 const handlers={},nodes=new Map();
 const data={version:2,subjects:[{id:'cog',name:'Cognitive Psychology'}],tasks:[],cards:[],sessions:[],notes:[],inkNotes:[],preferences:{}};
 const page={id:'ink1',title:'Learning theories',subjectId:'cog',strokes:[
  {kind:'pen',c:'#20252b',w:3,p:[[30,60,40],[45,64,70],[53,65,60]]},
  {kind:'pen',c:'#20252b',w:3,p:[[30,123,50],[42,128,60],[54,129,90]]}
 ]};
 data.inkNotes=[page];
 let seq=0,tab='',saves=0;
 const makeCanvas=()=>{
  const ctx={fillRect(){},translate(){},scale(){},save(){},restore(){},beginPath(){},arc(){},fill(){},stroke(){},moveTo(){},lineTo(){}};
  return {width:0,height:0,getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,YWJj'};
 };
 const core={getData:()=>data,id:()=> 'generated-'+(++seq),save:()=>{saves++;return saveOk;},setTab:next=>{tab=next;},toast(){},esc:v=>String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]))};
 const win={PsychDeskCore:core,PsychDeskInk:{getActive:()=>page,drawStroke:()=>{},saveChange:(n,rollback)=>{if(!saveOk){rollback();return false;}saves++;return true;},openPage:()=>true},addEventListener:(n,fn)=>handlers[n]=fn};
 const document={getElementById:id=>nodes.get(id)||null,
  createElement:tag=>tag==='canvas'?makeCanvas():{href:'',click(){},remove(){}},
  addEventListener:(n,fn)=>handlers[n]=fn};
 const context={window:win,document,navigator:{},TextEncoder,Date,URL,Blob,setTimeout,clearTimeout,console};
 if(native){
  class HandwritingStroke{constructor(){this.points=[];}addPoint(p){this.points.push(p);}}
  context.HandwritingStroke=HandwritingStroke;
  context.navigator.createHandwritingRecognizer=async()=>({
   startDrawing:()=>({addStroke(){},getPrediction:async()=>[{text:'Classical conditioning'}],clear(){}}),
   finish(){}
  });
 }
 vm.runInNewContext(source('ink-smart.js'),context,{timeout:1000});
 return {api:win.PsychDeskSmartInk,data,page,nodes,handlers,core,getTab:()=>tab,getSaves:()=>saves};
}
test('stroke clustering recognizes multiple handwritten lines without reading highlighter strokes',()=>{
 const h=harness();
 h.page.strokes.push({kind:'highlighter',p:[[25,60,40],[100,64,40]]});
 const lines=h.api.lineGroups(h.page);
 assert.equal(lines.length,2);
 assert.equal(lines[0].strokes.length,1);
 assert.equal(lines[1].strokes.length,1);
 assert.ok(lines[0].box.minY<lines[1].box.minY);
 const source={...h.page,strokes:h.page.strokes};
 assert.equal(h.api.fingerprint(source),h.api.fingerprint(h.page));
 source.strokes=[...h.page.strokes,{kind:'pen',p:[[40,260,20]]}];
 assert.notEqual(h.api.fingerprint(source),h.api.fingerprint(h.page));
});
test('browser-native recognizer is used when available without remote model downloads',async()=>{
 const h=harness({native:true});
 const text=await h.api.transcribe(h.page);
 assert.equal(text,'Classical conditioning\nClassical conditioning');
});
test('line-by-line local TrOCR accepts a test pipeline and does not require API keys',async()=>{
 const h=harness(),images=[];
 const text=await h.api.transcribe(h.page,{pipeOverride:async image=>{
  images.push(image);return [{generated_text:'  Operant   conditioning. '}];
 }});
 assert.equal(text,'Operant conditioning.\nOperant conditioning.');
 assert.equal(images.length,2);
 assert.ok(images.every(x=>x.startsWith('data:image/png;')));
 assert.ok(source('ink-smart.js').includes("Xenova/trocr-small-handwritten"));
 assert.ok(!source('ink-smart.js').includes('Tesseract'));
});
test('edited transcription creates a separate Study Note and preserves original pen strokes',()=>{
 const h=harness(),before=JSON.stringify(h.page.strokes);
 h.nodes.set('inkSmartText',{value:'Classical conditioning means learning from associations.'});
 h.nodes.set('inkSmartStatus',{dataset:{},textContent:''});
 h.nodes.set('inkSmartPanel',{remove(){}});
 h.api.saveToNotes();
 assert.equal(h.data.notes.length,1);
 assert.equal(h.data.notes[0].title,'Learning theories');
 assert.equal(h.data.notes[0].subjectId,'cog');
 assert.equal(h.data.notes[0].inkSourceId,'ink1');
 assert.equal(h.data.notes[0].body,'Classical conditioning means learning from associations.');
 assert.equal(h.page.neatText,h.data.notes[0].body);
 assert.equal(JSON.stringify(h.page.strokes),before);
 assert.equal(h.getTab(),'notes');
 h.api.saveToNotes();
 assert.equal(h.data.notes.length,1,'duplicate text for the same page is not appended again');
});
test('saving recognized text rolls back on a storage failure, leaving the ink page unchanged',()=>{
 const h=harness({saveOk:false});
 const prior=JSON.stringify(h.page);
 h.nodes.set('inkSmartText',{value:'Cognitive development'});
 h.nodes.set('inkSmartStatus',{dataset:{},textContent:''});
 h.nodes.set('inkSmartPanel',{remove(){}});
 h.api.saveToNotes();
 assert.equal(h.data.notes.length,0);
 assert.equal(JSON.stringify(h.page),prior);
 assert.equal(h.getTab(),'');
});
test('UI references are wired without adding paid cloud endpoints or implicit automatic recognition',()=>{
 const ink=source('ink-notes.js'),cloud=source('cloud.js'),html=source('index.html'),sw=source('sw.js');
 assert.ok(ink.includes("data-ink=\"neaten\""));
 assert.ok(ink.includes('PsychDeskSmartInk?.open'));
 assert.ok(cloud.includes('data-inksmart="source"'));
 assert.ok(html.includes('ink-smart.js?v=1'));
 assert.ok(html.includes('ink-smart.css?v=1'));
 assert.ok(sw.includes("'./ink-smart.js'"));
 assert.ok(!sw.includes('trocr-small-handwritten')); // never precache large model
});
