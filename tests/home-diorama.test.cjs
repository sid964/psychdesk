const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function garden() {
 const window = {addEventListener(){}};
 const document = {addEventListener(){},documentElement:{dataset:{}}};
 vm.runInNewContext(fs.readFileSync('autopilot/garden.js','utf8'),{window,document,requestAnimationFrame(){}});
 return window.PsychDeskGarden;
}
test('garden sprouts represent only saved concepts still in the catalogue',()=>{
 const g=garden();
 const empty=g.scene([],[]);
 assert.doesNotMatch(empty,/data-auto="related"/);
 const result=g.scene([{id:'missing'},{id:'memory'}],[{id:'memory',title:'Memory & "attention" <study>'}]);
 assert.equal((result.match(/data-auto="related"/g)||[]).length,1);
 assert.match(result,/data-id="memory"/);
 assert.match(result,/Explore saved idea: Memory &amp; &quot;attention&quot; &lt;study>/);
 assert.doesNotMatch(result,/undefined/);
});
test('garden preserves keyboard tree and pond controls and bounds saved objects',()=>{
 const items=Array.from({length:12},(_,i)=>({id:'idea-'+i,title:'Idea '+i}));
 const result=garden().scene(items,items);
 assert.equal((result.match(/data-auto="related"/g)||[]).length,5);
 assert.equal((result.match(/class="garden-tree(?: garden-pine)?" role="button" tabindex="0"/g)||[]).length,4);
 assert.match(result,/class="garden-pond-hit"[^>]*role="button" tabindex="0"/);
});
