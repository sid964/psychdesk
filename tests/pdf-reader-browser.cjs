/* Phase 10: a local Markdown fixture exercises PDF reader chrome without Drive or a paid API.
 * Original PDF geometry is preserved by the existing PDF.js canvas, not reflowed.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.PSYCHDESK_TEST_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:800},serviceWorkers:'block'});
   const page=await context.newPage();
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.PsychDeskReader&&!!window.PsychDeskCore);
   const before=await page.evaluate(()=>JSON.stringify(window.PsychDeskCore.getData()));
   await page.evaluate(async()=>{
    const file=new File(['A note on stress and cognition.\n\nStudy safely.'],'reading.md',{type:'text/markdown'});
    await window.PsychDeskReader.openLocal(file);
   });
   await page.locator('.reader-book-shell').waitFor();
   assert.match(await page.locator('#readerMarkdown').innerText(),/A note on stress/);
   const mode=await page.locator('.reader-book-shell').getAttribute('data-reader-tone');
   await page.getByRole('button',{name:'Change reading appearance'}).click();
   assert.notEqual(await page.locator('.reader-book-shell').getAttribute('data-reader-tone'),mode);
   await page.getByRole('button',{name:'Change reading appearance'}).click();
   await page.getByRole('button',{name:'Change reading appearance'}).click();
   assert.equal(await page.locator('.reader-book-shell').getAttribute('data-reader-tone'),mode);
   assert.match(await page.locator('.reader-hero').innerText(),/reading.md/);
   assert.ok(await page.locator('#readerMarkdown').isVisible(),'reader content remains after tone changes');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=3),'reader overflows at '+width);
   await page.locator('[data-reader="back"]').click();
   await page.getByRole('heading',{name:'Book reader.'}).waitFor();
   assert.ok(await page.locator('#localReaderFile').count(),'local file picker remains accessible');
   await page.evaluate(()=>window.PsychDeskCore.setTab('materials'));
   await page.getByRole('heading',{name:'Reading library'}).waitFor();
   await page.locator('#main [data-tab="files"]').first().click();
   await page.getByRole('heading',{name:'Drive files.'}).waitFor();
   assert.equal(await page.evaluate(()=>JSON.stringify(window.PsychDeskCore.getData())),before,'reader and Drive navigation must not mutate study data');
   assert.deepEqual(errors,[],'reader runtime errors at '+width);
   await context.close();
  }
  console.log('PHASE10_BROWSER_PASS reader tones, local document, Drive separation, data safety and layout');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
