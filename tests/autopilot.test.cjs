/* Targeted safety checks for the local-only text extraction worker. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('autopilot/worker.js','utf8');
function analyze(input){
 let output;
 const self={postMessage:x=>{output=x;}};
 vm.runInNewContext(source,{self});
 self.onmessage({data:{jobId:'test',source:{id:'n1',revision:'r1',title:'Lecture 4',text:input}}});
 assert.equal(output.jobId,'test');
 assert.ok(!output.error,output.error);
 return output.result;
}
test('Extracts an explicit definition with original meaning intact',()=>{
 const r=analyze('Classical conditioning: Learning by associating two stimuli.\nChapter 2 Learning');
 assert.equal(r.cards.length,1);
 assert.match(r.cards[0].answer,/associating two stimuli/);
 assert.equal(r.cards[0].origin,'explicit definition');
 assert.ok(r.outline.includes('Chapter 2 Learning'));
});
test('Does not fabricate flashcards when source has no explicit definitions',()=>{
 const r=analyze('There was an interesting lecture on psychology.\nThe class discussed questions in small groups.');
 assert.equal(r.cards.length,0);
});
test('Finds references without networking or modifying the text source',()=>{
 const input='Working memory: A capacity-limited system for holding and manipulating information.\nPavlov (1927) https://doi.org/10.1000/xyz123';
 const r=analyze(input);
 assert.ok(r.researchers.includes('Pavlov'));
 assert.ok(r.years.includes('1927'));
 assert.ok(r.dois.includes('10.1000/xyz123'));
 assert.equal(r.cards[0].answer,'A capacity-limited system for holding and manipulating information.');
});
