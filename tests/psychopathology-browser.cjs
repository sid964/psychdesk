/* Browser smoke for interactive textbook course.
 * npm i --no-save playwright; python3 -m http.server 8765
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const screenshots=path.join(process.cwd(),'browser-audit-artifacts','psychopathology');
fs.mkdirSync(screenshots,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-tab="tools"]:visible').first().click();
  assert.equal(await page.locator('.study-tool-launcher[data-tab="psychopathology"]').count(),0,'Psychopathology must not be a top-level Explore tool');
  await page.locator('.study-tool-launcher[data-tab="psychology"]').click();
  await page.locator('.psychology-subject-card[data-tab="psychopathology"]').click();
  await page.waitForSelector('#psyGraphDetail');assert.equal(await page.locator('.psycourse-lesson-item').count(),6);await page.locator('#psyGraphPanel > summary').click();await page.waitForSelector('#psyGraph .psycourse-node',{timeout:12000});
  assert.equal(await page.locator('.psycourse-count strong').textContent(),'16');
  assert.ok((await page.locator('#psyGraph .psycourse-node').count())>=24);
  assert.match(await page.locator('#psyGraphDetail').textContent(),/What Is a Psychological Disorder/);
  await page.screenshot({path:path.join(screenshots,'course-desktop.png'),animations:'disabled'});
  await page.locator('.psycourse-outline > summary').click();for(const [number,start] of [[1,2],[2,30],[3,72],[4,102],[5,124],[6,180],[7,210],[8,266],[9,318],[10,356],[11,400],[12,444],[13,480],[14,516],[15,548],[16,574]]){
   await page.locator('.psycourse-chapter-list [data-psy-node="ch'+number+'"]').click();
   assert.ok((await page.locator('#psyGraphDetail').textContent()).includes('Starts on page '+start+'.'),'chapter '+number+' source page');
  }
  // Search results select the chapter-linked concepts and open their explanation.
  await page.locator('#psyGraphSearch').fill('dysfunction');
  await page.locator('#psyGraphResults [data-psy-node="t-dysfunction"]').click();
  assert.match(await page.locator('#psyGraphDetail').textContent(),/disruption in cognitive/);
  // Local Graph must show fewer nodes than Global Graph for a selected concept.
  await page.locator('#psyGraphSearch').fill('');
  const global=await page.locator('#psyGraph .psycourse-node').count();
  await page.locator('#psyGraphMode').click();
  const local=await page.locator('#psyGraph .psycourse-node').count();
  assert.ok(local<global,'local graph should narrow connections');
  await page.locator('#psyGraphMode').click();
  await page.locator('#psyGraphChapter').selectOption('1');
  assert.ok((await page.locator('#psyGraph .psycourse-node').count())<global);
  await page.locator('#psyGraphChapter').selectOption('all');
  await page.locator('#psyGraphResults').count();
  await page.locator('#psyGraphSearch').fill('What Is a Psychological Disorder?');
  await page.locator('#psyGraphResults [data-psy-node="t-definition"]').click();
  await page.locator('#psyGraphSearch').fill('');
  await page.locator('.psycourse-detail summary').first().click();
  assert.match(await page.locator('#psyGraphDetail').textContent(),/diagnostic prototypes/);
  await page.locator('[data-psy-answer="1"]').click();
  assert.match(await page.locator('#psyQuizFeedback').textContent(),/Correct/);
  await page.locator('[data-psy-action="complete"]').click();
  assert.match(await page.locator('[data-psy-action="complete"]').textContent(),/Completed/);
  await page.locator('[data-psy-action="flashcard"]').click();
  const cards=await page.evaluate(()=>window.PsychDeskCore.getData().cards.filter(c=>c.id==='psycourse-card-definition'));
  assert.equal(cards.length,1);
  // Breadcrumb returns to the parent subject list, without deleting progress.
  await page.locator('.psycourse-breadcrumb [data-tab="psychology"]').click();
  await page.waitForSelector('.psychology-subject-card[data-tab="psychopathology"]');
  assert.equal(await page.locator('#psyCourse').count(),0);
  await page.locator('.psychology-subject-card[data-tab="psychopathology"]').click();
  assert.match(await page.locator('.psycourse-progress').textContent(),/1 of 6/);
    // Zoom, reset and navigation return to legacy routes.
  await page.locator('#psyGraphPanel > summary').click();
  const prior=await page.locator('#psyGraph > g').getAttribute('transform');
  await page.locator('[data-psy-action="zoomIn"]').click();
  assert.notEqual(await page.locator('#psyGraph > g').getAttribute('transform'),prior);
  await page.locator('[data-psy-action="fit"]').click();
  assert.equal(await page.locator('#psyGraph > g').getAttribute('transform'),'translate(0 0) scale(1)');
  await page.locator('[data-tab="notes"]:visible').first().click();
  await page.waitForFunction(()=>!document.querySelector('#psyCourse'));
  // Mobile access via Explore without exposing sideways page overflow.
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-tab="tools"]:visible').first().click();
  await page.locator('.study-tool-launcher[data-tab="psychology"]').click();
  await page.locator('.psychology-subject-card[data-tab="psychopathology"]').click();
  await page.locator('#psyGraphPanel > summary').click();await page.waitForSelector('#psyGraph .psycourse-node');
  const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(mobileOverflow<=3,'mobile course should not create horizontal page overflow: '+mobileOverflow);
  await page.screenshot({path:path.join(screenshots,'course-mobile.png'),animations:'disabled',fullPage:true});
  console.log('Psychopathology graph desktop and mobile smoke passed');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
