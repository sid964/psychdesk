const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true});try{
for(const width of [320,390,768,1440])for(const theme of ['dark','light']){
 const p=await b.newPage({viewport:{width,height:900},reducedMotion:'reduce'});await p.goto('http://127.0.0.1:8765/');await p.waitForSelector('.study-home');await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);await p.locator('.desk-write').click();
 assert.equal(await p.evaluate(()=>document.activeElement.name),'body');assert.equal(await p.locator('.notebook-details').getAttribute('open'),null);
 await p.locator('#noteForm [name="body"]').fill('A small thought from class.\nReliability is consistency.');await p.keyboard.press('Escape');
 let notes=await p.evaluate(()=>PsychDeskCore.getData().notes);assert.equal(notes.length,1);assert.match(notes[0].title,/A small thought/);
 await p.evaluate(()=>PsychDeskCore.setTab('notes'));await p.locator('.note-card').first().click();await p.locator('.notebook-details summary').click();await p.locator('#noteForm [name="title"]').fill('My own page title');await p.locator('#noteForm [name="tags"]').fill('lecture, memory');await p.locator('#noteForm [name="subjectId"]').selectOption({index:1});await p.locator('#noteForm button[type="submit"]').click();
 const previous=await p.evaluate(()=>PsychDeskCore.getData().notes[0]);await p.locator('.note-card').first().click();assert.equal(await p.locator('.notebook-details').getAttribute('open'),null);await p.locator('#noteForm [name="body"]').fill('Updated, without filling in a form.');
 await p.screenshot({path:'/tmp/notebook-writing-'+theme+'-'+width+'.png',fullPage:false});
 await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});await p.waitForTimeout(600);const violations=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);
 await p.keyboard.press('Escape');await p.reload();await p.waitForSelector('.study-home');notes=await p.evaluate(()=>PsychDeskCore.getData().notes);assert.equal(notes.length,1);assert.equal(notes[0].body,'Updated, without filling in a form.');assert.equal(notes[0].title,previous.title);assert.equal(notes[0].tags,previous.tags);assert.equal(notes[0].subjectId,previous.subjectId);console.log('PASS notebook',width,theme,'focus, optional details, close-save, metadata, reload and accessibility');await p.close();
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
