const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const artifacts=process.env.PREP_ARTIFACTS||'/tmp/psychdesk-preparation';
fs.mkdirSync(artifacts,{recursive:true});
(async()=>{const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true});try{
for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
 await page.goto('http://127.0.0.1:8765/');await page.waitForSelector('#main .hero');
 await page.evaluate(()=>window.PsychDeskCore.setTab('university'));
 assert.equal(await page.locator('.prep-syllabus details').count(),5);
 assert(await page.evaluate(()=>document.querySelector('.prep-grid').getBoundingClientRect().top<document.querySelector('.prep-syllabus').getBoundingClientRect().top));
 assert.equal(await page.locator('.prep-support a[href^="https://www.learningscientists.org/blog/"]').count(),3);
 assert.equal(await page.locator('.prep-unit').count(),20);
 await page.locator('.prep-syllabus summary').first().click();
 await page.locator('[data-action="addSyllabusTopic"]').first().click();
 assert.equal(await page.evaluate(()=>window.PsychDeskCore.getData().tasks.filter(t=>t.id==='syllabus-PSY-MJ-101-0-0').length),1);
 await page.reload();await page.waitForSelector('#main .hero');
 await page.evaluate(()=>window.PsychDeskCore.setTab('university'));
 assert.equal(await page.locator('[data-id="syllabus-PSY-MJ-101-0-0"]').count(),3);
 await page.locator('.prep-syllabus summary').first().click();
 await page.locator('.prep-syllabus [data-id="syllabus-PSY-MJ-101-0-0"]').click();
 await page.locator('#taskForm [name="due"]').fill('2026-12-01');await page.locator('#taskForm button[type="submit"]').click();
 await page.locator('[data-action="toggleTask"][data-id="syllabus-PSY-MJ-101-0-0"]').click();
 assert.equal(await page.evaluate(()=>window.PsychDeskCore.getData().tasks.find(t=>t.id==='syllabus-PSY-MJ-101-0-0').done),true);
 await page.locator('.prep-syllabus summary').first().click();
 await page.screenshot({path:path.join(artifacts,`prep-${width}.png`),fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>window.PsychDeskCore.setTab('psychology'));
 assert.equal(await page.locator('.prep-syllabus').count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS',width,'syllabus, add, reload, schedule, completion and both layouts');await context.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
