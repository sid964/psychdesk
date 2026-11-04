'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async(page,record,dest)=>{
 async function setMotion(reducedMotion){
  await page.emulateMedia({reducedMotion});
  // Emulation can resolve before media queries and their change events are delivered.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 }
 await setMotion('no-preference');
 const initial=await page.evaluate(()=>{
  window.PsychDeskCore.setTab('planner');
  const main=document.querySelector('#main'),animations=main.getAnimations({subtree:true});
  return {installed:!!window.PsychDeskMotion,targets:animations.map(a=>a.effect.target.id),frames:animations[0]?.effect.getKeyframes(),black:getComputedStyle(document.body).backgroundColor};
 });
 assert.equal(initial.installed,true);assert.deepEqual(initial.targets,['main'],'Navigation moves one surface, without individual entrances');
 assert.equal(initial.black,'rgb(0, 0, 0)');
 assert.match(initial.frames[0].transform,/translateX\((44|60)px\)/,'Forward navigation enters from the right');
 assert.equal(initial.frames.some(frame=>'opacity' in frame),false,'Navigation never fades the content out');
 await page.waitForTimeout(100);
 await page.screenshot({path:path.join(dest,'motion-arriving-'+record.viewport+'.png')});
 await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>document.querySelector('#main').getAnimations({subtree:true}).length),0,'Workspace settles completely');
 assert.equal(await page.evaluate(()=>{window.PsychDeskCore.render();return document.querySelector('#main').getAnimations({subtree:true}).length}),0,'Data refresh does not replay movement');
 await page.evaluate(()=>window.scrollTo({top:600,behavior:'instant'}));await page.waitForTimeout(420);
 const position=await page.evaluate(()=>scrollY);
 await page.evaluate(()=>{window.PsychDeskCore.setTab('notes');window.PsychDeskCore.setTab('planner')});
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-position)<2,'Section scroll survives navigation');
 const backward=await page.evaluate(()=>document.querySelector('#main').getAnimations()[0].effect.getKeyframes()[0].transform);
 // Rapid reversal resumes the current offset; a settled backward transition starts at the left.
 await page.waitForTimeout(600);
 const direction=await page.evaluate(()=>{window.PsychDeskCore.setTab('today');return document.querySelector('#main').getAnimations()[0].effect.getKeyframes()[0].transform});
 assert.match(direction,/translateX\(-(44|60)px\)/,'Backward navigation enters from the left');
 assert.ok(backward);
 await page.waitForTimeout(450);
 await page.screenshot({path:path.join(dest,'motion-scroll-'+record.viewport+'.png')});
 await page.evaluate(()=>{for(const tab of ['notes','focus','planner','notes'])window.PsychDeskCore.setTab(tab)});
 assert.match(await page.locator('#main h1').innerText(),/^(Notes\.|Your notebook)/,'Navigation ends on the notebook screen');
 await setMotion('reduce');
 await page.evaluate(()=>window.PsychDeskCore.setTab('planner'));
 assert.equal(await page.evaluate(()=>document.querySelector('#main').getAnimations({subtree:true}).length),0,'Reduced motion disables navigation');
 await page.locator('[data-action="newTask"]').first().click();
 assert.equal(await page.locator('#modalRoot .modal').evaluate(el=>el.getAnimations().length),0,'Reduced-motion dialog is still');
 await page.keyboard.press('Escape');
 await setMotion('no-preference');
 const opening=await page.evaluate(()=>{
  window.PsychDeskCore.openModal('Motion check','<input aria-label="Motion check">');
  const el=document.querySelector('#modalRoot .modal');
  return {surface:getComputedStyle(el).backgroundColor,frames:el.getAnimations()[0]?.effect.getKeyframes(),blur:getComputedStyle(el.parentElement).backdropFilter,veil:getComputedStyle(el.parentElement).backgroundColor,shell:getComputedStyle(document.querySelector('.app-shell')).opacity};
 });
 assert.equal(opening.surface,'rgb(12, 12, 12)','Dialog surface stays neutral without a green tint');
 assert.equal(opening.shell,'1','No second layer of workspace dimming');
 assert.match(opening.blur,/blur\(3px\)/);assert.equal(opening.veil,'rgba(0, 0, 0, 0.28)');
 assert.ok(opening.frames?.length,'Dialog has its upward slide');
 assert.equal(opening.frames[0].transform,'translateY('+(record.viewport<650?64:44)+'px)');
 assert.ok(opening.frames.every(frame=>!frame.transform.includes('scale')),'Dialogs never zoom or bounce');
 await page.keyboard.press('Escape');
 const exit=await page.locator('.motion-dismiss-layer').evaluate(el=>({inert:el.hasAttribute('inert'),pointer:getComputedStyle(el).pointerEvents,ids:el.querySelectorAll('[id]').length}));
 assert.deepEqual(exit,{inert:true,pointer:'none',ids:0},'Outgoing surface cannot intercept actions, focus, or ID lookups');
 await page.waitForFunction(()=>!document.querySelector('.motion-dismiss-layer'),null,{timeout:1200});
 await page.locator('[data-action="newTask"]').first().click();await page.waitForTimeout(440);
 await page.screenshot({path:path.join(dest,'motion-dialog-'+record.viewport+'.png')});
 if(record.viewport===390){
  const handle=page.locator('.motion-sheet-handle');const box=await handle.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+12);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+28,{steps:3});await page.mouse.up();
  await page.waitForTimeout(440);assert.equal(await page.locator('#taskForm').count(),1,'Short drag returns gently');
  const next=await handle.boundingBox();await page.mouse.move(next.x+next.width/2,next.y+12);await page.mouse.down();await page.mouse.move(next.x+next.width/2,next.y+152,{steps:8});await page.mouse.up();
  await page.waitForTimeout(270);assert.equal(await page.locator('#taskForm').count(),0,'Deliberate handle drag dismisses');
 }else await page.keyboard.press('Escape');
 await page.evaluate(()=>{window.PsychDeskCore.openModal('First','<input aria-label=First>');window.PsychDeskCore.closeModal();window.PsychDeskCore.openModal('Second','<input aria-label=Second>')});
 assert.equal(await page.locator('.modal').count(),1,'Replacing a dialog removes outgoing surfaces');
 await page.waitForTimeout(440);assert.equal(await page.locator('.modal').getAttribute('aria-label'),'Second');
 await page.keyboard.press('Escape');
 const foreground=await page.evaluate(()=>{
  const core=window.PsychDeskCore;core.openModal('Foreground','<input aria-label=Foreground>');
  const dialog=document.querySelector('#modalRoot .modal'),animation=dialog.getAnimations()[0];core.render();
  return {running:animation?.playState,focused:dialog.contains(document.activeElement)};
 });
 assert.equal(foreground.running,'running');assert.equal(foreground.focused,true);
 await page.evaluate(()=>{window.motionPreferenceChanged=new Promise(resolve=>matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',resolve,{once:true}))});
 await setMotion('reduce');
 await page.evaluate(()=>window.motionPreferenceChanged.then(()=>{delete window.motionPreferenceChanged}));
 assert.equal(await page.locator('#modalRoot .modal').evaluate(el=>el.getAnimations().length),0,'Live preference changes settle foreground movement');
 await page.keyboard.press('Escape');await setMotion('no-preference');
 const pen=await page.evaluate(()=>{
  window.PsychDeskCore.setTab('ink');const main=document.querySelector('#main');
  main.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'pen',isPrimary:true}));return main.getAnimations().length;
 });
 assert.equal(pen,0,'Stylus input immediately settles navigation');
 await page.evaluate(()=>{window.PsychDeskCore.setTab('insights');window.PsychDeskCore.render()});
 assert.equal(await page.locator('.chart-bar').first().evaluate(el=>el.getAnimations().length),0,'Charts remain still');
 assert.equal(await page.locator('.app-shell').getAttribute('inert'),null);
 await page.waitForFunction(()=>document.querySelector('#main').getAnimations({subtree:true}).length===0,null,{timeout:1200});
 await page.evaluate(()=>window.PsychDeskCore.setTab('today'));
 record.motion={directionalSurface:true,noFade:true,noBounce:true,settles:true,noReplay:true,rapidNavigation:true,reducedMotion:true,amoled:true,scrollContinuity:true,sheetGesture:record.viewport===390,interruptedDialogs:true,lightBlur:true,penSettles:true};
};
