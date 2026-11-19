/* Phase 2: real rendered navigation and no unintended study-data writes. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [360,412,1366]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#main .garden-home .home-archive');
   const nav=width>=900?'.rail-nav > button.rail-link':'.bottom-nav > button.nav-item';
   assert.deepEqual(await page.locator(nav).evaluateAll(items=>items.map(el=>el.dataset.tab)),['today','psychology','notes','materials','focus']);
   assert.equal(await page.locator('.home-archive').evaluate(el=>el.open),false,'secondary home details start collapsed');
   for(const sel of ['.garden-home .garden-entry','.garden-home .home-shortcuts [data-tab="tools"]','#psychWorldLaunch'])
    assert.equal(await page.locator(sel).count(),1,'missing '+sel);
   for(const sel of ['.study-flow-entry','.studio-study-paths','.garden-tool-drawer'])
    assert.equal(await page.locator('#main '+sel).count(),0,'duplicate home section '+sel);
   await page.locator('.home-archive > summary').click();
   assert.equal(await page.locator('#main #studio-discovery').isVisible(),true);
   assert.equal(await page.locator('#main .garden-notebook').isVisible(),true);
   const original=await page.evaluate(()=>JSON.stringify(PsychDeskCore.getData()));
   await page.locator(nav+'[data-tab="psychology"]').click();
   assert.match(await page.locator('#main h1').first().textContent(),/psychology/i);
   await page.evaluate(()=>PsychDeskCore.setTab('university'));
   assert.equal(await page.locator(nav+'[data-tab="psychology"]').getAttribute('aria-current'),'page','university belongs to Learn');
   await page.evaluate(()=>PsychDeskCore.setTab('ink'));
   assert.equal(await page.locator(nav+'[data-tab="notes"]').getAttribute('aria-current'),'page','handwriting belongs to Notes');
   await page.evaluate(()=>PsychDeskCore.setTab('reader'));
   assert.equal(await page.locator(nav+'[data-tab="materials"]').getAttribute('aria-current'),'page','reader belongs to Library');
   await page.locator(nav+'[data-tab="today"]').click();
   await page.locator('.home-shortcuts [data-tab="tools"]').click();
   assert.match(await page.locator('#main h1').first().textContent(),/study tools/i);
   assert.equal(await page.locator('#main .study-tool-launcher[data-tab="stickies"]').count(),1);
   if(width>=900){
    await page.locator('.rail-more > summary').click();
    await page.locator('.rail-more [data-tab="planner"]').click();
    assert.match(await page.locator('#main h1').first().textContent(),/planner/i);
   }
   assert.equal(await page.evaluate(()=>JSON.stringify(PsychDeskCore.getData())),original,'navigation must not modify study data');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'horizontal overflow at '+width);
   assert.deepEqual(errors,[],'unhandled errors at '+width);
   await page.close();
  }
  console.log('PHASE2_BROWSER_PASS navigation, home disclosure, tool access, data invariance');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
