/* Hands-on onboarding. Uses real UI actions; never creates sample study records. */
(()=>{
'use strict';
const KEY='psychdesk-tour-v1';
const $=s=>document.querySelector(s);
const core=()=>window.PsychDeskCore;
const chapters=[
 {title:'Catch a thought',text:'Tap the glowing + Note button. Your writing space opens right here.',selector:'#quickNoteBtn',kind:'capture'},
 {title:'Find your writing',text:'Tap Notes to visit your notebook. This is where your saved thoughts live.',selector:'.rail-nav [data-tab="notes"],.bottom-nav [data-tab="notes"]',tab:'notes'},
 {title:'Pick a tool to explore',text:'Choose a highlighted tool: handwriting, sticky notes, flashcards or something you are curious about.',prepare:'tools',selector:'#main .study-tool-launcher',kind:'tools'},
 {title:'Give today a small goal',text:'Open your planner to organize subjects and study topics.',prepare:'tools',selector:'.rail-nav [data-tab="planner"],.bottom-nav [data-tab="planner"],#main .study-tool-launcher[data-tab="planner"]',tab:'planner'},
 {title:'Make space to focus',text:'Visit your focus room. You can begin a session whenever you are ready.',prepare:'tools',selector:'.rail-nav [data-tab="focus"],.bottom-nav [data-tab="focus"],#main .study-tool-launcher[data-tab="focus"]',tab:'focus'},
 {title:'Make this space yours',text:'Tap Settings to find account sync, Drive, backups and this tour.',selector:'#settingsBtn',kind:'settings'}
];
let panel,ring,target,region,index=-1,phase='',opener,frame=0,observer,active=false,generation=0;
let modalState=new Map(),highlighted=[],timers=new Set();
const later=(fn,ms=0)=>{const token=generation;const id=setTimeout(()=>{timers.delete(id);if(active&&token===generation)fn()},ms);timers.add(id)};
function visible(el){if(!el||el.closest('[hidden],[inert]'))return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'}
function find(selector){return [...document.querySelectorAll(selector)].find(visible)}
function clearHighlights(){highlighted.forEach(el=>el.classList.remove('tour-target'));highlighted=[]}
function select(el,area=el){
 clearHighlights();target=el;region=area;
 if(el){el.classList.add('tour-target');highlighted.push(el)}
 if(chapters[index]?.kind==='tools'&&phase==='action'){
  document.querySelectorAll('#main .study-tool-launcher').forEach(el=>{el.classList.add('tour-target');highlighted.push(el)});
 }
 schedule();
}
function layout(){
 if(!active)return;
 const vv=window.visualViewport,w=vv?.width||innerWidth,h=vv?.height||innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;
 const box=panel.getBoundingClientRect(),r=target?.isConnected?target.getBoundingClientRect():null;
 let x=ox+(w-box.width)/2,y=oy+(h-box.height)/2;
 if(r){
  const top=Math.max(oy+6,r.top-5),left=Math.max(ox+6,r.left-5);
  const bottom=Math.min(oy+h-6,r.bottom+5),right=Math.min(ox+w-6,r.right+5);
  Object.assign(ring.style,{display:bottom>top&&right>left?'block':'none',top:top+'px',left:left+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});
  const gap=16;
  if(right+gap+box.width<ox+w-12){x=right+gap;y=top}
  else if(left-gap-box.width>ox+12){x=left-gap-box.width;y=top}
  else if(bottom+gap+box.height<oy+h-12){x=left;y=bottom+gap}
  else if(top-gap-box.height>oy+12){x=left;y=top-gap-box.height}
  else{x=ox+(w-box.width)/2;y=oy+h-box.height-12}
 }else ring.style.display='none';
 panel.style.left=Math.max(ox+12,Math.min(x,ox+w-box.width-12))+'px';
 panel.style.top=Math.max(oy+12,Math.min(y,oy+h-box.height-12))+'px';
}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(layout)}
function content(title,text,status=''){
 $('#tourTitle').textContent=title;$('#tourText').textContent=text;
 $('#tourStatus').textContent=status;
 $('#tourStatus').hidden=!status;
 schedule();
}
function buttons(label,skip=true){
 $('#tourNext').textContent=label;$('#tourStepSkip').hidden=!skip;
 $('#tourBack').hidden=index<0;$('#tourBack').disabled=index===0;
}
function closeOwnedModal(){
 if(phase==='write'||chapters[index]?.kind==='settings'&&phase==='done')core().closeModal();
}
function show(n){
 generation++;closeOwnedModal();index=n;phase='action';select(null);
 $('#tourCount').textContent=(n+1)+' OF '+chapters.length;
 $('#tourProgress').value=n+1;
 const s=chapters[n];
 if(s.prepare)core().setTab(s.prepare);
 content(s.title,s.text,'Tap the highlighted control');
 buttons('Show me');
 const aim=()=>{
  if(phase!=='action')return;
  const el=find(s.selector);
  select(el,s.kind==='tools'?$('#main'):el);
  el?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
  if(!el){content(s.title,'This control is not visible right now. You can skip this step and continue.');$('#tourNext').textContent='Continue'}
  schedule();
 };
 aim();later(aim,450);
 $('#tourTitle').focus({preventScroll:true});
}
function done(title,text){
 phase='done';content(title,text,'✓ You found it');
 buttons(index===chapters.length-1?'Finish tour':'Continue',false);
 if(chapters[index].kind==='settings')select(find('#modalRoot .modal-header'),$('#modalRoot .modal'));
 else select(find('#main h1'));
 $('#tourNext').focus({preventScroll:true});later(schedule,450);
}
function inspect(){
 if(!active||index<0)return;
 const s=chapters[index];
 // The existing modal's focus scope is shared with the tour controls.
 document.querySelectorAll('#modalRoot [aria-modal="true"]').forEach(el=>{modalState.set(el,'true');el.setAttribute('aria-modal','false')});
 if(s.kind==='capture'&&phase==='action'&&$('#quickNoteText')){
  phase='write';select($('#quickNoteText'),$('#modalRoot .modal'));
  content('Try one thought','Write something if you like. Save to Notebook or make a Sticky using the buttons in the editor. You can also continue with your draft.','Your own words · writing is optional');
  buttons('Continue with draft',true);
  $('#quickNoteText').focus();schedule();
 }else if(s.kind==='capture'&&phase==='write'&&!$('#quickNoteText')){
  done('That is quick capture','You can reach + Note from any section. Now let’s find your notebook.');
 }else if(s.kind==='settings'&&phase==='action'&&$('#modalRoot .modal')){
  done('Your settings, all together','Google login and Drive controls are here. Replay this tour from Quick tour whenever you need it.');
 }
 schedule();
}
function nav(e){
 if(!active||phase!=='action')return;
 const s=chapters[index];if(!s)return;
 if(s.tab===e.tab||s.kind==='tools'&&e.tab!=='tools'){
  const names={notes:'Your notebook',planner:'Your study plan',focus:'Your focus room'};
  later(()=>done(names[e.tab]||'Your chosen tool','This is the real workspace. '+(e.tab==='focus'?'The timer has not been started. ':e.tab==='notes'?'Your saved notes appear here. ':'')+'You can explore it freely after the tour.'),60);
 }
}
function advance(){
 if(index<0){show(0);return}
 if(phase==='action'){
  if(target?.isConnected){target.click();later(inspect,50)}
  else if(index<chapters.length-1)show(index+1);else finish();
 }else if(index<chapters.length-1)show(index+1);else finish();
}
function click(e){
 if(!active||panel.contains(e.target))return;
 if(region?.contains(e.target)){
  // Writing and saving in the real quick editor are explicitly visitor actions.
  if(phase==='write'){later(inspect,50);return}
  if(phase==='action'){
   const s=chapters[index];
   if(s.kind!=='tools'||e.target.closest('.study-tool-launcher')){later(inspect,50);return}
  }
 }
 e.preventDefault();e.stopImmediatePropagation();
}
function keys(e){
 if(!active)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish();return}
 if(e.key==='Tab'){
  e.preventDefault();e.stopImmediatePropagation();
  const selector='button:not([disabled]),input:not([disabled]),textarea,select,summary,a[href]';
  const controls=[...(region&&phase!=='done'?[...(region.matches(selector)?[region]:[]),...region.querySelectorAll(selector)]:[]),...panel.querySelectorAll('button')].filter(visible);
  const i=controls.indexOf(document.activeElement);
  controls[(i+(e.shiftKey?-1:1)+controls.length)%controls.length]?.focus();
 }else if(panel.contains(e.target)){e.stopPropagation()}
}
function finish(){
 if(!active)return;
 closeOwnedModal();active=false;generation++;
 try{localStorage.setItem(KEY,'done')}catch{}
 timers.forEach(clearTimeout);timers.clear();cancelAnimationFrame(frame);
 observer?.disconnect();clearHighlights();panel.remove();ring.remove();panel=ring=target=region=null;
 document.body.classList.remove('tour-active');
 modalState.forEach((value,el)=>{if(el.isConnected)el.setAttribute('aria-modal',value)});modalState.clear();
 document.removeEventListener('click',click,true);document.removeEventListener('keydown',keys,true);
 window.removeEventListener('psychdesk:tab-changed',nav);window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);
 window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
 if(opener?.isConnected&&!opener.closest('[inert]'))opener.focus({preventScroll:true});
}
function start(){
 if(active||!core())return;
 // Never replace an existing writing or account dialog.
 if($('#modalRoot')?.children.length)return;
 cleanup();$('#psychdeskTourInvite')?.remove();active=true;index=-1;phase='welcome';opener=document.activeElement;
 panel=document.createElement('section');panel.id='psychdeskTour';panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','tourTitle');panel.setAttribute('aria-describedby','tourText');
 panel.innerHTML='<header><span id="tourCount">A QUICK LOOK AROUND</span><button type="button" data-tour="exit" aria-label="Close tour">×</button></header><progress id="tourProgress" max="6" value="0" aria-label="Tour progress"></progress><h2 id="tourTitle" tabindex="-1"></h2><p id="tourText"></p><p id="tourStatus" role="status" hidden></p><footer><button type="button" id="tourBack" data-tour="back" hidden>Back</button><button type="button" id="tourNext" data-tour="next">Let’s try it →</button></footer><button type="button" id="tourStepSkip" data-tour="skip" hidden>Skip this step</button>';
 ring=document.createElement('div');ring.id='tourSpotlight';ring.setAttribute('aria-hidden','true');
 document.body.append(ring,panel);document.body.classList.add('tour-active');
 content('Learn by doing','Open a note, find your notebook and try a study tool. Six tiny steps, at your pace. You can leave anytime.');
 panel.addEventListener('click',e=>{const a=e.target.closest('[data-tour]')?.dataset.tour;if(a==='exit')finish();else if(a==='next')advance();else if(a==='back'&&index>0)show(index-1);else if(a==='skip'){if(index<chapters.length-1)show(index+1);else finish()}});
 document.addEventListener('click',click,true);document.addEventListener('keydown',keys,true);
 window.addEventListener('psychdesk:tab-changed',nav);window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
 observer=new MutationObserver(inspect);
 observer.observe($('#modalRoot'),{childList:true,subtree:true});
 $('#tourTitle').focus();schedule();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-action="replayTour"]')){core()?.closeModal();start()}});
