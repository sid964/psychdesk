/* PsychDesk World launcher and browser-history-aware navigation.
   This module changes only page navigation, never study records or account storage. */
(()=>{'use strict';
const main=document.getElementById('main');
if(!main)return;
const allowed=new Set(['today','materials','books','dictionary','focus','tools','reader','reader-fast','research','timeline','stickies']);
const KEY='psychdeskViewV1';
const isCompanionRoute=()=>/^#companion\/[a-z0-9-]+(?:\/|$)/.test(location.hash);
const isBookRoute=()=>/^#books(?:\/|$)/.test(location.hash);
let active=null,previousFocus=null,tab='today',restoring=false,background=[];
function validView(view){
 if(!view||typeof view!=='object')return null;
 if(view.kind==='world')return {kind:'world',from:allowed.has(view.from)?view.from:'today',returnToPrevious:view.returnToPrevious===true};
 if(view.kind==='garden')return {kind:'garden',from:'today'};
 if(view.kind==='tab'&&allowed.has(view.tab)&&view.tab!=='garden')return {kind:'tab',tab:view.tab};
 return null;
}
function routeFromHash(){
 if(isBookRoute())return {kind:'tab',tab:'books'};
 const match=/^#pd-(world|garden|[a-z-]+)$/.exec(location.hash);
 if(!match)return null;
 if(match[1]==='world')return {kind:'world',from:'today'};
 if(match[1]==='garden')return {kind:'garden',from:'today'};
 return allowed.has(match[1])?{kind:'tab',tab:match[1]}:null;
}
function urlFor(view){
 const next=new URL(location.href);
 if(view.kind==='tab'&&view.tab==='books'){
  if(!isBookRoute())next.hash='#books';
 }else next.hash='#pd-'+(view.kind==='tab'?view.tab:view.kind);
 return next.pathname+next.search+next.hash;
}
function replace(view){
 try{history.replaceState({...history.state,[KEY]:view},'',urlFor(view));}catch(error){console.warn('PsychDesk history replace:',error);}
}
function push(view){
 if(restoring)return;
 // The reader has already created the entry for a specific book or section.
 // Adopt that entry rather than adding a duplicate to the Back stack.
 if(view.kind==='tab'&&view.tab==='books'&&isBookRoute()){replace(view);return;}
 const current=validView(history.state?.[KEY]);
 if(current&&current.kind===view.kind&&(view.kind==='tab'?current.tab===view.tab:view.kind==='world'?current.from===view.from:true))return;
 try{history.pushState({...history.state,[KEY]:view},'',urlFor(view));}
 catch(error){console.warn('PsychDesk history push:',error);}
}
function attachLaunch(){
 if(tab!=='focus')return;
 const host=main.querySelector('.focus-room-intro');
 if(!host||host.querySelector('#psychWorldLaunch'))return;
 const btn=document.createElement('button');
 btn.id='psychWorldLaunch';btn.type='button';btn.className='focus-world-launch';
 btn.textContent='Open 3D world';btn.setAttribute('aria-haspopup','dialog');
 btn.addEventListener('click',()=>openWorld());host.append(btn);
}
function destroyWorld(){
 if(!active)return;
 active.remove();active=null;
 for(const [element,wasInert] of background)element.inert=wasInert;
 background=[];
 document.body.classList.remove('psychworld-open');
 window.removeEventListener('message',receive);
 document.removeEventListener('keydown',escape);
 const focus=previousFocus;previousFocus=null;
 if(focus?.isConnected)focus.focus({preventScroll:true});
}
function requestClose(){
 if(!active)return;
 const view=validView(history.state?.[KEY]);
 if(view?.kind==='world'&&view.returnToPrevious)history.back();
 else{
  // A direct World URL has no known in-app predecessor. Close in place,
  // rather than sending the visitor back to an unrelated external page.
  const destination={kind:'tab',tab:view?.from||'today'};
  replace(destination);restore(destination);
 }
}
function escape(event){
 if(event.key==='Escape'){event.preventDefault();requestClose();}
}
function openWorld(fromHistory=false){
 if(active)return;
 if(!fromHistory)push({kind:'world',from:tab,returnToPrevious:true});
 previousFocus=document.activeElement;
 const layer=document.createElement('section');
 layer.id='psychWorldOverlay';layer.setAttribute('role','dialog');
 layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Psychology World');
 const frame=document.createElement('iframe');
 frame.title='Interactive Psychology World';frame.src='world/index.html';
 frame.setAttribute('allow','fullscreen');frame.setAttribute('loading','eager');
 const close=document.createElement('button');
 close.type='button';close.className='psychworld-exit';close.textContent='Return to study desk';
 close.addEventListener('click',requestClose);
 layer.append(frame,close);
 document.body.append(layer);active=layer;
 // aria-modal alone does not remove the covered application/tour from Tab
 // order. Preserve prior inert state and let native focus traverse the iframe
 // and exit button, in either direction, without reaching hidden controls.
 background=Array.from(document.body.children||[]).filter(element=>element!==layer)
  .map(element=>[element,Boolean(element.inert)]);
 for(const [element] of background)element.inert=true;
 document.body.classList.add('psychworld-open');
 window.addEventListener('message',receive);
 document.addEventListener('keydown',escape);
 close.focus({preventScroll:true});
}
function openGarden(){
 const button=document.createElement('button');
 button.type='button';button.hidden=true;button.dataset.auto='garden';
 document.body.append(button);button.click();button.remove();
}
function receive(event){
 if(!active||event.origin!==location.origin||event.source!==active.querySelector('iframe')?.contentWindow)return;
 const data=event.data;
 if(!data||typeof data!=='object')return;
 if(data.type==='psychworld:close'){requestClose();return;}
 if(data.type!=='psychworld:visit'||!allowed.has(data.tab)||data.tab==='today')return;
 const destination=data.tab;
 destroyWorld();
 // Keep the World entry: Back restores it and Forward restores the room.
 if(destination==='garden'){
  push({kind:'garden',from:'today'});
  openGarden();
 }else{
  window.PsychDeskCore?.setTab?.(destination);
 }
}
function restore(view){
 restoring=true;
 try{
  if(view.kind==='world'){
   window.PsychDeskCore?.closeModal?.();
   if(tab!==view.from)window.PsychDeskCore?.setTab?.(view.from);
   openWorld(true);
  }else if(view.kind==='garden'){
   destroyWorld();
   if(tab!=='today')window.PsychDeskCore?.setTab?.('today');
   openGarden();
  }else{
   destroyWorld();
   window.PsychDeskCore?.closeModal?.();
   if(tab!==view.tab)window.PsychDeskCore?.setTab?.(view.tab);
  }
 }finally{restoring=false;}
}
const initial=(isBookRoute()?routeFromHash():validView(history.state?.[KEY])||routeFromHash())||{kind:'tab',tab:'today'};
if(!validView(history.state?.[KEY])&&!isCompanionRoute())replace(initial);
window.addEventListener('popstate',event=>{
 if(isCompanionRoute())return;
 const routed=isBookRoute()?routeFromHash():validView(event.state?.[KEY])||routeFromHash();
 if(!routed&&location.hash){
  // Native in-page anchors (skip link and Tools section jumps) are not app
  // routes. Preserve their fragment and current view instead of rendering Home.
  try{history.replaceState({...history.state,[KEY]:{kind:'tab',tab}},'',location.href);}
  catch(error){console.warn('PsychDesk anchor history:',error);}
  return;
 }
 const next=routed||{kind:'tab',tab:'today'};
 restore(next);
});
window.addEventListener('psychdesk:tab-changed',event=>{
 tab=allowed.has(event.tab)?event.tab:'today';
 if(!restoring){
  if(active)destroyWorld();
  push({kind:'tab',tab});
 }
 attachLaunch();
});
const observer=new MutationObserver(attachLaunch);
observer.observe(main,{childList:true,subtree:true});
attachLaunch();
if(!isCompanionRoute()&&(initial.kind!=='tab'||initial.tab!=='today')){
 queueMicrotask(()=>restore(initial));
}
window.PsychDeskWorldNavigation={openWorld,closeWorld:requestClose,getView:()=>validView(history.state?.[KEY])};
})();
