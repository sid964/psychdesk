/* Phase 4: optional living garden inside the existing sober Focus Room.
   Progress reflects recorded sessions; never awards fictional streaks or penalties. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,d=()=>core.getData();
const days=()=>{const today=new Date();today.setHours(0,0,0,0);return Array.from({length:7},(_,i)=>{const day=new Date(today);day.setDate(day.getDate()-(6-i));return [day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-')})};
const progress=()=>{
 const records=Array.isArray(d().sessions)?d().sessions:[];
 const week=days();
 const mins=week.map(day=>records.filter(s=>s.day===day).reduce((n,s)=>n+(Number.isFinite(Number(s.minutes))&&Number(s.minutes)>0?Number(s.minutes):0),0));
 const total=Math.round(mins.reduce((a,b)=>a+b,0));
 return {week,mins,total,active:mins.filter(n=>n>0).length};
};
let show=true;
function render(){
 const p=progress(),growth=Math.min(5,p.active);
 const scene=window.PsychDeskGarden?.scene?.([],[])||'';
 const milestones=p.week.map((day,i)=>'<button type="button" class="p4-day'+(p.mins[i]>0?' has-session':'')+'" data-p4="day" data-day="'+day+'" aria-label="'+h(day)+': '+Math.round(p.mins[i])+' minutes logged"><span aria-hidden="true">'+(p.mins[i]>0?'✿':'·')+'</span><small>'+h(new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}))+'</small></button>').join('');
 return '<details class="p4-garden" '+(show?'open':'')+'><summary><span><strong>Quiet garden</strong><small>A calm view of your recorded study sessions</small></span><span aria-hidden="true">⌄</span></summary>'+
 '<div class="p4-garden-content"><div class="p4-scene" aria-label="Decorative living garden with gentle motion">'+scene+'</div>'+
 '<div class="p4-garden-info"><span class="focus-room-overline">THIS WEEK</span><h2>'+p.active+' of 7 days</h2><p>'+p.total+' minutes logged. The garden is a reflection of your study history, not a score or obligation.</p>'+
 '<div class="p4-days" aria-label="Study activity over the last seven days">'+milestones+'</div>'+
 '<p class="p4-quiet">'+(growth?'Every completed session counts. Missed days never undo progress.':'Your garden is here whenever you want to begin.')+'</p>'+
 '<div class="p4-links"><button type="button" data-tab="recall">Review flashcards</button><button type="button" data-tab="connections">Connect ideas</button></div></div></div></details>';
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-p4="day"]');if(!btn)return;
 e.preventDefault();
 const p=progress(),i=p.week.indexOf(btn.dataset.day);if(i<0)return;
 core.toast(Math.round(p.mins[i])+' minutes logged on '+p.week[i]+'.');
});
document.addEventListener('toggle',e=>{if(e.target.matches?.('.p4-garden'))show=e.target.open},true);
window.PsychDeskPhase4={render,progress};
})();
