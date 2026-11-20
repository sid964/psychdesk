const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.PSYCHDESK_TEST_URL||'http://127.0.0.1:8765';

function sample(id,subject){
 return {id,title:id,subject,author:'Sample Author',edition:'Test edition',chapters:[{
  id:'first',title:'First chapter',sections:[1,2].map(number=>({
   id:'part-'+number,title:'Part '+number,blocks:[{
    id:'opening',type:'paragraph',text:'This short sample only tests navigation and storage.'
   }]
  }))
 }]};
}
async function verify(browser,width){
 const context=await browser.newContext({viewport:{width,height:820},serviceWorkers:'block'});
 const page=await context.newPage();
 const fixture=[sample('sample-cognition','Cognitive Psychology'),sample('sample-methods','Research Methods')];
 await page.route('**/book-catalog.js?*',route=>route.fulfill({
  contentType:'application/javascript',body:'window.PsychDeskBookCatalog = '+JSON.stringify(fixture)+';'
 }));
 try{
  await page.goto(base+'/index.html#books');
  await page.getByRole('heading',{name:'My library',exact:true}).waitFor();
  assert.equal(await page.locator('.bk-hero-stats').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','fresh PsychDesk starts in AMOLED mode');
  assert.equal(await page.locator('.bk-hero').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(8, 8, 8)','Library hero uses neutral black, not brown');
  if(width>=900)assert.ok(await page.locator('.bk-hero').evaluate(el=>el.getBoundingClientRect().height<340),'Library hero should not dominate the screen');
  await page.getByRole('searchbox',{name:'Search books'}).fill('not-on-shelf');
  assert.equal(await page.locator('.bk-cover').count(),0);
  await page.getByRole('searchbox',{name:'Search books'}).fill('');
  await page.getByRole('combobox',{name:'Browse by subject'}).selectOption('Research Methods');
  assert.equal(await page.locator('.bk-cover').count(),1);
  await page.getByRole('combobox',{name:'Browse by subject'}).selectOption('');
  await page.locator('.bk-cover[data-book-id="sample-cognition"]').click();
  await page.getByRole('heading',{name:'Part 1',exact:true}).waitFor();
  assert.equal(await page.locator('.bk-reader').getAttribute('data-bk-theme'),'auto','unsaved reader matches the app');
  assert.equal(await page.locator('.bk-page').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)','AMOLED reader should be true black');
  await page.locator('.bk-bar').getByRole('button',{name:'Reading appearance'}).click();
  await page.locator('#bk-appearance [name="theme"]').selectOption('white');
  await page.getByRole('button',{name:'Apply',exact:true}).click();
  assert.equal(await page.locator('.bk-page').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','explicit white choice is respected');
  await page.locator('.bk-bar').getByRole('button',{name:'Reading appearance'}).click();
  await page.locator('#bk-appearance [name="theme"]').selectOption('auto');
  await page.getByRole('button',{name:'Apply',exact:true}).click();
  assert.equal(await page.locator('.bk-page').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)','matching theme restores true black');
  await page.locator('#themeToggle').click();
  assert.equal(await page.locator('.bk-page').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','automatic theme follows switch to PsychDesk light mode');
  await page.locator('#themeToggle').click();
  assert.equal(await page.locator('.bk-page').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)','automatic theme returns to AMOLED black');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Mark chapter as read',exact:true}).click();
  await page.getByText('Chapter 1 of 1 · Read').waitFor();
  await page.getByRole('button',{name:'Undo chapter completion',exact:true}).click();
  await page.getByText('Chapter 1 of 1 · In progress').waitFor();
  await page.getByRole('button',{name:'Bookmark',exact:true}).click();
  await page.locator('.bk-bar').getByRole('button',{name:'Books',exact:true}).click();
  await page.locator('.bk-cover[data-book-id="sample-methods"]').click();
  await page.getByRole('button',{name:'Bookmark',exact:true}).waitFor();
  await page.locator('.bk-bar').getByRole('button',{name:'Books',exact:true}).click();
  await page.locator('.bk-cover[data-book-id="sample-cognition"]').click();
  await page.getByRole('heading',{name:'Part 2',exact:true}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'Bookmarked',exact:true}).waitFor();
  await page.getByRole('button',{name:/Part 2 of 2/}).click();
  await page.getByRole('dialog',{name:'Go to a reading part'}).waitFor();
  await page.getByRole('slider',{name:'Reading part'}).press('Home');
  await page.getByRole('button',{name:'Go to part',exact:true}).click();
  await page.getByRole('heading',{name:'Part 1',exact:true}).waitFor();
  await page.goBack();
  await page.getByRole('heading',{name:'Part 2',exact:true}).waitFor();
  assert.ok(await page.locator('.bk-reader').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 }finally{await context.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1280])await verify(browser,width);
  console.log('Books browser smoke passed at phone and desktop widths.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
