/* Browser smoke audit for the real PsychDesk UI. Runs inside GitHub Actions with Chromium.
   Local origin exercises UI without touching anyone's live study data.
   Live mode captures read-only metrics and screenshots from GitHub Pages. */
'use strict';
const { chromium, firefox }=require('playwright');
const engineName=process.argv.includes('--firefox')?'firefox':'chromium';
const auditFlows=require('./browser-flows.cjs');
const fs=require('node:fs');
const path=require('node:path');
const live=process.argv.includes('--live');
const origin=live?'https://sid964.github.io/psychdesk/':'http://127.0.0.1:8765/';
const viewports=[{width:320,height:700},{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}];
const dest=path.join(process.cwd(),'browser-audit-artifacts',live?'live':engineName);
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
  const skip=document.querySelector('.skip-link')?.getBoundingClientRect();
  const accent=getComputedStyle(document.querySelector('.stat'),'::before').backgroundColor;
  return {width:W,scrollY,skipVisible:!!skip&&skip.bottom>0,accent,overflow:document.documentElement.scrollWidth-W,
   rail:{overflowX:railStyle?.overflowX||'',width:rail?.clientWidth||0,scrollWidth:rail?.scrollWidth||0},
   headerOverlap:intersections,
   headerScroll:Math.round((header?.scrollWidth||0)-(header?.clientWidth||0)),
   offscreen,theme:document.documentElement.dataset.theme,
   loaded:Boolean(window.PsychDeskCore),heading:document.querySelector('#main h1')?.textContent?.trim()||''};
 });
}
async function main(){
 const browser=await (engineName==='firefox'?firefox:chromium).launch({headless:true});
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
     for(const tab of (vp.width===390||vp.width===1440?['today','planner','notes','ink','stickies','recall','focus','insights','search','reader','research','dictionary','timeline','voice','board','mindmap','tools']:['planner','notes','ink','dictionary','research','timeline','tools'])){
      await openTab(tab);
      await page.waitForTimeout(70);
      const state=await page.evaluate(()=>({
       heading:document.querySelector('#main h1')?.textContent?.trim()||'',
       overflow:document.documentElement.scrollWidth-innerWidth,
       rendered:document.querySelector('#main')?.textContent?.trim().length||0
      }));
      navigation.push({tab,heading:state.heading,visible:state.rendered>20,overflow:state.overflow});
      if(state.overflow>8)fatal=true;
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
      // Replacing an open editor with a new dialog must also flush the last keystroke.
      await page.locator('[data-cloud="newNote"]').first().click();
      await page.locator('#noteForm [name="body"]').fill('Switching dialogs also preserves my last sentence.');
      await page.evaluate(()=>window.PsychDeskCore.settings()); // A second dialog can replace the editor programmatically.
      record.autosaveOnModalReplace=await page.evaluate(()=>
       window.PsychDeskCore.getData().notes.some(n=>n.body==='Switching dialogs also preserves my last sentence.'));
      await page.locator('.modal-header .close').click();
      if(!record.autosaveOnModalReplace)fatal=true;
      // Simulate a full local-storage write failure: do not lose the note or clear its draft.
      await page.locator('[data-cloud="newNote"]').first().click();
      await page.locator('#noteForm [name="body"]').fill('This recovery draft survives failed storage writes.');
      await page.evaluate(()=>{
       window.__savedCoreSave=window.PsychDeskCore.save;
       window.PsychDeskCore.save=()=>false;
      });
      await page.locator('.modal-header .close').click();
      record.failedAutosaveProtected=await page.evaluate(()=>(
       !window.PsychDeskCore.getData().notes.some(n=>n.body==='This recovery draft survives failed storage writes.')&&
       Object.keys(localStorage).some(k=>k.includes('draft:new')&&localStorage.getItem(k).includes('This recovery draft'))
      ));
      await page.evaluate(()=>{window.PsychDeskCore.save=window.__savedCoreSave;});
      await page.locator('[data-cloud="newNote"]').first().click();
      record.failedDraftRecovered=(await page.locator('#noteForm [name="body"]').inputValue()).includes('This recovery draft');
      await page.locator('.modal-header .close').click();
      if(!record.failedAutosaveProtected||!record.failedDraftRecovered)fatal=true;
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
      // Firefox and Chromium center oversized canvases differently. Align the scroll
      // container, then draw on the actual visible paper using real pointer input.
      async function showPaper(){
       await inkCanvas.evaluate(canvas=>{const sc=canvas.closest('.ink-page-scroll');sc.scrollTo({top:0,left:0,behavior:'instant'});sc.scrollIntoView({block:'start',behavior:'instant'});});
      }
      await showPaper();
      const bound=await inkCanvas.boundingBox();
      if(!bound)throw Error('Ink canvas is not visible.');
      const px=bound.x+35,py=bound.y+35;
      const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x:px,y:py});
      if(hit!=='inkCanvas')throw Error('Test pointer is outside visible paper: '+hit);
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
      await showPaper();
      // Use a point from the saved vector, not a guessed offset near the line.
      const erasePoint=await inkCanvas.evaluate(canvas=>{
       const r=canvas.getBoundingClientRect(),points=window.PsychDeskInk.getActive().strokes[0].p;
       const p=points[Math.floor(points.length/2)];
       const x=r.left+p[0]/canvas.width*r.width,y=r.top+p[1]/canvas.height*r.height;
       return {x,y,hit:document.elementFromPoint(x,y)?.id};
      });
      record.inkEraseTarget=erasePoint;
      if(erasePoint.hit!=='inkCanvas')throw Error('Saved stroke is outside the visible paper: '+JSON.stringify(erasePoint));
      await page.mouse.click(erasePoint.x,erasePoint.y);
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
     if((!record.autosaveOnClose||!record.autosaveOnModalReplace)&&vp.width===360)fatal=true;
     if(navigation.some(n=>!n.visible||!n.heading))fatal=true;
     if(vp.width===390||vp.width===1440)await auditFlows(page,openTab,record,dest);
     if(errors.length)fatal=true;
     if(overview.overflow>6||overview.headerOverlap.length||overview.scrollY!==0||overview.skipVisible)fatal=true;
     if(overview.accent!=='rgb(146, 146, 146)')fatal=true;
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
   }catch(error){if(!live)fatal=true;await page.screenshot({path:path.join(dest,'failure-'+vp.width+'.png'),animations:'disabled'}).catch(()=>{});results.push({origin,viewport:vp.width,error:String(error).slice(0,600),errors});}
   finally{await context.close();}
  }
  // A separate browser profile deliberately starts with unreadable account storage.
  // It must allow raw recovery export and never overwrite the damaged original.
  if(!live){
   const recovery=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
   const page=await recovery.newPage();
   // Isolate local-data recovery from the asynchronous Firebase onAuthStateChanged(null)
   // transition, which would legitimately switch a signed-out browser to guest storage.
   await page.route('**/firebase-sync.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
   const corrupted='{"version":2,"notes":[{"title":"do not erase"}],BROKEN';
   await page.addInitScript(raw=>{
    localStorage.setItem('psychdesk-last-user-v3','alice');
    localStorage.setItem('psychdesk-user-alice',raw);
   },corrupted);
   try{
    await page.goto(origin,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForSelector('.recovery-warning',{timeout:12000});
    const preserved=await page.evaluate(()=>window.PsychDeskCore.save()===false&&
     localStorage.getItem('psychdesk-user-alice')==='{"version":2,"notes":[{"title":"do not erase"}],BROKEN');
    // Inspect the generated recovery Blob without relying on headless browser download events.
    await page.evaluate(()=>{
     window.__recoveryFile=null;window.__recoveryBlob=null;
     const original=URL.createObjectURL.bind(URL);
     URL.createObjectURL=blob=>{window.__recoveryBlob=blob;return original(blob);};
     HTMLAnchorElement.prototype.click=function(){window.__recoveryFile=this.download;};
    });
    await page.locator('[data-action="downloadRecovery"]').click();
    const exported=await page.evaluate(async()=>({
     filename:window.__recoveryFile||'',
     raw:window.__recoveryBlob?await window.__recoveryBlob.text():null
    }));
    const intact=exported.raw===corrupted;
    results.push({origin,scenario:'unreadable local data',preserved,filename:exported.filename,intact});
    if(!preserved||!intact||!exported.filename.startsWith('psychdesk-unreadable-study-recovery-'))fatal=true;
   }catch(error){fatal=true;results.push({origin,scenario:'unreadable local data',error:String(error).slice(0,350)});}
   finally{await recovery.close();}
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(results,null,2));
 for(const item of results)console.log('BROWSER AUDIT '+JSON.stringify(item));
 if(fatal)process.exitCode=1;
 if(live&&results.every(x=>x.error))console.log('LIVE_SITE_UNREACHABLE: Could not confirm deployment or live visuals.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
