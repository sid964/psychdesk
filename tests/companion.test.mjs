import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('../companion/'+name,import.meta.url),'utf8');
test('private pose fallback rejects external/executable URLs and keeps state priority',()=>{
 const window={PsychDeskCompanionArtwork:{waving:'https://example.com/a.svg',idle:'companion/assets/idle.webp'}};
 vm.runInNewContext(source('assets-loader.js'),{window,localStorage:{getItem:()=>JSON.stringify({waving:'data:image/png;base64,YQ==',idle:'javascript:alert(1)'})}});
 assert.deepEqual(Array.from(window.PsychDeskCompanionAssets.candidates('waving')),['data:image/png;base64,YQ==','companion/assets/idle.webp']);
 assert.equal(window.PsychDeskCompanionAssets.states.length,11);
});
test('invalid imports and failed storage cannot overwrite a private pose',async()=>{
 const window={};let saved='{}';
 class FileReader{readAsDataURL(){this.result='data:image/png;base64,YQ==';this.onload();}}
 class Image{set src(v){this.onload();}}
 vm.runInNewContext(source('assets-loader.js'),{window,FileReader,Image,localStorage:{getItem:()=>saved,setItem(){throw Error('quota');}}});
 await assert.rejects(window.PsychDeskCompanionAssets.import('idle',{name:'x.png',size:400000}),/350 KB/);
 await assert.rejects(window.PsychDeskCompanionAssets.import('idle',{name:'x.png',size:20}),/storage is full/);
 assert.equal(window.PsychDeskCompanionAssets.candidates('idle').length,0);
});
test('speech queue is bounded, clamped and discarded when editing begins',()=>{
 const window={},hint={hidden:true,dataset:{}},text={textContent:''};let allowed=true,id=0;const timers=new Map(),delays=[];
 vm.runInNewContext(source('bubbles.js'),{window,setTimeout(fn,ms){timers.set(++id,fn);delays.push(ms);return id;},clearTimeout(id){timers.delete(id);}});
 const b=window.PsychDeskCompanionBubbles({hint,text,allowed:()=>allowed,place(){}});
 b.say('a',9000);b.say('b');b.say('c');b.say('d');assert.equal(text.textContent,'a');assert.equal(delays[0],4000);
 let fn=[...timers.values()][0];timers.clear();fn();assert.equal(text.textContent,'c');
 allowed=false;fn=[...timers.values()][0];timers.clear();fn();assert.equal(text.textContent,'');assert.equal(hint.hidden,true);
 allowed=true;b.say('e',100);assert.equal(delays.at(-1),2000);b.clear();assert.equal(timers.size,0);
});
