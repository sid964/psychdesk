/* User-provided 20 November screenshot: exact surface hierarchy, light palette, chapter grid.
 * These checks are visual-contract assertions; screenshots are saved as CI artifacts.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.PSYCHDESK_TEST_URL||'http://127.0.0.1:8765';
const dir=path.join(process.cwd(),'browser-audit-artifacts','library-reference');
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.PsychDeskCore&&!!window.PsychDeskBooks);
   await page.evaluate(()=>PsychDeskCore.setTab('materials'));
   await page.getByRole('heading',{name:'Reading library',exact:true}).waitFor();
   assert.equal(await page.locator('.bk-ref-feature').count(),1,'featured book missing');
   assert.equal(await page.locator('.bk-ref-cover').count(),1,'illustrated book cover missing');
   assert.equal(await page.locator('.bk-ref-chapter').count(),16,'original 16 chapter index missing');
   assert.match(await page.locator('.bk-ref-feature').innerText(),/Psychopathology/);
   assert.match(await page.locator('.bk-ref-section-heading').first().innerText(),/Chapters in this book/);
   const styles=await page.evaluate(()=>{
    const shell=document.querySelector('.bk-reference-library'),cards=[...document.querySelectorAll('.bk-ref-chapter')];
    const top=card=>Math.round(card.getBoundingClientRect().top);
    const computed=getComputedStyle(shell);
    return {bg:computed.backgroundColor,ink:computed.color,columns:cards.filter(card=>top(card)===top(cards[0])).length,
     overflow:document.documentElement.scrollWidth-innerWidth,mainBackground:getComputedStyle(document.querySelector('#main')).backgroundColor};
   });
   assert.equal(styles.bg,'rgb(243, 238, 228)','Library must use the screenshot cream background even in AMOLED mode');
   assert.equal(styles.ink,'rgb(40, 41, 31)','Typography must use warm black');
   assert.equal(styles.columns,width===1440?4:width===768?3:2,'incorrect chapter grid width at '+width);
   assert.ok(styles.overflow<=3,'horizontal overflow at '+width);
   if(width===1440||width===390){
    await page.screenshot({path:path.join(dir,'library-'+width+'.png'),fullPage:true,animations:'disabled'});
   }
   await page.locator('.bk-ref-chapter').first().click();
   await page.locator('.bk-reader').waitFor();
   await page.locator('.bk-bar').getByRole('button',{name:'Books',exact:true}).click();
   await page.getByRole('heading',{name:'Reading library',exact:true}).waitFor();
   await page.getByRole('button',{name:'Drive files'}).first().click();
   await page.getByRole('heading',{name:'Drive files.'}).waitFor();
   assert.deepEqual(errors,[],'runtime error at '+width);
   await page.close();
  }
  console.log('LIBRARY_REFERENCE_BROWSER_PASS responsive warm-paper featured book and original 16 chapter index');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
