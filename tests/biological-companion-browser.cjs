'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.PSYCHDESK_TEST_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [1024,1280,1600]){
   const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
   const page=await ctx.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(base+'/biological-psychology-14e.html',{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('.chapter-card').first.waitFor({timeout:60000});
   assert.equal(await page.locator('.chapter-card').count(),14);
   assert.equal(await page.locator('#studySidebarToggle').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.evaluate(()=>location.hash='read=bp14-m12-1');
   await page.locator('.classroom-topic').first.waitFor();
   assert.equal(await page.locator('.classroom-topic').count(),11);
   assert.equal(await page.locator('#studySidebar').isVisible(),width>=1040);
   const btn=page.locator('#topbar [data-open=contents]');
   await btn.click();
   if(width>=1040){
    assert.equal(await page.locator('#studySidebar').isVisible(),false);
    assert.equal(await btn.getAttribute('aria-expanded'),'false');
    await btn.click();assert.equal(await page.locator('#studySidebar').isVisible(),true);
   }else{
    assert.equal(await page.locator('#drawer').isVisible(),true);await page.keyboard.press('Escape');
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(errors,[]);
   await ctx.close();
  }
  console.log('BIOLOGICAL_COMPANION_LAYOUT_SMOKE_OK');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