window.PsychDeskTour={start};
function offer(){
 let seen=true;try{seen=localStorage.getItem(KEY)==='done'}catch{}
 if(seen||!core()||document.hidden||$('#modalRoot')?.children.length||document.querySelector('dialog[open]'))return;
 // A first-visit invitation, not a blocking dialog: normal study actions must remain usable.
 if($('#psychdeskTourInvite'))return;
 const invite=document.createElement('aside');
 invite.id='psychdeskTourInvite';
 invite.setAttribute('role','region');
 invite.setAttribute('aria-label','Optional first-time study tour');
 invite.innerHTML='<span>New here? Take a short tour of your study garden.</span>'+
  '<button type="button" data-tour-invite="start">Show me</button>'+
  '<button type="button" data-tour-invite="dismiss" aria-label="Dismiss tour invitation">×</button>';
 invite.addEventListener('click',event=>{
  const action=event.target.closest('[data-tour-invite]')?.dataset.tourInvite;
  if(action==='start'){invite.remove();start();}
  else if(action==='dismiss'){
   try{localStorage.setItem(KEY,'done')}catch{}
   invite.remove();
  }
 });
 document.body.append(invite);
 cleanup();
}
const timer=setInterval(offer,1500),stop=setTimeout(cleanup,60000);
function cleanup(){clearInterval(timer);clearTimeout(stop)}
})();