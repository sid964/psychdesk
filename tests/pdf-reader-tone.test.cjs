'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=p=>fs.readFileSync(p,'utf8');
test('PDF reader adds local and account-scoped visual tone without changing original PDF page layout',()=>{
 const reader=src('pdf-reader.js'),style=src('reader-studio.css');
 assert.match(reader,/const toneKey=.*core\.getStorageKey\(\)/);
 assert.match(reader,/function restoreTone\(\)/);
 assert.match(reader,/function cycleTone\(\)/);
 assert.match(reader,/data-reader="appearance"/);
 assert.match(reader,/reader-book-shell/);
 assert.match(reader,/reader-page-surface/);
 assert.match(style,/\.reader-book-shell\[data-reader-tone="dark"\]/);
 assert.match(style,/\.reader-book-shell\s+\.reader-page-surface\{background:white;color:black\}/);
 assert.match(reader,/core\.setTab\('reader'\)/);
});
