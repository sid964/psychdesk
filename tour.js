(()=>{
'use strict';
const key='psychdesk-tour-v1';
const steps=[
 {title:'Your notebook is here',text:'Tap the highlighted Notes button to open your notebook.',selector:'[data-tab="notes"]',tab:'notes'},
 {title:'Write with your stylus',text:'Here in Tools, tap Handwritten notes to open Ink Notes. Sticky notes live beside it.',selector:'#main [data-tab="ink"]',prepare:'tools',tab:'ink'},
 {title:'Choose one small task',text:'Tap Plan to see your subjects and study tasks.',selector:'[data-tab="planner"]',tab:'planner'},
 {title:'Make time to focus',text:'Tap Focus to visit your timer. You decide when to start a session.',selector:'[data-tab="focus"]',tab:'focus'},
 {title:'The rest of your study kit',text:'Tap Tools to find flashcards, sticky notes, the Dictionary, Reference Manager, Timeline and progress insights.',selector:'[data-tab="tools"]',tab:'tools'},
 {title:'Capture a thought anywhere',text:'This + Note button opens the quick editor. Choose “Try writing” to leave the tour and write, or Next to keep looking.',selector:'#quickNoteBtn',tryNote:true},
 {title:'Your account and files',text:'This is your Google account button. Drive sits beside it and shows your file connection. Sign in whenever you are ready.',selector:'#accountBtn'},
 {title:'You can come back anytime',text:'Open Settings → Replay quick tour whenever you want another look. Ready to capture your first thought?',selector:'#settingsBtn'}
];
let panel,ring,target,index=0,previousFocus,raf=0,opened=false;
const core=()=>window.PsychDeskCore;
function seen(){try{return localStorage.getItem(key)==='done'}catch{return true}}
function visible(selector){return [...document.querySelectorAll(selector)].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'})}
function clearTarget(){if(target)target.classList.remove('tour-target');target=null}
function position(){
 if(!panel)return;
 const r=target?.getBoundingClientRect();
 const w=innerWidth,h=innerHeight,p=panel.getBoundingClientRect();
 if(r){Object.assign(ring.style,{display:'block',left:(r.left-5)+'px',top:(r.top-5)+'px',width:(r.width+10)+'px',height:(r.height+10)+'px'})}else ring.style.display='none';
 let top=r?(r.bottom+18+p.height<h-12?r.bottom+18:r.top-p.height-18):(h-p.height)/2;
 // If a large target leaves no room, keep the card inside the viewport.
 top=Math.max(12,Math.min(top,h-p.height-12));
 let left=r?r.left+r.width/2-p.width/2:(w-p.width)/2;
 left=Math.max(12,Math.min(left,w-p.width-12));
 panel.style.top=top+'px';panel.style.left=left+'px';
}
function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(position)}
function draw(){
 clearTarget();opened=false;
 const s=steps[index];
 if(s.prepare)core().setTab(s.prepare);
 target=visible(s.selector);target?.classList.add('tour-target');
 target?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 panel.querySelector('#tourCount').textContent='SHOW ME AROUND · '+(index+1)+' / '+steps.length;
 panel.querySelector('#tourTitle').textContent=s.title;
 panel.querySelector('#tourText').textContent=s.text;
 panel.querySelector('[data-tour=back]').disabled=index===0;
 panel.querySelector('[data-tour=next]').textContent=index===steps.length-1?'Finish':'Next →';
 const action=panel.querySelector('[data-tour=try]');
 action.hidden=!s.tab&&!s.tryNote;
 action.textContent=s.tryNote?'Try writing':'Open this section';
 panel.querySelector('progress').value=index+1;
 panel.querySelector('#tourTitle').focus({preventScroll:true});schedule();setTimeout(schedule,500);
}
function activate(){
 const s=steps[index];
 if(s.tryNote){finish();document.querySelector('#quickNoteBtn')?.click();return}
 if(!s.tab)return;
 core().setTab(s.tab);opened=true;clearTarget();
 target=visible('#main h1');target?.classList.add('tour-target');
 panel.querySelector('#tourText').textContent='You’re here! '+({notes:'This is your notebook.',ink:'This is your handwriting workspace.',planner:'Your subjects and tasks live here.',focus:'Your timer is ready when you are.',tools:'Scroll through the tools after the tour to explore them.'}[s.tab]||'')+' Choose Next to continue.';
 panel.querySelector('[data-tour=try]').hidden=true;
 schedule();
}
function click(e){
 if(!panel)return;
 if(panel.contains(e.target))return;
 // Only the featured navigation action runs; no study records are changed.
 e.preventDefault();e.stopImmediatePropagation();
 if(target?.contains(e.target)&&!opened)activate();
}
function keydown(e){
 if(!panel)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish();return}
 if(e.key==='Tab'){
  const controls=[...panel.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);
  if(target?.matches('button')&&!opened&&(steps[index].tab||steps[index].tryNote))controls.unshift(target);
  const current=controls.indexOf(document.activeElement);
  e.preventDefault();controls[(current+(e.shiftKey?-1:1)+controls.length)%controls.length].focus();
 }
}
function finish(){
 try{localStorage.setItem(key,'done')}catch{}
 clearTarget();cancelAnimationFrame(raf);panel?.remove();ring?.remove();panel=ring=null;
 document.removeEventListener('click',click,true);document.removeEventListener('keydown',keydown,true);
 window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
}
function start(){
 if(panel||!core())return;
 cleanup();previousFocus=document.activeElement;index=0;
 ring=document.createElement('div');ring.id='tourSpotlight';ring.setAttribute('aria-hidden','true');
 panel=document.createElement('section');panel.id='psychdeskTour';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Interactive website tour');
 panel.innerHTML='<div class="tour-top"><span id="tourCount"></span><button type="button" data-tour="skip">Skip</button></div><progress max="8" value="1" aria-label="Tour progress"></progress><h2 id="tourTitle" tabindex="-1"></h2><p id="tourText"></p><button type="button" data-tour="try">Open this section</button><div class="tour-actions"><button type="button" data-tour="back">Back</button><button type="button" data-tour="next">Next →</button></div>';
 panel.addEventListener('click',e=>{
  const action=e.target.closest('[data-tour]')?.dataset.tour;
  if(action==='skip')finish();
  else if(action==='try')activate();
  else if(action==='back'&&index>0){index--;draw()}
  else if(action==='next'){if(index===steps.length-1)finish();else{index++;draw()}}
 });
 document.body.append(ring,panel);
 document.addEventListener('click',click,true);document.addEventListener('keydown',keydown,true);
 window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);draw();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-action="replayTour"]')){core()?.closeModal();start()}});
window.PsychDeskTour={start};
function offer(){
 if(seen()||!core()||document.hidden||document.querySelector('#modalRoot')?.children.length||document.querySelector('dialog[open]'))return;
 start();
}
const timer=setInterval(offer,1500),stop=setTimeout(cleanup,60000);
function cleanup(){clearInterval(timer);clearTimeout(stop)}
})();