/* First-visit introduction; deliberately separate from account/study data. */
(()=>{
'use strict';
const key='psychdesk-tour-v1';
const steps=[
 ['Welcome to your study desk','A quick tour, then you can get straight to studying. Start small: one thought, one topic, one session.','About 30 seconds · 5 short steps'],
 ['Capture a thought in one tap','Use + Note at the top whenever an idea comes to you. Find your writing in Notebook. Tools also has Sticky Notes and Ink Notes for your stylus.','Write first. Organize when you feel ready.'],
 ['Make a little progress','Use Plan to choose what to study, then Focus for a timed session. Your study desk brings your next steps together.','One manageable task is enough to start.'],
 ['Find the tool you need','Open Tools for flashcards, the Psychology Dictionary, Reference Manager, Psychology Timeline and progress insights.','Explore these whenever you need them.'],
 ['Keep your work connected','Use Sign in at the top for Google account sync. The Drive indicator shows your file connection; tap it to manage access or reconnect when needed.','Replay this tour anytime from Settings.']
];
let dialog,step=0,previousFocus;
function seen(){try{return localStorage.getItem(key)==='done'}catch{return true}}
function remember(){try{localStorage.setItem(key,'done')}catch{}}
function draw(){
 const s=steps[step];
 dialog.querySelector('#tourCount').textContent='QUICK TOUR · '+(step+1)+' / '+steps.length;
 dialog.querySelector('#tourTitle').textContent=s[0];
 dialog.querySelector('#tourText').textContent=s[1];
 dialog.querySelector('#tourHint').textContent=s[2];
 dialog.querySelector('[data-tour=back]').disabled=step===0;
 dialog.querySelector('[data-tour=next]').textContent=step===steps.length-1?'Start studying':'Next →';
 dialog.querySelector('progress').value=step+1;
 dialog.querySelector('#tourTitle').focus();
}
function finish(){remember();dialog.close();dialog.remove();dialog=null;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
function start(){
 if(dialog?.open)return;
 previousFocus=document.activeElement;step=0;
 dialog=document.createElement('dialog');dialog.id='psychdeskTour';
 dialog.setAttribute('aria-labelledby','tourTitle');dialog.setAttribute('aria-describedby','tourText');
 dialog.innerHTML='<div class="tour-top"><span id="tourCount"></span><button type="button" data-tour="skip">Skip tour</button></div><progress max="5" value="1" aria-label="Tour progress"></progress><h2 id="tourTitle" tabindex="-1"></h2><p id="tourText"></p><p id="tourHint"></p><div class="tour-actions"><button type="button" data-tour="back">Back</button><button type="button" data-tour="next">Next →</button></div>';
 dialog.addEventListener('click',e=>{
  const action=e.target.closest('[data-tour]')?.dataset.tour;
  if(action==='skip')finish();
  if(action==='back'&&step>0){step--;draw();}
  if(action==='next'){if(step===steps.length-1)finish();else{step++;draw();}}
 });
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish()});
 // Keep the app's global Escape handler from closing unrelated UI underneath.
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation()});
 document.body.append(dialog);dialog.showModal();draw();
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-action="replayTour"]')){
  window.PsychDeskCore?.closeModal();start();
 }
});
window.PsychDeskTour={start};
// Wait for initialization and avoid opening over account/recovery dialogs.
function offer(){
 if(seen()||!window.PsychDeskCore)return;
 const root=document.querySelector('#modalRoot');
 if(document.hidden||root?.children.length||document.querySelector('dialog[open]'))return;
 start();cleanup();
}
const timer=setInterval(offer,1500);
const stop=setTimeout(cleanup,60000);
function cleanup(){clearInterval(timer);clearTimeout(stop)}
})();