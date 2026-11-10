/* Run with: node --test tests/psychology-dictionary.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=name=>fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8');

test('supplemental definitions load, remain unique and cite further reading',()=>{
 const context={window:{}};vm.createContext(context);
 vm.runInContext(read('psychology-data.js'),context,{timeout:1000});
 const before=context.window.PSYCHDESK_PSYCHOLOGY_REFERENCE.definitions.length;
 assert.equal(before,64);
 vm.runInContext(read('psychology-expanded-data.js'),context,{timeout:1000});
 const definitions=context.window.PSYCHDESK_PSYCHOLOGY_REFERENCE.definitions;
 assert.equal(definitions.length,322);
 assert.equal(new Set(definitions.map(d=>d.id)).size,definitions.length);
 assert.equal(new Set(definitions.map(d=>d.term.trim().toLowerCase())).size,definitions.length);
 const categories=new Set(['Learning','Cognition','Biological','Development','Social','Research','Clinical']);
 for(const def of definitions){
  assert.ok(def.term&&def.definition&&def.id,'Every entry needs a term, definition and ID');
  assert.ok(categories.has(def.category),'Unexpected category: '+def.category);
  assert.ok(/^https:\/\//.test(def.source),'Source URL required');
 }
});
test('import module can initialize without changing account data',()=>{
 const context={window:{
  PSYCHDESK_PSYCHOLOGY_REFERENCE:{definitions:[]},
  PsychDeskCore:{esc:String},
  addEventListener:()=>{}
 },document:{addEventListener:()=>{}}};
 vm.runInNewContext(read('psychology-imports.js'),context,{timeout:1000});
 assert.equal(typeof context.window.PsychDeskDictionaryPacks.count,'function');
 assert.equal(typeof context.window.PsychDeskDictionaryPacks.search,'function');
 assert.equal(typeof context.window.PsychDeskDictionaryPacks.mount,'function');
});
test('HTML load order and service-worker cache include the new modules',()=>{
 const html=read('index.html'),sw=read('sw.js');
 for(const name of ['psychology-expanded-data.js','psychology-imports.js','psychology-imports.css']){
  assert.ok(html.includes(name),'Not linked: '+name);
  assert.ok(sw.includes(name),'Not precached: '+name);
 }
 assert.ok(html.indexOf('psychology-data.js')<html.indexOf('psychology-expanded-data.js'));
 assert.ok(html.indexOf('psychology-expanded-data.js')<html.indexOf('psychology-knowledge.js'));
 assert.ok(html.indexOf('psychology-knowledge.js')<html.indexOf('psychology-imports.js'));
});
