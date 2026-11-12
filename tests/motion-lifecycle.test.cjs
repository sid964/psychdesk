'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('covered home ambience pauses for the World and resumes after closing',()=>{
 const bodyClasses=new Set(),rootClasses=new Set();
 const classList=classes=>({contains:name=>classes.has(name),toggle(name,enabled){if(enabled)classes.add(name);else classes.delete(name)}});
 const document={hidden:false,readyState:'complete',documentElement:{dataset:{},classList:classList(rootClasses)},body:{classList:classList(bodyClasses)},addEventListener(){},dispatchEvent(){},querySelectorAll:()=>[]};
 const window={matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('motion-runtime.js','utf8'),{window,document,CustomEvent,MutationObserver:class{observe(){}},localStorage:{getItem:()=>null}});
 assert.equal(rootClasses.has('psychdesk-ambient-off'),false);
 bodyClasses.add('psychworld-open');window.PsychDeskMotionEngine.refresh();assert.equal(rootClasses.has('psychdesk-ambient-off'),true);
 assert.equal(window.PsychDeskMotionEngine.isEnabled(),true,'interaction motion preference is preserved');
 bodyClasses.delete('psychworld-open');window.PsychDeskMotionEngine.refresh();assert.equal(rootClasses.has('psychdesk-ambient-off'),false);
});
