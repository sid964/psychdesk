/* PsychDesk first-visit guide — desktop-first, optional and read-only.
   Highlights only the features currently visible in the real application.
   Never creates content, changes accounts, or uploads files. */
(()=>{
 'use strict';
 const KEY='psychdesk-tour-v1'; // Respect visitors who already dismissed/completed the old tour.
 const $=selector=>document.querySelector(selector);
 const core=()=>window.PsychDeskCore;
 const steps=[
  {tag:'01 · READING',title:'Begin at the bookshelf.',copy:'The reference collection starts with Biological Psychology. Open its cover for the complete study companion and chapter notes.',tab:'today',selector:'.desk-original-cover',icon:'▤'},
  {tag:'02 · FOCUS',title:'One study session at a time.',copy:'Focus has the study timer and the 3D World. Choose a duration and begin whenever you are ready.',tab:'focus',selector:'.focus-room-intro',icon:'◷'},
  {tag:'03 · RESOURCES',title:'Only the tools worth keeping.',copy:'Find the PDF reader, References, Sticky Notes, Psychology Dictionary and Timeline under More tools.',tab:'tools',selector:'.desktop-tool-home .study-tools-grid',icon:'✧'},
  {tag:'04 · YOUR SPACE',title:'Keep your work connected.',copy:'Google sign-in is optional for exploring. When you sign in, supported study records can sync to your account. Your private Drive files remain separate.',tab:null,selector:'#accountBtn',icon:'☁'}
 ];
 let active=false,stage=-1,panel=null,shield=null,spotlight=null,previousFocus=null;
 let invite=null,resizeFrame=0,observe=null,changedByTour=false,stopped=false;
 let offerTimer=null,expiryTimer=null;
 function seen(){try{return localStorage.getItem(KEY)==='done'}catch{return false}}
 function remember(){try{localStorage.setItem(KEY,'done')}catch{}}
 function visible(el){
  if(!el||el.closest?.('[hidden],[inert]'))return false;
  const box=el.getBoundingClientRect?.();
  return Boolean(box&&box.width>0&&box.height>0);
 }
 function find(selector){
  return selector?[...document.querySelectorAll(selector)].find(visible)||null:null;
 }
 function removeInvite(){if(invite){invite.remove?.();invite=null}}
 function stopOffering(){
  if(stopped)return;
  stopped=true;
  clearInterval(offerTimer);clearTimeout(expiryTimer);
 }
 function setText(id,value){const el=$('#'+id);if(el)el.textContent=value}
 function focusPanel(){
  const button=$('#tourNext');
  if(button)button.focus({preventScroll:true});
 }
 function layout(){
  if(!active||!panel||!spotlight)return;
  if(stage<0||stage>=steps.length){
   spotlight.hidden=true;
   Object.assign(panel.style,{left:'50%',top:'50%',transform:'translate(-50%, -50%)'});
   return;
  }
  const el=find(steps[stage].selector);
  if(!el){spotlight.hidden=true;Object.assign(panel.style,{left:'50%',top:'50%',transform:'translate(-50%, -50%)'});return;}
  spotlight.hidden=false;
  const rect=el.getBoundingClientRect();
  const w=window.innerWidth||document.documentElement.clientWidth||1440;
  const h=window.innerHeight||document.documentElement.clientHeight||900;
  const pad=14;
  const spotX=Math.max(pad,rect.left-7),spotY=Math.max(pad,rect.top-7);
  const spotW=Math.max(12,Math.min(w-pad,rect.right+7)-spotX);
  const spotH=Math.max(12,Math.min(h-pad,rect.bottom+7)-spotY);
  Object.assign(spotlight.style,{left:spotX+'px',top:spotY+'px',width:spotW+'px',height:spotH+'px'});
  const pw=panel.offsetWidth||390,ph=panel.offsetHeight||310;
  let x=rect.right+22,y=rect.top;
  if(x+pw>w-pad)x=rect.left-pw-22;
  if(x<pad){x=rect.left;y=rect.bottom+20;}
  if(y+ph>h-pad)y=h-ph-pad;
  if(y<pad)y=pad;
  x=Math.min(w-pw-pad,Math.max(pad,x));
  Object.assign(panel.style,{transform:'none',left:x+'px',top:y+'px'});
 }
 function schedule(){
  if(!active)return;
  cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(layout);
 }
 function welcomeMarkup(){
  return '<div class="tour-welcome-meta"><span class="tour-mini-rule"></span> A SPACE FOR PSYCHOLOGY</div>'+
   '<div class="tour-welcome-symbol" aria-hidden="true">ψ</div>'+
   '<div class="tour-intro-path" aria-label="Four things you can explore">'+
   '<span><b>01</b> Bookshelf</span><span><b>02</b> Focus</span><span><b>03</b> Resources</span><span><b>04</b> Your account</span></div>';
 }
 function paint(){
  if(!active)return;
  const welcome=stage<0,complete=stage===steps.length;
  panel.className='tour-panel '+(welcome?'tour-panel-welcome':complete?'tour-panel-complete':'tour-panel-guided');
  shield.className='tour-shield '+(welcome||complete?'tour-shield-soft':'tour-shield-clear');
  const progress=Math.max(0,Math.min(stage+1,steps.length));
  const bar=$('#tourProgress');if(bar){bar.value=progress;bar.max=steps.length;}
  setText('tourCount',welcome?'FIRST VISIT':complete?'READY TO STUDY':String(stage+1).padStart(2,'0')+' / '+steps.length);
  setText('tourStepLabel',welcome?'WELCOME TO PSYCHDESK':complete?'INTRO COMPLETE':steps[stage].tag);
  setText('tourTitle',welcome?'A space to study psychology.':complete?'The desk is ready.':steps[stage].title);
  setText('tourText',welcome?'Reference books, a quiet focus room, and the tools needed for studying. Here is where everything lives.':complete?'Start with a book or explore at your own pace. This introduction is always available again in Settings.':steps[stage].copy);
  const extra=$('#tourExtra');if(extra)extra.innerHTML=welcome?welcomeMarkup():'';
  setText('tourNext',welcome?'Explore PsychDesk':complete?'Open bookshelf':stage===steps.length-1?'Finish introduction':'Continue');
  const back=$('#tourBack');if(back)back.hidden=welcome||complete;
  const skip=$('#tourStepSkip');if(skip)skip.hidden=complete;
  const close=$('#tourClose');if(close)close.setAttribute('aria-label',complete?'Close introduction':'Skip introduction');
  const status=$('#tourStatus');if(status)status.textContent=welcome?'About one minute · optional':complete?'Nothing was changed in your workspace.':'Step '+(stage+1)+' of '+steps.length+' · You can skip at any time';
  if(stage>=0&&stage<steps.length){
   const step=steps[stage];
   if(step.tab){
    changedByTour=true;
    core()?.setTab?.(step.tab);
    changedByTour=false;
   }
   const el=find(step.selector);
   el?.scrollIntoView?.({block:'center',inline:'nearest',behavior:'instant'});
  }
  schedule();
  requestAnimationFrame(()=>{schedule();focusPanel()});
 }
 function show(next){
  if(!active)return;
  stage=Math.max(-1,Math.min(next,steps.length));
  paint();
 }
 function next(){
  if(stage===steps.length){finish(true);return;}
  show(stage+1);
 }
 function tabChanged(){if(active&&!changedByTour)schedule();}
 function keydown(event){
  if(!active)return;
  if(event.key==='Escape'){event.preventDefault();finish(false);return;}
  if(event.key!=='Tab')return;
  const options=[...panel.querySelectorAll('button:not([hidden]):not([disabled]),a[href]')].filter(visible);
  if(!options.length)return;
  const first=options[0],last=options[options.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  else if(!panel.contains(document.activeElement)){event.preventDefault();first.focus();}
 }
 function finish(goHome=false){
  if(!active)return;
  active=false;remember();
  cancelAnimationFrame(resizeFrame);observe?.disconnect();observe=null;
  panel?.remove();shield?.remove();spotlight?.remove();
  panel=shield=spotlight=null;
  document.body.classList.remove('tour-active');
  document.removeEventListener('keydown',keydown,true);
  window.removeEventListener('resize',schedule);
  window.removeEventListener('scroll',schedule,true);
  window.removeEventListener('psychdesk:tab-changed',tabChanged);
  window.visualViewport?.removeEventListener('resize',schedule);
  window.visualViewport?.removeEventListener('scroll',schedule);
  if(goHome)core()?.setTab?.('today');
  if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 function start(){
  if(active||!core())return;
  if($('#modalRoot')?.children?.length)return; // Never cover an existing writing or account dialog.
  removeInvite();stopOffering();
  previousFocus=document.activeElement;active=true;stage=-1;
  shield=document.createElement('div');shield.id='tourShield';shield.setAttribute('aria-hidden','true');
  spotlight=document.createElement('div');spotlight.id='tourSpotlight';spotlight.hidden=true;spotlight.setAttribute('aria-hidden','true');
  panel=document.createElement('section');panel.id='psychdeskTour';panel.className='tour-panel';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','tourTitle');panel.setAttribute('aria-describedby','tourText');
  panel.innerHTML=
   '<header class="tour-head"><span class="tour-brand"><span class="tour-brand-mark" aria-hidden="true">ψ</span><span>PsychDesk</span></span><button id="tourClose" type="button" data-tour="skip" aria-label="Skip introduction">×</button></header>'+
   '<div class="tour-progress-head"><span id="tourCount">FIRST VISIT</span><span id="tourStepLabel">WELCOME TO PSYCHDESK</span></div>'+
   '<progress id="tourProgress" max="4" value="0" aria-label="Introduction progress"></progress>'+
   '<div class="tour-body"><h2 id="tourTitle" tabindex="-1"></h2><p id="tourText"></p><div id="tourExtra"></div></div>'+
   '<p class="tour-status" id="tourStatus" role="status"></p>'+
   '<footer class="tour-actions"><button type="button" id="tourBack" data-tour="back" hidden>Back</button><button type="button" id="tourNext" data-tour="next">Explore PsychDesk</button></footer>'+
   '<button type="button" id="tourStepSkip" data-tour="skip">Skip introduction</button>';
  document.body.append(shield,spotlight,panel);document.body.classList.add('tour-active');
  panel.addEventListener('click',event=>{
   const command=event.target.closest('[data-tour]')?.dataset.tour;
   if(command==='next')next();
   else if(command==='back')show(stage-1);
   else if(command==='skip')finish(false);
  });
  document.addEventListener('keydown',keydown,true);
  window.addEventListener('resize',schedule);
  window.addEventListener('scroll',schedule,true);
  window.addEventListener('psychdesk:tab-changed',tabChanged);
  window.visualViewport?.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('scroll',schedule);
  observe=new MutationObserver(schedule);
  if($('#main'))observe.observe($('#main'),{childList:true,subtree:false});
  paint();
  $('#tourTitle')?.focus({preventScroll:true});
 }
 function offer(){
  if(active||invite||seen()||!core()||document.hidden||document.body.classList.contains('psychworld-open')||
   $('#modalRoot')?.children?.length||document.querySelector('dialog[open]'))return;
  // Keep the invitation nonmodal. Opening the introduction is entirely optional.
  const node=document.createElement('aside');node.id='psychdeskTourInvite';
  node.setAttribute('role','region');node.setAttribute('aria-label','Optional first-visit introduction');
  node.innerHTML=
   '<div class="tour-invite-symbol" aria-hidden="true">ψ</div>'+
   '<div class="tour-invite-copy"><strong>Welcome to PsychDesk.</strong><span>A brief introduction to the bookshelf and study tools.</span></div>'+
   '<button type="button" data-tour-invite="start">Take a tour</button>'+
   '<button type="button" data-tour-invite="dismiss" aria-label="Dismiss introduction">×</button>';
  node.addEventListener('click',event=>{
   const action=event.target.closest('[data-tour-invite]')?.dataset.tourInvite;
   if(action==='start'){removeInvite();start();}
   else if(action==='dismiss'){remember();removeInvite();stopOffering();}
  });
  invite=node;document.body.append(node);stopOffering();
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-action="replayTour"]')){
   core()?.closeModal?.();
   start();
  }
 });
 window.PsychDeskTour={start,finish};
 offerTimer=setInterval(offer,1500);
 expiryTimer=setTimeout(stopOffering,60000);
})();