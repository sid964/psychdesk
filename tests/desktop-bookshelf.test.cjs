'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('desktop navigation shows only Home, Focus and More tools, preserving core controls',()=>{
 const html=src('index.html');
 const desktop=html.match(/<nav class="rail-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(desktop,'desktop navigation missing');
 assert.deepEqual([...desktop.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]),['today','focus','tools']);
 const mobile=html.match(/<nav class="bottom-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.deepEqual([...mobile.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]),['today','focus','tools']);
 for(const id of ['themeToggle','accountBtn','driveStatusChip','settingsBtn'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/PSYCHOLOGY STUDIES/);
 assert.match(html,/desktop-bookshelf\.css/);
});

test('bookshelf renders the complete Biological Psychology companion and existing private Drive books without touching saved records',()=>{
 const data={materials:[
  {id:'pdf-1',title:'Research Methods PDF',kind:'pdf',driveId:'private-drive-1'},
  {id:'md-1',title:'My Private Notes',kind:'markdown',driveId:'private-drive-2'}
 ],bookReading:[{bookId:'psychopathology-9e',completed:['legacy-1']}]};
 const snapshot=JSON.stringify(data);
 const core={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),getData:()=>data};
 const window={PsychDeskCore:core,PsychDeskBookCatalog:[],addEventListener(){}};
 const document={addEventListener(){}};
 vm.runInNewContext(src('book-reader.js'),{window,document,location:{hash:''},setTimeout,clearTimeout,history:{}});
 const html=window.PsychDeskBooks.renderHome();
 assert.match(html,/My bookshelf/);
 assert.match(html,/Biological Psychology/);
 assert.match(html,/biological-psychology-14e\.html/);
 assert.match(html,/books\.google\.com\/books\/content/);
 assert.match(html,/Research Methods PDF/);
 assert.match(html,/My Private Notes/);
 assert.match(html,/data-fast-pdf="open"/);
 assert.doesNotMatch(html,/Psychopathology/);
 assert.equal(JSON.stringify(data),snapshot,'render may not mutate existing private records');
});

test('Psychopathology is temporarily unpublished but its data schema remains preserved',()=>{
 assert.match(src('book-catalog.js'),/PsychDeskBookCatalog = \[\]/);
 const app=src('app.js');
 assert.match(app,/bookReading/);
 assert.match(app,/const retiredTabs=new Set/);
 assert.match(app,/['"]psychopathology['"]/);
 assert.match(app,/reader-fast/);
});

test('dictionary includes an indexed Biological Psychology heading search and no flashcard launcher',()=>{
 const text=src('psychology-knowledge.js');
 const window={};
 vm.runInNewContext(src('bio-book-index.js'),{window});
 assert.equal(window.PsychDeskBiologicalIndex.length,448);
 assert.ok(window.PsychDeskBiologicalIndex.some(item=>/Neuron/i.test(item.term)));
 assert.match(text,/function textbookMatches/);
 assert.match(text,/function textbookResults/);
 assert.match(text,/textbookResults\(\)/);
 assert.doesNotMatch(text,/Make flashcard<\/button>/);
});

test('Focus owns World launcher and Drive connection status has no rotating ornament',()=>{
 const world=src('world/world-bridge.js');
 const drive=src('drive-indicator.js');
 assert.match(world,/if\(tab!=='focus'\)return/);
 assert.match(world,/querySelector\('\.focus-room-intro'\)/);
 assert.doesNotMatch(world,/querySelector\('\.garden-entry'\)/);
 assert.match(drive,/drive-status-dot/);
 assert.match(drive,/Not connected/);
 assert.doesNotMatch(drive,/drive-orbit/);
 assert.match(src('desktop-bookshelf.css'),/animation:none!important/);
});

test('new browser-native PDF viewer stays separate from the annotated PDF.js reader and both are cached',()=>{
 const html=src('index.html'),sw=src('sw.js'),fast=src('fast-pdf-reader.js');
 for(const name of ['fast-pdf-reader.js','pdf-reader.js'])assert.ok(html.includes(name),name+' missing from app');
 for(const name of ['fast-pdf-reader.js','desktop-bookshelf.css','bio-book-index.js'])assert.ok(sw.includes("'./"+name+"'"),name+' missing from offline cache');
 assert.match(fast,/fetchStudyMaterial/);
 assert.match(fast,/URL\.createObjectURL/);
 assert.match(fast,/window\.PsychDeskFastPDF=/);
 assert.match(fast,/pdfReading/);
 assert.match(fast,/iframe/);
});