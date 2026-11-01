/* Browser smoke audit for the real PsychDesk UI. Runs inside GitHub Actions with Chromium.
   Local origin exercises UI without touching anyone's live study data.
   Live mode captures read-only metrics and screenshots from GitHub Pages. */
'use strict';
const { chromium }=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const live=process.argv.includes('--live');
const origin=live?'https://sid964.github.io/psychdesk/':'http://127.0.0.1:8765/';
const viewports=[{width:320,height:700},{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}];
const dest=path.join(process.cwd(),'browser-audit-artifacts',live?'live':'local');
fs.mkdirSync(dest,{recursive:true});
const results=[];
async function inspect(page){
 return page.evaluate(()=>{
  const W=innerWidth;
  const intersections=[];
  const header=document.querySelector('.topbar');
  const buttons=[...header?.querySelectorAll('button')||[]].filter(b=>getComputedStyle(b).display!=='none');
  const boxes=buttons.map(b=>({id:b.id||b.className,rect:b.getBoundingClientRect()}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i].rect,b=boxes[j].rect;
   const w=Math.min(a.right,b.right)-Math.max(a.left,b.left);
   const h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
   if(w>3&&h>3)intersections.push([boxes[i].id,boxes[j].id,Math.round(w*h)]);
  }
  const offscreen=[...document.querySelectorAll('#main *, .topbar *, .bottom-nav *')].filter(el=>{
   const st=getComputedStyle(el),r=el.getBoundingClientRect();
   return st.display!=='none'&&st.visibility!=='hidden'&&r.width>20&&(r.left< -5||r.right>W+6);
  }).slice(0,12).map(el=>({tag:el.tagName,cls:String(el.className).slice(0,65),left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right)}));
  const rail=document.querySelector('.desktop-rail');
  const railStyle=rail?getComputedStyle(rail):null;
  return {width:W,overflow:document.documentElement.scrollWidth-W,
   rail:{overflowX:railStyle?.overflowX||'',width:rail?.clientWidth||0,scrollWidth:rail?.scrollWidth||0},
   headerOverlap:intersections,
   headerScroll:Math.round((header?.scrollWidth||0)-(header?.clientWidth||0)),
   offscreen,theme:document.documentElement.dataset.theme,
   loaded:Boolean(window.PsychDeskCore),heading:document.querySelector('#main h1')?.textContent?.trim()||''};
 });
}
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let fatal=false;
 try{
  for(const vp of viewports){
   const context=await browser.newContext({viewport:vp,deviceScaleFactor:1});
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message).slice(0,200)));
   try{
    await page.goto(origin,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForSelector('#main .hero',{timeout:16000});
    await page.waitForTimeout(500);
    const overview=await inspect(page);
    await page.screenshot({path:path.join(dest,'overview-'+vp.width+'.png'),fullPage:true,animations:'disabled'});
    const record={origin,viewport:vp.width,overview,errors};
    async function openTab(tab){
     let selector='[data-tab="'+tab+'"]:visible';
     if(!await page.locator(selector).count()){
      await page.locator('[data-tab="tools"]:visible').first().click();
     }
     await page.locator(selector).first().click();
    }
    if(!live){
     const navigation=[];
     for(const tab of ['planner','notes','ink','dictionary','research','timeline','tools']){
      await openTab(tab);
      await page.waitForTimeout(70);
      navigation.push({tab,heading:await page.locator('#main h1').first().textContent().catch(()=>''),visible:await page.locator('#main').isVisible()});
      if(['planner','notes','ink','dictionary','research'].includes(tab))await page.screenshot({path:path.join(dest,tab+'-'+vp.width+'.png'),fullPage:false,animations:'disabled'});
      if(tab==='planner'){
       const grid=await page.locator('.subject-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns);
       const watermark=await page.locator('.subject-card').first().evaluate(el=>getComputedStyle(el,'::after').display);
       record.planner={grid,watermark};
       if(vp.width<=390&&grid.split(' ').length!==1)fatal=true;
       if(watermark!=='none')fatal=true;
      }
     }
     record.navigation=navigation;
     if(vp.width===360){
      await openTab('notes');
      await page.locator('[data-cloud="newNote"]').first().click();
      await page.locator('#noteForm [name="body"]').fill('Browser audit draft should persist on close.');
      await page.locator('.modal-header .close').click();
      const copy=await page.evaluate(()=>window.PsychDeskCore.getData().notes);
      record.autosaveOnClose=copy.some(n=>n.body==='Browser audit draft should persist on close.');
      await page.locator('#themeToggle').click();
      await page.locator('#quickNoteBtn').click();
      record.quickNoteLight=await page.evaluate(()=>{
       const title=getComputedStyle(document.querySelector('.quick-capture-heading p')).color;
       const text=getComputedStyle(document.querySelector('#quickNoteText'));
       return {title,foreground:text.color,background:text.backgroundColor,visible:Boolean(document.querySelector('#quickNoteText'))};
      });
      await page.screenshot({path:path.join(dest,'quick-note-light-360.png'),animations:'disabled'});
      await page.locator('.modal-header .close').click();
      record.lightThemeContrastPass=record.quickNoteLight?.title!=='rgb(237, 237, 237)'&&
       record.quickNoteLight?.foreground!=='rgb(238, 238, 238)'&&record.quickNoteLight?.visible;
      if(!record.lightThemeContrastPass)fatal=true;
      // Exercise the new stylus workspace without signing in or uploading anything.
      await page.locator('#themeToggle').click();
      await openTab('ink');
      await page.locator('[data-ink="new"]').first().click();
      const inkCanvas=page.locator('#inkCanvas');
      await inkCanvas.scrollIntoViewIfNeeded();
      const bound=await inkCanvas.boundingBox();
      if(!bound)throw Error('Ink canvas is not visible.');
      const px=Math.max(12,bound.x+35),py=bound.y+35;
      await page.mouse.move(px,py);
      await page.mouse.down();
      await page.mouse.move(px+18,py+23,{steps:6});
      await page.mouse.move(px+30,py+35,{steps:5});
      await page.mouse.up();
      record.inkStrokeSaved=await page.evaluate(()=>window.PsychDeskCore.getData().inkNotes?.[0]?.strokes?.length===1);
      await page.locator('[data-ink="undo"]').click();
      record.inkUndo=await page.evaluate(()=>window.PsychDeskCore.getData().inkNotes?.[0]?.strokes?.length===0);
      await page.locator('[data-ink="redo"]').click();
      record.inkRedo=await page.evaluate(()=>window.PsychDeskCore.getData().inkNotes?.[0]?.strokes?.length===1);
      await page.locator('[data-ink="eraser"]').click();
      await page.locator('#inkCanvas').scrollIntoViewIfNeeded();
      const eraseBounds=await page.locator('#inkCanvas').boundingBox();
      await page.mouse.click(Math.max(12,eraseBounds.x+40),eraseBounds.y+42);
      record.inkErase=await page.evaluate(()=>window.PsychDeskCore.getData().inkNotes?.[0]?.strokes?.length===0);
      await page.locator('[data-ink="undo"]').click();
      record.inkUndoErase=await page.evaluate(()=>window.PsychDeskCore.getData().inkNotes?.[0]?.strokes?.length===1);
      if(!record.inkUndo||!record.inkRedo||!record.inkErase||!record.inkUndoErase)fatal=true;
      await page.screenshot({path:path.join(dest,'ink-drawing-360.png'),animations:'disabled'});
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForSelector('#main .hero');
      record.inkPersistedAcrossRefresh=await page.evaluate(()=>window.PsychDeskCore.getData().inkNotes?.[0]?.strokes?.length===1);
      // No on-device OCR or handwriting-to-text conversion should be loaded.
      await openTab('ink');
      await page.locator('[data-ink="open"]').first().click();
      record.inkOnlyInterface=await page.evaluate(()=>Boolean(document.querySelector('#inkCanvas'))&&
        !document.querySelector('[data-ink-convert],#inkConvertPanel,#inkSmooth')&&
        !window.PsychDeskInkConvert);
      if(!record.inkOnlyInterface)fatal=true;

      if(!record.inkStrokeSaved||!record.inkPersistedAcrossRefresh)fatal=true;

     }
     if(!record.autosaveOnClose&&vp.width===360)fatal=true;
     if(navigation.some(n=>!n.visible||!n.heading))fatal=true;
     if(overview.overflow>6||overview.headerOverlap.length)fatal=true;
     if(vp.width>=900&&overview.rail.overflowX!=='hidden'&&overview.rail.overflowX!=='clip')fatal=true;
    }
    if(live){
     const navigation=[];
     for(const tab of ['notes','dictionary','research','timeline','tools']){
      await openTab(tab);
      navigation.push({tab,heading:await page.locator('#main h1').first().textContent().catch(()=>''),visible:await page.locator('#main').isVisible()});
      if(['notes','dictionary','research'].includes(tab))await page.screenshot({path:path.join(dest,tab+'-'+vp.width+'.png'),fullPage:false,animations:'disabled'});
     }
     record.navigation=navigation;
    }
    results.push(record);
   }catch(error){fatal=!live;results.push({origin,viewport:vp.width,error:String(error).slice(0,350),errors});}
   finally{await context.close();}
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(results,null,2));
 for(const item of results)console.log('BROWSER AUDIT '+JSON.stringify(item));
 if(fatal)process.exitCode=1;
 if(live&&results.every(x=>x.error))console.log('LIVE_SITE_UNREACHABLE: Could not confirm deployment or live visuals.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
