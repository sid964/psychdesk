/* PsychDesk Pikachu companion — independently authored inline SVG, zero new network services.
   Pokémon/Pikachu remain the property of their respective rights holders. */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core||document.getElementById('psychdesk-companion'))return;
const KEY='psychdesk-companion-v1';
const MODES=['calm','playful','hidden'];
const SIZES=['small','medium','large'];
const FEATURES=[
 ['today','Overview','See your day, upcoming topics and study progress.'],
 ['planner','Planner','Organize study topics and target dates.'],
 ['notes','Notes','Write and collect your notebook entries.'],
 ['ink','Ink Notes','Use a stylus or touch to draw on saved pages.'],
 ['stickies','Sticky Notes','Turn quick thoughts into notes for your wall.'],
 ['recall','Flashcards','Practice active recall and review cards.'],
 ['focus','Focus Room','Start a timed session and log completed study time.'],
 ['materials','Subject Library','Find your study resources and subject links.'],
 ['research','Reference Manager','Organize citations and research sources.'],
 ['dictionary','Psychology Dictionary','Look up psychology terms and concepts.'],
 ['timeline','Psychology Timeline','Explore major moments in psychology.'],
 ['tools','Study Tools','See additional creative study tools.'],
 ['insights','Insights','Review logged study time and progress.'],
 ['search','Universal Search','Search across your own workspace.'],
 ['reader','PDF Reader','Read and annotate your PDF materials.'],
 ['board','Study Board','Arrange ideas on a study board.'],
 ['mindmap','Mind Maps','Connect related ideas visually.'],
 ['voice','Voice Notes','Capture thoughts with voice notes.']
];
const featureById=Object.fromEntries(FEATURES.map(f=>[f[0],f]));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const safe=(value,choices,fallback)=>choices.includes(value)?value:fallback;
const number=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
function load(){
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');return {
  mode:safe(raw?.mode,MODES,'calm'),size:safe(raw?.size,SIZES,'medium'),
  roam:raw?.roam!==false,popups:raw?.popups!==false,live:raw?.live!==false,
  x:Math.max(0,Math.min(1,number(raw?.x,.96))),y:Math.max(0,Math.min(1,number(raw?.y,.72)))
 };}catch{return {mode:'calm',size:'medium',roam:true,popups:true,live:true,x:.96,y:.72};}
}
const prefs=load();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{/* Local preferences are optional. */}}
const host=document.createElement('div');host.id='psychdesk-companion';
host.className='pc-host';host.dataset.mode=prefs.mode;host.dataset.size=prefs.size;
host.innerHTML='<button type="button" class="pc-character" aria-label="Study companion. Open quick study help. Drag to move; Shift plus arrow keys to reposition." aria-haspopup="true" aria-expanded="false">'+
 '<span class="pc-body" aria-hidden="true"><span class="pc-orb"><span class="pc-eye pc-eye-left"></span><span class="pc-eye pc-eye-right"></span><span class="pc-mouth"></span></span><span class="pc-star pc-star-one"></span><span class="pc-star pc-star-two"></span></span>'+
 '</button><section class="pc-menu" aria-label="Pikachu companion menu" hidden></section><div class="pc-hint" hidden><span class="pc-hint-text" role="status" aria-live="polite"></span><button type="button" class="pc-hint-dismiss" aria-label="Dismiss Pikachu message">×</button></div>';
document.body.append(host);
const button=host.querySelector('.pc-character'),body=host.querySelector('.pc-body'),
 menu=host.querySelector('.pc-menu'),hint=host.querySelector('.pc-hint');
