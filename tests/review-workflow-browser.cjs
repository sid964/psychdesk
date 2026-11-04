/* Local browser regression for subject review, focus, and planner hierarchy. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:8765/');await page.waitForSelector('#main .hero, #main .studio-home-v2');
  await page.locator('.bottom-nav [data-tab="tools"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H1');
  await page.evaluate(()=>{
   const core=window.PsychDeskCore;
   core.commitChange(d=>{
    d.subjects.push({id:'review-a',name:'Review A',color:'#47796f'},{id:'review-b',name:'Review B',color:'#47796f'});
    d.cards.push({id:'a',subjectId:'review-a',question:'Question A',answer:'Answer A',due:core.today()}, {id:'b',subjectId:'review-b',question:'Question B',answer:'Answer B',due:core.today()});
   });core.setTab('recall');
  });
  await page.selectOption('#recallSubjectFilter','review-a');
  assert.equal(await page.locator('.review-q').textContent(),'Question A');
  assert.equal(await page.locator('.answer').count(),0);
  assert.equal(await page.locator('[data-action="editCard"]').count(),1);
  await page.locator('[data-action="flip"]').click();
  assert.equal(await page.locator('.answer').textContent(),'ANSWERAnswer A');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'rate');
  await page.locator('[data-action="rate"][data-rating="good"]').click();
  assert.equal(await page.locator('.review-q').count(),0);
  assert.equal(await page.evaluate(()=>PsychDeskCore.getData().cards.find(c=>c.id==='b').reps||0),0);
  await page.selectOption('#recallSubjectFilter','review-b');
  assert.equal(await page.locator('.review-q').textContent(),'Question B');
  assert.equal(await page.locator('.answer').count(),0);
  await page.locator('[data-action="newCard"]').click();
  assert.equal(await page.locator('#cardForm [name="subjectId"]').inputValue(),'review-b');
  await page.locator('[data-action="closeModal"]').click();
  await page.evaluate(()=>PsychDeskCore.setTab('planner'));
  assert(await page.evaluate(()=>document.querySelector('[data-action="newTask"]').getBoundingClientRect().top<document.querySelector('.subject-grid').getBoundingClientRect().top));
  await page.locator('[data-action="filterTask"][data-value="done"]').click();
  assert.equal(await page.locator('[data-action="filterTask"][data-value="done"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),'done');
  console.log('PASS: subject isolation, review scheduling, answer reset, keyboard focus and planner hierarchy');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
