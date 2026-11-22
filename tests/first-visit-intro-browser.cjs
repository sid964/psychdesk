'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 const page=await context.newPage();
 try{
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('.desktop-bookshelf').waitFor({timeout:20000});
  await page.locator('#psychdeskTourInvite').waitFor({timeout:10000});
  assert.match(await page.locator('#psychdeskTourInvite').innerText(),/Welcome to PsychDesk/);
  await page.locator('[data-tour-invite="start"]').click();
  await page.locator('#psychdeskTour.tour-panel-welcome').waitFor();
  assert.match(await page.locator('#tourTitle').innerText(),/A space to study psychology/);
  assert.equal(await page.locator('#tourShield').count(),1);
  assert.equal(await page.locator('#tourProgress').evaluate(el=>el.value),0);
  await page.locator('#tourNext').click();
  await page.locator('.desk-original-cover').waitFor();
  assert.match(await page.locator('#tourTitle').innerText(),/bookshelf/);
  await page.locator('#tourNext').click();
  await page.locator('.focus-room-intro').waitFor();
  assert.match(await page.locator('#tourTitle').innerText(),/One study session/);
  await page.locator('#tourBack').click();
  await page.locator('.desktop-bookshelf').waitFor();
  await page.locator('#tourNext').click();
  await page.locator('#tourNext').click();
  await page.locator('.desktop-tool-home').waitFor();
  assert.match(await page.locator('#tourTitle').innerText(),/Only the tools/);
  await page.locator('#tourNext').click();
  assert.equal(await page.locator('#accountBtn').isVisible(),true);
  assert.match(await page.locator('#tourTitle').innerText(),/Keep your work connected/);
  await page.locator('#tourNext').click();
  assert.match(await page.locator('#tourTitle').innerText(),/The desk is ready/);
  await page.locator('#tourNext').click();
  await page.locator('.desktop-bookshelf').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('psychdesk-tour-v1')),'done');
  assert.equal(await page.locator('#psychdeskTour').count(),0);
  await page.locator('#settingsBtn').click();
  await page.locator('[data-action="replayTour"]').click();
  await page.locator('#psychdeskTour.tour-panel-welcome').waitFor({timeout:8000});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#psychdeskTour').count(),0);
  console.log('FIRST_VISIT_INTRO_SMOKE_OK');
 }finally{
  await context.close();
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});