let tab='today',state='resting',opened=false,section='home',lastActivity=Date.now(),timerActive=false;
let connected=false,drag=null,pendingMove=0,adventureTimer=0,endingTimer=0,hintTimer=0,guideTimer=0,highlight=null,highlightTimer=0;
let activityTimer=0,editing=false,pointerDrawing=false,disabledByContext=false;
let roamAnimation=null,roamPosition=null,longPressTimer=0,longPressed=false,lastTap=0;
const bubbleText=hint.querySelector('.pc-hint-text');let bubbleQueue=[];
const artwork=window.PsychDeskCompanionArtwork;
const poseImage=artwork&&typeof artwork==='object'?document.createElement('img'):null;
if(poseImage){poseImage.className='pc-licensed-art';poseImage.alt='';poseImage.hidden=true;poseImage.addEventListener('error',()=>{poseImage.hidden=true;host.classList.remove('pc-has-art');});body.append(poseImage);}
if(typeof window.PsychDeskPikachuMarkup==='string'){
 body.insertAdjacentHTML('beforeend',window.PsychDeskPikachuMarkup);
 host.classList.add('pc-has-pikachu');button.setAttribute('aria-label','Pikachu study companion. Tap for help, double-tap to high-five or drag to move.');
}
// Three frames are cut from the user's supplied images and packed into one small
// transparent PNG: standing (left), waving/jumping (middle), walking (right).
// Load once; retain the existing vector as a fallback if a cache is unavailable.
const userPoseAtlas='companion/assets/pikachu-user-poses.png';
const photoPose=document.createElement('span');
photoPose.className='pc-photo-pose';photoPose.setAttribute('aria-hidden','true');
body.append(photoPose);
if(typeof Image==='function'){
 const preload=new Image();
 preload.onload=()=>{if(!host.isConnected)return;host.classList.add('pc-has-photo');};
 preload.onerror=()=>host.classList.remove('pc-has-photo');
 preload.src=userPoseAtlas;
}
const visible=()=>prefs.mode!=='hidden'&&!document.hidden&&!disabledByContext;
const editorFocused=()=>!!document.activeElement?.closest?.('input,textarea,select,[contenteditable="true"],[contenteditable=""],[role="textbox"]');
const drawingSurface=()=>tab==='ink'&&!!document.querySelector('#main .ink-editor');
function updateContext(){
 editing=editorFocused();
 disabledByContext=document.body.classList.contains('modal-open')||editing||pointerDrawing||drawingSurface()||
  (!!window.visualViewport&&window.visualViewport.height<window.innerHeight*.67);
 host.classList.toggle('pc-suppressed',disabledByContext);
 if(disabledByContext){stopRoam();dismissBubble();}
 if(disabledByContext&&opened)closeMenu(false);
}
function clearAnimation(){clearTimeout(endingTimer);endingTimer=0;}
function applyArt(){
 if(!poseImage||host.classList.contains('pc-has-pikachu'))return;
 const url=artwork[state]||artwork.idle;
 if(typeof url==='string'&&/^(?:\.{0,2}\/|[a-z0-9_\/-])/i.test(url)&&!url.startsWith('//')){
  if(poseImage.getAttribute('src')!==url)poseImage.src=url;
  poseImage.hidden=false;host.classList.add('pc-has-art');
 }else{poseImage.hidden=true;host.classList.remove('pc-has-art');}
}
function setState(next,duration=0){
 clearAnimation();state=reduced.matches?'resting':next;host.dataset.state=state;applyArt();
 if(duration)endingTimer=setTimeout(()=>{endingTimer=0;settle();},duration);
}
function settle(){
 if(prefs.mode==='hidden'||document.hidden){setState('hidden');return;}
 setState(tab==='focus'||timerActive?'sleeping':editing||pointerDrawing||drawingSurface()||Date.now()-lastActivity<11000?'resting':'idle');
}
function dismissBubble(){
 clearTimeout(hintTimer);hintTimer=0;hint.hidden=true;bubbleText.textContent='';
}
function nextBubble(){
 if(!prefs.popups||!visible()||opened||editorFocused()){dismissBubble();bubbleQueue=[];return;}
 const item=bubbleQueue.shift();
 if(!item){dismissBubble();return;}
 dismissBubble();bubbleText.textContent=item.message;hint.hidden=false;
 hintTimer=setTimeout(nextBubble,item.ms);
}
function announce(message,ms=3200){
 if(!prefs.popups||!visible()||editorFocused())return;
 const item={message:String(message).slice(0,180),ms:Math.max(1800,Math.min(ms,4900))};
 if(!hint.hidden){bubbleQueue=bubbleQueue.slice(-1);bubbleQueue.push(item);return;}
 bubbleQueue=[item];nextBubble();
}
hint.querySelector('.pc-hint-dismiss').addEventListener('click',()=>{bubbleQueue=[];dismissBubble();});
function clearHighlight(){
 clearTimeout(highlightTimer);if(highlight){highlight.classList.remove('pc-guided-target');highlight=null;}
}
function markNav(id){
 clearHighlight();
 const nodes=[...document.querySelectorAll('[data-tab]')].filter(e=>e.dataset.tab===id&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
 highlight=nodes.find(e=>e.classList.contains('rail-link')||e.classList.contains('nav-item'))||nodes[0]||document.getElementById('railCurrentSection');
 if(highlight){highlight.classList.add('pc-guided-target');highlightTimer=setTimeout(clearHighlight,2400);}
}
function measure(){
 const w=button.offsetWidth||82,h=button.offsetHeight||90;
 const vv=window.visualViewport;
 const left=vv?vv.offsetLeft:0,top=vv?vv.offsetTop:0;
 const vw=vv?vv.width:innerWidth,vh=vv?vv.height:innerHeight;
 const bottomNav=document.querySelector('.bottom-nav');
 const navVisible=bottomNav&&getComputedStyle(bottomNav).display!=='none';
 const reserveBottom=navVisible?Math.max(88,bottomNav.getBoundingClientRect().height+16):20;
 const rail=document.querySelector('.desktop-rail'),bar=document.querySelector('.topbar');
 const railEdge=rail&&getComputedStyle(rail).display!=='none'?rail.getBoundingClientRect().right+10:left+8;
 const minimumX=Math.max(left+8,railEdge),minimumY=Math.max(top+72,bar?.getBoundingClientRect().bottom+8||0);
 return {minX:minimumX,maxX:Math.max(minimumX,left+vw-w-8),minY:minimumY,
  maxY:Math.max(minimumY,top+vh-h-reserveBottom),w,h};
}
function toCoords(){
 const b=measure();
 return roamPosition?{x:Math.max(b.minX,Math.min(b.maxX,roamPosition.x)),y:Math.max(b.minY,Math.min(b.maxY,roamPosition.y))}:
  {x:b.minX+prefs.x*(b.maxX-b.minX),y:b.minY+prefs.y*(b.maxY-b.minY)};
}
function applyPosition(immediate=false){
 const b=measure(),p=toCoords();
 host.classList.toggle('pc-just-settled',!immediate&&!reduced.matches);
 host.style.left=Math.round(Math.max(b.minX,Math.min(b.maxX,p.x)))+'px';
 host.style.top=Math.round(Math.max(b.minY,Math.min(b.maxY,p.y)))+'px';
 const right=p.x+Math.min(296,innerWidth-22)>innerWidth-12,below=innerHeight-(p.y+b.h)>p.y;
 const capacity=below?Math.max(116,innerHeight-(p.y+b.h)-20):Math.max(116,p.y-20);
 host.style.setProperty('--pc-menu-height',Math.floor(capacity)+'px');
 host.dataset.side=right?'right':'left';host.dataset.menuBelow=below?'true':'false';
 const menuWidth=Math.min(288,innerWidth-22),bubbleWidth=Math.min(260,innerWidth-28);
 const clamp=(v,a,z)=>Math.max(a,Math.min(z,v));
 host.style.setProperty('--pc-menu-left',Math.round(clamp(p.x,8,innerWidth-menuWidth-8)-p.x)+'px');
 host.style.setProperty('--pc-hint-left',Math.round(clamp(p.x,8,innerWidth-bubbleWidth-8)-p.x)+'px');
}
function setXY(x,y){
 const b=measure();roamPosition=null;
 prefs.x=b.maxX>b.minX?Math.max(0,Math.min(1,(x-b.minX)/(b.maxX-b.minX))):0;
 prefs.y=b.maxY>b.minY?Math.max(0,Math.min(1,(y-b.minY)/(b.maxY-b.minY))):0;
 applyPosition(true);
}
function pauseIdle(){clearTimeout(adventureTimer);adventureTimer=0;}
function stopRoam(){
 if(!roamAnimation)return;
 const rect=host.getBoundingClientRect();
 roamAnimation.onfinish=null;roamAnimation.cancel();roamAnimation=null;
 host.classList.remove('pc-just-settled');
 roamPosition={x:rect.left,y:rect.top};host.style.left=Math.round(rect.left)+'px';host.style.top=Math.round(rect.top)+'px';
 host.style.transform='none';applyPosition(true);
}
function startRoam(){
 if(!prefs.roam||!visible()||opened||editing||timerActive||tab==='focus'||drawingSurface()||reduced.matches||!host.animate)return false;
 stopRoam();const from=toCoords(),b=measure();
 if(b.maxX-b.minX<48||b.maxY-b.minY<48)return false;
 // A walk can cross the full visible workspace, never the OS, top-bar, rail or bottom-nav.
 let target=null,furthest=0;
 for(let i=0;i<9;i++){
  const candidate={x:b.minX+Math.random()*(b.maxX-b.minX),y:b.minY+Math.random()*(b.maxY-b.minY)};
  const distance=Math.hypot(candidate.x-from.x,candidate.y-from.y);
  if(distance>furthest){target=candidate;furthest=distance;}
 }
 if(!target||furthest<55)return false;
 host.classList.remove('pc-just-settled');
 host.dataset.facing=target.x<from.x?'left':'right';
 setState('walking');
 const dx=target.x-from.x,dy=target.y-from.y;
 const arc=(Math.random()-.5)*Math.min(54,Math.max(12,b.maxY-b.minY)*.22);
 // Compositor transforms, with browser-native scheduling and no permanent RAF.
 const movement=host.animate([
  {offset:0,transform:'translate3d(0px,0px,0)'},
  {offset:.52,transform:'translate3d('+(dx*.52)+'px,'+(dy*.52+arc)+'px,0)'},
  {offset:1,transform:'translate3d('+dx+'px,'+dy+'px,0)'}
 ],{duration:Math.min(7000,Math.max(1850,furthest*13)),easing:'linear',fill:'forwards'});
 roamAnimation=movement;
 movement.onfinish=()=>{
  if(roamAnimation!==movement)return;
  movement.cancel();roamAnimation=null;
  roamPosition=target;host.style.left=Math.round(target.x)+'px';host.style.top=Math.round(target.y)+'px';
  host.style.transform='none';applyPosition(true);setState('resting');scheduleIdle();
 };
 return true;
}
function scheduleIdle(){
 pauseIdle();
 if(prefs.mode==='hidden'||document.hidden||reduced.matches)return;
 const interval=prefs.mode==='playful'?24000+Math.random()*20000:82000+Math.random()*65000;
 adventureTimer=setTimeout(()=>{
  if(!visible()||opened||editing||timerActive||tab==='focus'||drawingSurface()||Date.now()-lastActivity<22000){scheduleIdle();return;}
  if(prefs.roam&&Math.random()<(prefs.mode==='playful'?.9:.65)&&startRoam())return;
  if(prefs.mode==='playful'&&prefs.live){
   if(Math.random()<.4)setState('sleeping',2600);
   else setState('waving',1600);
  }
  scheduleIdle();
 },interval);
}
function recordActivity(e){
 if(e?.target?.closest?.('#psychdesk-companion'))return;
 stopRoam();lastActivity=Date.now();
 if(state==='sleeping'||state==='walking'||state==='idle')settle();
 clearTimeout(activityTimer);
 activityTimer=setTimeout(()=>{updateContext();settle();},11000);
}
function closeMenu(returnFocus=true){
 if(!opened)return;opened=false;menu.hidden=true;button.setAttribute('aria-expanded','false');host.classList.remove('pc-menu-open');
 if(returnFocus&&prefs.mode!=='hidden'&&!disabledByContext)button.focus({preventScroll:true});
 scheduleIdle();
}
function menuMarkup(which){
 if(which==='help'){
  return '<div class="pc-menu-head"><strong>Find a feature</strong><button type="button" data-pc="back" aria-label="Back to companion menu">←</button></div>'+
   '<p class="pc-menu-copy">Choose where to go. I’ll show you the way.</p><div class="pc-feature-list">'+
   FEATURES.map(f=>'<button type="button" data-pc-feature="'+f[0]+'">'+f[1]+'</button>').join('')+'</div>';
 }
 if(which==='prefs'){
  return '<div class="pc-menu-head"><strong>Companion preferences</strong><button type="button" data-pc="back" aria-label="Back to companion menu">←</button></div>'+
   '<p class="pc-menu-copy">The default is quiet, so studying stays easy.</p>'+
   '<div class="pc-field-label">Behavior</div><div class="pc-choices" role="group" aria-label="Behavior mode">'+
    MODES.map(x=>'<button type="button" data-pc-mode="'+x+'" aria-pressed="'+(prefs.mode===x)+'">'+x[0].toUpperCase()+x.slice(1)+'</button>').join('')+'</div>'+
   '<div class="pc-field-label">Size</div><div class="pc-choices" role="group" aria-label="Character size">'+
    SIZES.map(x=>'<button type="button" data-pc-size="'+x+'" aria-pressed="'+(prefs.size===x)+'">'+x[0].toUpperCase()+x.slice(1)+'</button>').join('')+'</div>'+
   '<div class="pc-field-label">Interaction</div><div class="pc-choices pc-toggles" role="group" aria-label="Interaction preferences">'+
   '<button type="button" data-pc-toggle="roam" aria-pressed="'+prefs.roam+'">Roam '+(prefs.roam?'On':'Off')+'</button>'+
   '<button type="button" data-pc-toggle="popups" aria-pressed="'+prefs.popups+'">Bubbles '+(prefs.popups?'On':'Off')+'</button>'+
   '<button type="button" data-pc-toggle="live" aria-pressed="'+prefs.live+'">Gestures '+(prefs.live?'On':'Off')+'</button></div>'+
   '<button class="pc-minimize" type="button" data-pc="dock">Return to saved position</button>'+
   '<p class="pc-menu-copy">Drag with touch or stylus; Shift + arrows moves by keyboard. Alt + Shift + P restores a hidden companion.</p>';
 }
 return '<div class="pc-menu-head"><strong>Study companion</strong><button type="button" data-pc="close" aria-label="Close companion menu">×</button></div>'+
  '<p class="pc-menu-copy">'+(featureById[tab]?.[2]||'Here when you need a hand.')+'</p>'+
  '<div class="pc-menu-actions"><button type="button" data-pc="help">Find a feature</button>'+
  '<button type="button" data-pc="quick">+ Quick note</button>'+
  '<button type="button" data-pc="drive">Drive connection</button>'+
  '<button type="button" data-pc="prefs">Preferences</button>'+ 
  '<button type="button" data-pc="greet">Wave hello</button>'+ 
  '<button type="button" data-pc="roam">Go exploring</button></div>'+
  '<button type="button" class="pc-minimize" data-pc="minimize">Hide companion</button>';
}
function openMenu(which='home',restoreFocus=false){
 if(prefs.mode==='hidden'&&which!=='prefs')return;
 stopRoam();dismissBubble();
 section=which;opened=true;pauseIdle();clearHighlight();updateContext();
 if(disabledByContext&&which!=='prefs')return;
 menu.innerHTML=menuMarkup(which);menu.hidden=false;
 button.setAttribute('aria-expanded','true');host.classList.add('pc-menu-open');
 if(restoreFocus)menu.querySelector('button')?.focus({preventScroll:true});
}
function setMode(mode){
 if(mode!=='hidden')stopRoam();
 prefs.mode=safe(mode,MODES,'calm');persist();host.dataset.mode=prefs.mode;
 if(prefs.mode==='hidden'){stopRoam();pauseIdle();closeMenu(false);setState('hidden');dismissBubble();}
 else{setState('resting');applyPosition();scheduleIdle();}
}
function setSize(size){
 prefs.size=safe(size,SIZES,'medium');host.dataset.size=prefs.size;persist();applyPosition(true);
}
function guide(id){
 const feature=featureById[id];if(!feature)return;
 stopRoam();
 closeMenu(false);
 core.setTab(id);tab=id;updateContext();markNav(id);
 announce(feature[1]+': '+feature[2],4200);setState('pointing',1450);
}
function driveStatus(){
 const linked=Boolean(window.PsychDeskFirebase?.getUserId?.()),ok=linked&&Boolean(window.PsychDeskCloud?.isConnected?.());
 return !linked?'Sign in to PsychDesk first to use Google Drive.':ok?'Google Drive reports a verified connection.':'Drive is not connected. Use the Drive status button to reconnect.';
}
function celebrate(kind){
 if(!visible()||editing||pointerDrawing||timerActive||reduced.matches)return;
 setState('celebrating',1450);
 announce(kind==='task'?'Study topic completed. Nice work!':kind==='focus'?'Focused session logged. Well done!':'Flashcard session complete!',2600);
}
button.addEventListener('pointerdown',e=>{
 if(!e.isPrimary||e.button!==0)return;
 stopRoam();longPressed=false;
 if(prefs.live){clearTimeout(longPressTimer);longPressTimer=setTimeout(()=>{if(drag&&!drag.moved){longPressed=true;setState('thinking',1200);openMenu('home',true);}},610);}
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:toCoords(),moved:false};
 try{button.setPointerCapture(e.pointerId);}catch{}
});
button.addEventListener('pointermove',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)>7){drag.moved=true;clearTimeout(longPressTimer);closeMenu(false);setState('interacting');}
 if(!drag.moved)return;
 e.preventDefault();
 if(pendingMove)cancelAnimationFrame(pendingMove);
 pendingMove=requestAnimationFrame(()=>{pendingMove=0;if(drag)setXY(drag.start.x+dx,drag.start.y+dy);});
});
function endDrag(e){
 clearTimeout(longPressTimer);
 if(!drag||e.pointerId!==drag.id)return;
 if(pendingMove){cancelAnimationFrame(pendingMove);pendingMove=0;}
 const wasMoved=drag.moved;
 if(wasMoved){
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  setXY(drag.start.x+dx,drag.start.y+dy);prefs.x=prefs.x<.5?0:1;applyPosition();persist();setState('resting');
  button.dataset.wasDragged='true';setTimeout(()=>delete button.dataset.wasDragged,0);
 }
 drag=null;try{button.releasePointerCapture(e.pointerId);}catch{}
}
button.addEventListener('pointerup',endDrag);
button.addEventListener('pointercancel',endDrag);
button.addEventListener('click',()=>{
 if(button.dataset.wasDragged)return;
 if(longPressed){longPressed=false;return;}
 const now=Date.now(),doubleTap=prefs.live&&now-lastTap<360;lastTap=now;
 lastActivity=now;
 if(doubleTap){closeMenu(false);setState('celebrating',1350);announce('High five! ⚡',1800);return;}
 if(prefs.live)setState('waving',1100);
 opened?closeMenu():openMenu('home',true);
});
button.addEventListener('keydown',e=>{
 if(!e.shiftKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
 e.preventDefault();const p=toCoords(),step=18;
 setXY(p.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),
  p.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));persist();
});
menu.addEventListener('click',e=>{
 const feature=e.target.closest('[data-pc-feature]')?.dataset.pcFeature;
 if(feature){guide(feature);return;}
 const mode=e.target.closest('[data-pc-mode]')?.dataset.pcMode;
 if(mode){setMode(mode);if(mode!=='hidden')openMenu('prefs');return;}
 const size=e.target.closest('[data-pc-size]')?.dataset.pcSize;
 if(size){setSize(size);openMenu('prefs');return;}
 const toggle=e.target.closest('[data-pc-toggle]')?.dataset.pcToggle;
 if(['roam','popups','live'].includes(toggle)){prefs[toggle]=!prefs[toggle];persist();if(!prefs.roam)stopRoam();if(!prefs.popups){dismissBubble();bubbleQueue=[];}openMenu('prefs',true);scheduleIdle();return;}
 const action=e.target.closest('[data-pc]')?.dataset.pc;
 if(!action)return;
 if(action==='greet'){closeMenu(false);setState('waving',1400);announce('Pika! Happy studying! ⚡',2600);return;}
 if(action==='roam'){closeMenu(false);if(!startRoam())announce('I’ll explore when the desk is quiet.',2600);return;}
 if(action==='dismiss-speech'){bubbleQueue=[];dismissBubble();return;}
 if(action==='close'||action==='minimize'){if(action==='minimize')setMode('hidden');else closeMenu();return;}
 if(action==='back'||action==='help'||action==='prefs'){openMenu(action==='back'?'home':action,true);return;}
 if(action==='dock'){stopRoam();roamPosition=null;applyPosition();closeMenu(false);return;}
 if(action==='quick'){closeMenu(false);window.PsychDeskQuickNote?.open?.();return;}
 if(action==='drive'){announce(driveStatus(),4300);closeMenu(false);return;}
});
document.addEventListener('pointerdown',e=>{
 if(opened&&!host.contains(e.target))closeMenu(false);
 if(e.pointerType==='pen'&&e.target.closest?.('canvas,.ink-paper,.ink-editor')){pointerDrawing=true;updateContext();}
 recordActivity(e);
},{capture:true});
document.addEventListener('pointerup',()=>{if(pointerDrawing){pointerDrawing=false;updateContext();}},{capture:true});
document.addEventListener('pointercancel',()=>{pointerDrawing=false;updateContext();},{capture:true});
document.addEventListener('keydown',e=>{
 if(e.altKey&&e.shiftKey&&e.code==='KeyP'){e.preventDefault();setMode('calm');announce('Companion restored.');button.focus();return;}
 if(e.key==='Escape'&&opened){e.stopPropagation();closeMenu();return;}
 recordActivity(e);
},{capture:true});
document.addEventListener('focusin',e=>{if(opened&&!host.contains(e.target))closeMenu(false);updateContext();recordActivity();});
document.addEventListener('focusout',()=>queueMicrotask(updateContext));
document.addEventListener('click',e=>{
 if(e.target.closest('[data-companion-settings]')){
  e.preventDefault();
  core.openModal('Study companion','<div class="settings-section"><p class="note">This is a free, private, optional helper. It does not read your notes.</p>'+
    '<div class="pc-settings-actions"><button type="button" class="secondary" data-companion-mode="calm">Calm (recommended)</button>'+
    '<button type="button" class="secondary" data-companion-mode="playful">Playful</button>'+
    '<button type="button" class="secondary" data-companion-mode="hidden">Hidden</button></div>'+
    '<p class="note">Use Alt + Shift + P to restore the companion at any time. A custom Pikachu drawing is included; this site and repository remain publicly accessible until you restrict them.</p></div>');
  return;
 }
 const mode=e.target.closest('[data-companion-mode]')?.dataset.companionMode;
 if(mode){setMode(mode);core.toast?.('Companion: '+mode);core.closeModal();}
});
window.addEventListener('psychdesk:tab-changed',e=>{stopRoam();tab=featureById[e.tab]?e.tab:'today';updateContext();settle();});
window.addEventListener('psychdesk:focus-state',e=>{timerActive=Boolean(e.detail?.running);settle();});
window.addEventListener('psychdesk:achievement',e=>celebrate(e.detail?.type));
window.addEventListener('psychdesk:drive-connected',()=>{
 if(!window.PsychDeskCloud?.isConnected?.())return;
 const wasConnected=connected;connected=true;
 if(!wasConnected&&visible()&&!timerActive&&!editing){setState('interacting',1100);announce('Drive connected.',2200);}
});
window.addEventListener('psychdesk:drive-operation-start',()=>{if(visible()&&connected&&!timerActive&&!editing)setState('syncing');});
window.addEventListener('psychdesk:drive-operation-end',()=>{if(state==='syncing')settle();});
window.addEventListener('psychdesk:drive-disconnected',()=>{
 const wasConnected=connected;connected=false;
 if(wasConnected&&visible()){setState('disconnected',1600);announce('Drive disconnected. Open Drive status to reconnect.',3500);}
});
window.addEventListener('psychdesk:session-reset',()=>{connected=false;settle();});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){stopRoam();pauseIdle();dismissBubble();closeMenu(false);clearAnimation();setState('hidden');}
 else{updateContext();settle();scheduleIdle();}
});
document.addEventListener('scroll',e=>{if(e.target.closest?.('#psychdesk-companion'))return;lastActivity=Date.now();stopRoam();},{passive:true,capture:true});
window.addEventListener('resize',()=>{stopRoam();applyPosition(true);updateContext();},{passive:true});
window.visualViewport?.addEventListener('resize',()=>{stopRoam();applyPosition(true);updateContext();},{passive:true});
window.visualViewport?.addEventListener('scroll',()=>applyPosition(true),{passive:true});
reduced.addEventListener?.('change',()=>{if(reduced.matches)stopRoam();settle();scheduleIdle();});
connected=Boolean(window.PsychDeskFirebase?.getUserId?.()&&window.PsychDeskCloud?.isConnected?.());
applyPosition(true);updateContext();settle();scheduleIdle();
if(prefs.live&&prefs.popups&&!document.hidden){
 try{if(sessionStorage.getItem('psychdesk-pikachu-welcome-v2')!=='1'){
  sessionStorage.setItem('psychdesk-pikachu-welcome-v2','1');
  setState('waving',1250);announce('Pika! I’m here if you need help. ⚡',3100);
 }}catch{/* Private browsing may block session storage. */}
}
window.PsychDeskCompanion={
 show:()=>setMode('calm'),
 hide:()=>setMode('hidden'),
 guide,settings:()=>{setMode('calm');openMenu('prefs',true);},
 getPreferences:()=>({...prefs}),
 getState:()=>state,
 roam:startRoam
};
})();
