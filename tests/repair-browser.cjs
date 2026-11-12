/* Isolated guest data only: responsive persistence and offline document routing. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const dir=path.join(process.cwd(),'browser-audit-artifacts','repair');fs.mkdirSync(dir,{recursive:true});
 const results=[];
 try{
  for(const [width,height] of [[360,800],[412,915],[768,1024],[1366,768],[1920,1080]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<768,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    await page.locator('#psychWorldLaunch').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'home overflow '+width);
    await page.evaluate(()=>PsychDeskCore.setTab('tools'));
    await page.locator('.studio-jumps a[href="#studio-tool-group-3"]').click();
    assert.equal(await page.locator('.tool-group').count(),5,'section jump must stay in Tools');
    await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('.tool-group').count(),5,'skip link must stay in Tools');
    await page.locator('#quickNoteBtn').click();await page.locator('#quickNoteText').fill('Repair regression note '+width);
    await page.locator('[data-quick="note"]').click();
    await page.evaluate(()=>PsychDeskCore.setTab('recall'));
    await page.locator('[data-action="newCard"]').click();
    await page.locator('#cardForm [name="question"]').fill('Question '+width);
    await page.locator('#cardForm [name="answer"]').fill('Answer '+width);
    await page.locator('#cardForm [type="submit"]').click();
    await page.locator('[data-action="flip"]').click();
    await page.locator('[data-action="rate"][data-rating="good"]').click();
    await page.locator('#themeToggle').click();
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.PsychDeskCore);
    const state=await page.evaluate(()=>({data:PsychDeskCore.getData(),theme:document.documentElement.dataset.theme}));
    assert.equal(state.data.notes[0].body,'Repair regression note '+width);
    assert.equal(state.data.cards[0].question,'Question '+width);assert.equal(state.data.reviews.length,1);
    assert.equal(state.theme,'light');
    await page.evaluate(()=>PsychDeskCore.setTab('notes'));
    await page.locator('.note-card').first().click();
    await page.locator('#noteForm [name="body"]').fill('Immediate close preserves writing '+width);
    await page.locator('#modalRoot .close').click();
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.PsychDeskCore);
    assert.equal(await page.evaluate(()=>PsychDeskCore.getData().notes[0].body),'Immediate close preserves writing '+width);
    await page.evaluate(()=>PsychDeskCore.setTab('today'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'return home overflow '+width);
    await page.screenshot({path:path.join(dir,'home-'+width+'.png'),animations:'disabled'});
    assert.deepEqual(errors,[],'uncaught page errors '+width);
    results.push({width,height,touch:width<768,notes:true,closeSave:true,recall:true,themeReload:true,errors});
   }finally{await context.close()}
  }
  const context=await browser.newContext(),page=await context.newPage();
  try{
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>navigator.serviceWorker.ready);
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   await context.setOffline(true);
   await page.goto('http://127.0.0.1:8765/world/index.html',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('.world-places [data-visit]').count(),6);
   assert.equal(await page.locator('#main').count(),0,'offline World must not contain the app shell');
   await page.locator('.world-places [data-visit="notes"]').click();
   await page.waitForFunction(()=>location.hash==='#pd-notes'&&!!window.PsychDeskCore);
   assert.match(await page.locator('#main').textContent(),/note/i);
   await context.setOffline(false);await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.PsychDeskCore);
   results.push({offlineWorld:true,offlineMain:true,reconnect:true});
  }finally{await context.close()}
 }finally{await browser.close();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2))}
 console.log('REPAIR_BROWSER_PASS',JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1});
