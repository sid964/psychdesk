'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {validateBook,loadPackages,renderCatalog,OUTPUT}=require('../scripts/build-book-catalog.cjs');
test('production catalog exactly matches reviewed packages and does not ship placeholders',()=>{
 const books=loadPackages();
 assert.equal(books.length,1);
 assert.equal(books[0].id,'psychopathology-9e');
 assert.equal(books[0].chapters.length,16);
 assert.equal(books[0].chapters.flatMap(ch=>ch.sections).length,76);
 assert.equal(books[0].chapters.flatMap(ch=>ch.sections).filter(s=>s.kind==='guide').length,68);
 assert.equal(fs.readFileSync(OUTPUT,'utf8'),renderCatalog(books));
});
test('duplicate and malformed stable reading IDs cannot enter catalog',()=>{
 const book=structuredClone(loadPackages()[0]);
 assert.throws(()=>validateBook({...book,chapters:[...book.chapters,book.chapters[0]]}),/duplicate chapter ID/);
 const wrong=structuredClone(book);
 wrong.chapters[0].sections[0].id=wrong.chapters[0].sections[1].id;
 assert.throws(()=>validateBook(wrong),/duplicate reading part/);
 const malformed=structuredClone(book);
 malformed.id='<script>alert(1)</script>';
 assert.throws(()=>validateBook(malformed),/metadata/);
});
test('section provenance, page numbers, and block text are validated',()=>{
 const book=structuredClone(loadPackages()[0]);
 book.chapters[0].sections[0].kind='full textbook';
 assert.throws(()=>validateBook(book),/provenance/);
 book.chapters[0].sections[0].kind='detailed';
 book.chapters[0].sections[0].page=-7;
 assert.throws(()=>validateBook(book),/page mapping/);
 book.chapters[0].sections[0].page=3;
 book.chapters[0].sections[0].blocks[0].text='x'.repeat(12001);
 assert.throws(()=>validateBook(book),/reading block/);
});
