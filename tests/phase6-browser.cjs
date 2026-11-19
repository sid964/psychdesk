/* Phase 6: broad guest-only layout, keyboard, route and rendering baseline.
 * Timing is reported, not used as a flaky hard threshold on a shared CI GPU.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const routes=['today','psychology','university','psychopathology','notes','ink','stickies','voice','materials','reader','research','recall','focus','planner','board','mindmap','connections','dictionary','timeline','tools'];
const out=path.join(process.cwd(),'browser-audit-artifacts','phase6');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const measurements=[];
 try{
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.PsychDeskCore&&!!document.querySelector('#main .garden-home'),null,{timeout:15000});
   assert.equal(await page.locator('#settingsBtn').getAttribute('aria-label'),'Settings and backup');
   for(const id of ['quickNoteBtn','themeToggle','accountBtn','driveStatusChip','settingsBtn']){
    const name=await page.locator('#'+id).getAttribute('aria-label');
    assert.ok(name&&name.trim().length>3,'unlabeled essential control '+id);
   }
   await page.locator('#settingsBtn').focus();
   assert.equal(await page.evaluate(()=>document.activeElement?.id),'settingsBtn','Settings remains keyboard focusable');
   await page.locator('.skip-link').focus();
   await page.keyboard.press('Enter');
   const before=await page.evaluate(()=>JSON.stringify(PsychDeskCore.getData()));
   let maxOverflow=0;
   for(const tab of routes){
    await page.evaluate(route=>PsychDeskCore.setTab(route),tab);
    assert.equal(await page.locator('#main').getAttribute('data-study-layout'),tab,'unexpected layout route '+tab);
    assert.ok((await page.locator('#main').innerText()).trim().length>12,'empty study surface '+tab);
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
    maxOverflow=Math.max(overflow,maxOverflow);
    assert.ok(overflow<=3,'horizontal overflow '+overflow+'px at '+tab+' / '+width+'px');
    if(['today','psychology','notes','materials','focus'].includes(tab)){
     const primary=width>=900?'.rail-nav > button.rail-link':'.bottom-nav > button.nav-item';
     const active=await page.locator(primary+'[aria-current="page"]').evaluateAll(items=>items.map(item=>item.dataset.tab));
     assert.deepEqual(active,[tab],'selected navigation must announce current page '+tab);
    }
   }
   assert.equal(await page.evaluate(()=>JSON.stringify(PsychDeskCore.getData())),before,'opening study routes must not mutate records');
   await page.evaluate(()=>PsychDeskCore.setTab('today'));
   if(width===390||width===1440){
    await page.screenshot({path:path.join(out,'home-'+width+'.png'),animations:'disabled'});
    await page.evaluate(()=>PsychDeskCore.setTab('psychopathology'));
    await page.screenshot({path:path.join(out,'learning-'+width+'.png'),animations:'disabled'});
   }
   assert.deepEqual(errors,[],'uncaught JavaScript errors at '+width+'px');
   const metrics=await page.evaluate(()=>{
    const navigation=performance.getEntriesByType('navigation')[0],paint=performance.getEntriesByType('paint');
    return {
     domContentLoadedMs:Math.round(navigation?.domContentLoadedEventEnd||0),
     firstContentfulPaintMs:Math.round(paint.find(p=>p.name==='first-contentful-paint')?.startTime||0),
     loadedStylesheets:document.querySelectorAll('link[rel="stylesheet"]').length,
     loadedScripts:document.querySelectorAll('script[src]').length
    };
   });
   measurements.push({width,routesChecked:routes.length,maxHorizontalOverflowPx:maxOverflow,...metrics});
   await page.close();
  }
  fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify({note:'Guest-only CI environment. Performance numbers are diagnostic, not measurements on physical hardware.',measurements},null,2));
  console.log('PHASE6_BROWSER_PASS '+JSON.stringify(measurements));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
