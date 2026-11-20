/* Phase 4: existing tools remain reachable through grouped workspaces without moving data. */
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
   await page.waitForFunction(()=>!!window.PsychDeskCore&&!!window.PsychDeskCloud);
   const initial=await page.evaluate(()=>JSON.stringify(PsychDeskCore.getData()));
   for(const [start,expected,navName] of [
    ['notes',['notes','ink','stickies','voice'],'Notes workspace navigation'],
    ['materials',['materials','files','reader','research'],'Library workspace navigation'],
    ['mindmap',['mindmap','board','connections'],'Visual thinking workspace navigation']
   ]){
    await page.evaluate(tab=>PsychDeskCore.setTab(tab),start);
    const nav=page.locator('#main .study-workspace-nav');
    assert.equal(await nav.count(),1,'missing grouped navigation for '+start);
    assert.equal(await nav.getAttribute('aria-label'),navName);
    assert.deepEqual(await nav.locator('.study-workspace-tab').evaluateAll(items=>items.map(el=>el.dataset.tab)),expected);
    assert.equal(await nav.locator('[aria-current="page"]').getAttribute('data-tab'),start);
    for(const to of expected){
     await page.locator('#main .study-workspace-tab[data-tab="'+to+'"]').click();
     assert.equal(await page.locator('#main').getAttribute('data-study-layout'),to);
     assert.equal(await page.locator('#main .study-workspace-nav [aria-current="page"]').getAttribute('data-tab'),to);
     assert.equal(await page.locator('#main h1').count()>0,true,'tool heading '+to);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'overflow '+to+' at '+width);
    }
   }
   await page.evaluate(()=>PsychDeskCore.setTab('tools'));
   assert.equal(await page.locator('#main .study-tools-more').evaluate(el=>el.open),false,'advanced tools should begin collapsed');
   assert.equal(await page.locator('#main .tool-group').count(),5,'all five tool groups preserved');
   for(const route of ['ink','stickies','voice','reader','research','board','mindmap','connections','dictionary','timeline','insights','university'])
    assert.equal(await page.locator('#main .study-tool-launcher[data-tab="'+route+'"]').count(),1,'tool '+route+' must still exist');
   await page.locator('#main .study-tools-more > summary').click();
   await page.locator('#main .study-tool-launcher[data-tab="stickies"]').click();
   assert.equal(await page.locator('#main').getAttribute('data-study-layout'),'stickies');
   assert.equal(await page.locator('#main .study-workspace-nav [aria-current="page"]').getAttribute('data-tab'),'stickies');
   assert.equal(await page.evaluate(()=>JSON.stringify(PsychDeskCore.getData())),initial,'opening workspaces must not mutate saved data');
   assert.deepEqual(errors,[],'uncaught errors at '+width);
   await page.close();
  }
  console.log('PHASE4_BROWSER_PASS grouped Notes, Library and Visual Thinking, optional tools, no saved-data mutations');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
