const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sourcePart=i=>path.join(root,'psychopathology-assets','part-'+String(i).padStart(2,'0')+'.txt');

test('Psychopathology companion is complete, source-mapped and linked in Bookshelf',()=>{
 const wrapper=fs.readFileSync(path.join(root,'psychopathology-9e.html'),'utf8');
 const parts=Array.from({length:23},(_,i)=>fs.readFileSync(sourcePart(i),'utf8'));
 const html=parts.join('');
 assert.ok(html.startsWith('<!doctype html>'));
 assert.ok(html.includes('const psychdeskBookData = '));
 assert.ok(wrapper.includes("const count=23"));
 assert.ok(wrapper.includes('extra-diagrams.js'));
 const prefix='const psychdeskBookData = ';
 const line=html.split('\n').find(row=>row.startsWith(prefix));
 assert.ok(line && line.endsWith(';'));
 const book=JSON.parse(line.slice(prefix.length,-1));
 assert.equal(book.chapters.length,16);
 assert.equal(book.studyParts.length,78);
 assert.equal(book.storageKey,'psychdesk-reader:psychopathology:barlow-durand-hofmann:9e:9780357657843');
 const ids=new Set(book.studyParts.map(part=>part.id));
 assert.equal(ids.size,78);
 const baseline=book.studyParts.reduce((n,part)=>n+(part.classroomFigures||[]).length,0);
 assert.ok(baseline>=121);
 const supplemental=fs.readFileSync(path.join(root,'psychopathology-assets','extra-diagrams.js'),'utf8');
 vm.runInNewContext(supplemental,{
  psychdeskBookData:book,
  btoa:value=>Buffer.from(value,'binary').toString('base64'),
  unescape,encodeURIComponent
 });
 const total=book.studyParts.reduce((n,part)=>n+(part.classroomFigures||[]).length,0);
 assert.equal(total,baseline+25);
 const figures=book.studyParts.flatMap(part=>part.classroomFigures||[]);
 const idsAfter=figures.map(figure=>figure.id);
 assert.equal(idsAfter.length,new Set(idsAfter).size);
 for(const figure of figures.filter(figure=>figure.id.endsWith('-fig-v7'))){
  assert.ok(figure.printedPage>=1);
  assert.equal(figure.pdfPage,figure.printedPage+28);
  assert.ok(figure.image.startsWith('data:image/svg+xml;base64,'));
  const svg=Buffer.from(figure.image.slice('data:image/svg+xml;base64,'.length),'base64').toString('utf8');
  assert.match(svg,/<svg /);
  assert.match(svg,/ORIGINAL EXPLANATORY STUDY DIAGRAM/);
 }
 assert.match(fs.readFileSync(path.join(root,'book-reader.js'),'utf8'),/psychopathology-9e.html/);
 const files=fs.readdirSync(path.join(root,'psychopathology-assets'));
 assert.equal(files.filter(file=>file.endsWith('.pdf')).length,0);
});
