/* Minimal end-to-end integration smoke. Run after local http.server and playwright install. */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#psychWorldLaunch',{timeout:18000});
  await page.evaluate(()=>{
   const core=window.PsychDeskCore;
   const original=core.setTab.bind(core);
   core.setTab=tab=>{window.__worldNav=tab;return original(tab);};
  });
  await page.locator('#psychWorldLaunch').click();
  await page.waitForSelector('#psychWorldOverlay iframe');
  const world=page.frameLocator('#psychWorldOverlay iframe');
  await world.locator('.world-places [data-visit="notes"]').waitFor({timeout:18000});
  // A renderer is best-effort under software-GPU test runners; navigation never depends on it.
  const state=await page.locator('#psychWorldOverlay iframe').evaluate(frame=>{
   const doc=frame.contentDocument;
   return {canvas:!!doc.querySelector('#worldCanvas canvas'),fallback:!!doc.querySelector('#worldMessage')?.textContent};
  });
  console.log('World renderer initialized:',state.canvas,'Fallback message:',state.fallback);
  await world.locator('.world-places [data-visit="notes"]').click();
  await page.waitForFunction(()=>window.__worldNav==='notes',{timeout:6000});
  assert.equal(await page.locator('#psychWorldOverlay').count(),0);
  await page.locator('[data-tab="today"]:visible').first().click();
  await page.locator('#psychWorldLaunch').click();
  const world2=page.frameLocator('#psychWorldOverlay iframe');
  await world2.locator('.world-places [data-visit="garden"]').click();
  await page.waitForFunction(()=>document.querySelector('#modalRoot')?.textContent?.toLowerCase().includes('memory garden'),{timeout:7000});
  assert.equal(await page.locator('#psychWorldOverlay').count(),0);
  console.log('World navigation and Memory Garden integration passed');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
