'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader-webgl']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('#psychWorldLaunch').waitFor({timeout:18000});
  await page.locator('#psychWorldLaunch').click();
  await page.locator('#psychWorldOverlay iframe').waitFor();
  assert.equal(new URL(page.url()).hash,'#pd-world');
  let world=page.frameLocator('#psychWorldOverlay iframe');
  await world.locator('.world-places [data-visit="recall"]').waitFor({timeout:18000});
  const hasCanvas=await world.locator('#worldCanvas canvas').waitFor({state:'attached',timeout:18000})
   .then(()=>true).catch(()=>false);
  console.log('Natural world WebGL canvas:',hasCanvas);
  console.log('World fallback:',await world.locator('#worldMessage').textContent());
  if(!hasCanvas){
   throw new Error('Natural 3D scene failed to initialize: '+(await world.locator('#worldMessage').textContent()));
  }
  await page.waitForFunction(()=>document.querySelector('#psychWorldOverlay iframe')?.contentDocument?.getElementById('worldStatus')?.textContent?.startsWith('Living landscape'),{timeout:15000});
  assert.equal(await world.locator('#worldMessage').textContent(),'','3D scene reported a rendering error');
  const dir=path.join(process.cwd(),'browser-audit-artifacts','world');
  fs.mkdirSync(dir,{recursive:true});
  await page.waitForTimeout(1800);
  await page.screenshot({path:path.join(dir,'living-world-desktop.png'),animations:'disabled'});
  const subtitle=await world.locator('#worldStatus').textContent();
  console.log('World status:',subtitle);
  await world.locator('.world-places [data-visit="recall"]').click();
  await page.waitForFunction(()=>location.hash==='#pd-recall'&&
   document.querySelector('#main h1')?.textContent?.includes('Recall'),{timeout:10000});
  assert.equal(await page.locator('#psychWorldOverlay').count(),0);
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>location.hash==='#pd-world'&&document.querySelector('#psychWorldOverlay iframe'),{timeout:10000});
  console.log('Back from Recall restores the World');
  await page.goForward({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>location.hash==='#pd-recall'&&document.querySelector('#main h1')?.textContent?.includes('Recall'),{timeout:10000});
  console.log('Forward restores Recall');
  await page.locator('[data-tab="today"]:visible').first().click();
  await page.locator('#psychWorldLaunch').click();
  assert.equal(new URL(page.url()).hash,'#pd-world');
  await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>location.hash==='#pd-today'&&!document.querySelector('#psychWorldOverlay'),{timeout:10000});
  console.log('Back directly from open World closes World without leaving PsychDesk');
  await page.goto('http://127.0.0.1:8765/#pd-dictionary',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#main h1')?.textContent?.includes('Dictionary'),{timeout:12000});
  console.log('Direct study deep-link restores Dictionary');
  // Scene initialization above is real WebGL. The remaining checks exercise
  // the supported graphics-unavailable navigation path, avoiding six redundant
  // software-GPU scene rebuilds in a lightweight CI smoke run.
  await page.route('**/world/world.js?*',route=>route.abort());

  // Every World destination retains the World as its actual predecessor.
  for(const destination of ['notes','materials','garden','dictionary','focus']){
   await page.evaluate(()=>window.PsychDeskWorldNavigation.openWorld());
   await page.frameLocator('#psychWorldOverlay iframe').locator('.world-places [data-visit="'+destination+'"]').click();
   await page.waitForFunction(tab=>location.hash==='#pd-'+tab,destination);
   await page.goBack();
   await page.locator('#psychWorldOverlay iframe').waitFor();
   assert.equal(new URL(page.url()).hash,'#pd-world');
   if(destination==='notes'){
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#psychWorldOverlay iframe').waitFor();
   }
   await page.goForward();
   await page.waitForFunction(tab=>location.hash==='#pd-'+tab,destination);
   assert.equal(await page.locator('#psychWorldOverlay').count(),0);
   await page.evaluate(()=>{window.PsychDeskCore.closeModal();window.PsychDeskCore.setTab('today');});
  }
  const direct=await browser.newPage();
  await direct.goto('http://127.0.0.1:8765/#pd-world',{waitUntil:'domcontentloaded'});
  await direct.locator('#psychWorldOverlay .psychworld-exit').click();
  await direct.waitForFunction(()=>location.hash==='#pd-today'&&!document.querySelector('#psychWorldOverlay'));
  await direct.close();
  console.log('All six destinations, reload, direct close and Forward verified');

  assert.equal(errors.length,0,'Page errors: '+errors.join(' | '));
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});