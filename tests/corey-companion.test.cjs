const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('counseling-psychotherapy-corey-9e.html','utf8');
const marker='const psychdeskBookData = ';
const start=html.indexOf(marker)+marker.length;
const end=html.indexOf(';\nconst COVER_ART=',start);
const book=JSON.parse(html.slice(start,end));
test('Corey stable identity, source mapping and note anchors',()=>{
 assert.equal(book.slug,'counseling-psychotherapy-corey-9e');
 assert.equal(book.storageKey,'psychdesk-reader:counseling-psychotherapy:corey:9e:9780840028549');
 assert.equal(book.chapters.length,16);
 assert.equal(book.studyParts.length,16);
 let count=0;
 const ids=new Set();
 for(const chapter of book.chapters){
  const module=chapter.modules[0];
  const part=book.studyParts.find(p=>p.chapterId===chapter.id);
  assert.ok(part&&part.classroomNotes.length);
  const headings=new Map(module.headings.map(h=>[h.id,h]));
  for(const n of part.classroomNotes){
   assert.ok(!ids.has(n.headingId));
   ids.add(n.headingId);
   assert.ok(headings.has(n.headingId));
   assert.equal(n.pdfPage-n.printedPage,20);
   assert.equal(n.pdfPage,headings.get(n.headingId).pdfPage);
   assert.equal(part.classroomParagraphs[n.paragraphIndex-20000],n.explanation);
   assert.ok(n.recall.question&&n.recall.answer&&n.bullets.length);
   for(const p of n.bullets)assert.equal(part.classroomParagraphs[p.paragraphIndex-20000],p.explanation);
   count++;
  }
 }
 assert.equal(count,book.coverage.explainedDraftTopics);
 assert.ok(count>=236);
 assert.ok(book.coverage.completedChapters<=16);
});
test('Corey inline scripts parse and shelf remains linked',()=>{
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){
  if(match[1].trim())new vm.Script(match[1]);
 }
 const shelf=fs.readFileSync('book-reader.js','utf8');
 assert.ok(shelf.includes('./counseling-psychotherapy-corey-9e.html'));
 assert.ok(shelf.includes(book.coverage.explainedDraftTopics+' teaching topics'));
});
