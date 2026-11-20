/* Phase 11: account-scoped achievements are derived from saved chapter records.
 * This is a browser mock, NOT a test of actual Google OAuth or Firestore.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.PSYCHDESK_TEST_URL||'http://127.0.0.1:8765';
const fixture=[{
 id:'achievement-sample',title:'Reading Sample',subject:'Cognitive Psychology',author:'Test author',edition:'Test edition',
 chapters:[1,2].map(n=>({id:'chapter-'+n,title:'Chapter '+n,sections:[{id:'part-'+n,title:'Part '+n,
  blocks:[{id:'opening',type:'paragraph',text:'A short source-authored example.'}]}]}))
}];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/book-catalog.js?*',route=>route.fulfill({
    contentType:'application/javascript',body:'window.PsychDeskBookCatalog='+JSON.stringify(fixture)+';'
   }));
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.PsychDeskBooks&&!!window.PsychDeskCore);
   await page.evaluate(()=>window.PsychDeskCore.setTab('materials'));
   await page.getByRole('heading',{name:'Reading library'}).waitFor();
   assert.match(await page.locator('.bk-ref-progress').innerText(),/0 read · 2 remaining/);
   assert.doesNotMatch(await page.locator('.bk-milestones').innerText(),/✦ First chapter/);
   await page.locator('.bk-ref-feature').getByRole('button',{name:'Continue reading'}).click();
   await page.getByRole('heading',{name:'Part 1'}).waitFor();
   await page.locator('.bk-bar').getByRole('button',{name:'Books',exact:true}).click();
   assert.match(await page.locator('.bk-ref-progress').innerText(),/0 read · 2 remaining/);
   await page.locator('.bk-ref-feature').getByRole('button',{name:'Continue reading'}).click();
   await page.getByRole('button',{name:'Mark chapter as read',exact:true}).click();
   await page.locator('.bk-bar').getByRole('button',{name:'Books',exact:true}).click();
   assert.match(await page.locator('.bk-ref-progress').innerText(),/1 read · 1 remaining/);
   assert.match(await page.locator('.bk-milestones').innerText(),/First chapter/);
   await page.reload();
   await page.getByRole('heading',{name:'Reading library'}).waitFor();
   assert.match(await page.locator('.bk-ref-progress').innerText(),/1 read · 1 remaining/);
   await page.evaluate(()=>window.PsychDeskCore.useStorageKey('psychdesk-user-test-bob'));
   assert.match(await page.locator('.bk-ref-progress').innerText(),/0 read · 2 remaining/);
   await page.evaluate(()=>window.PsychDeskCore.useStorageKey('psychdesk-v1'));
   assert.match(await page.locator('.bk-ref-progress').innerText(),/1 read · 1 remaining/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=3),'layout overflow');
   assert.deepEqual(errors,[],'runtime errors');
   await context.close();
  }
  console.log('PHASE11_BROWSER_PASS read vs visit, achievements, refresh and local account isolation');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
