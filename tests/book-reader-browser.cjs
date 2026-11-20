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
  await page.getByRole('heading',{name:'Books',exact:true}).waitFor();
  await page.getByRole('combobox',{name:'Browse by subject'}).selectOption('Research Methods');
  assert.equal(await page.locator('.bk-cover').count(),1);
  await page.getByRole('combobox',{name:'Browse by subject'}).selectOption('');
  await page.locator('.bk-cover[data-book-id="sample-cognition"]').click();
  await page.getByRole('heading',{name:'Part 1',exact:true}).waitFor();
  await page.getByRole('button',{name:'Next',exact:true}).click();
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
