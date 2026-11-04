/* Phase 8 — optional weekly reflection, derived from existing study history.
   Never writes records or creates a goal, score, streak, or notification. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,d=()=>core.getData();
const recentDays=()=>{
 const [year,month,day]=String(core.today()).split('-').map(Number);
 if(!year||!month||!day)return [];
 const start=new Date(year,month-1,day,12);
 return Array.from({length:7},(_,i)=>{
  const date=new Date(start);date.setDate(start.getDate()-(6-i));
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 });
};
const summary=()=>{
 const days=recentDays(),set=new Set(days),data=d();
 const sessions=Array.isArray(data.sessions)?data.sessions:[],reviews=Array.isArray(data.reviews)?data.reviews:[];
 const minutesByDay=days.map(day=>sessions.reduce((sum,s)=>{
  const value=Number(s?.minutes);
  return sum+(s?.day===day&&Number.isFinite(value)&&value>0?value:0);
 },0));
 const reviewCount=reviews.filter(r=>set.has(r?.day)&&r?.cardId&&['again','hard','good','easy'].includes(r.rating)).length;
 return {days,minutesByDay,totalMinutes:Math.round(minutesByDay.reduce((a,b)=>a+b,0)),
  activeDays:minutesByDay.filter(x=>x>0).length,reviewCount};
};
function render(){
 const s=summary();
 const cells=s.days.map((day,i)=>{
  const value=Math.round(s.minutesByDay[i]);
  return '<div class="p8-day'+(value?' p8-active':'')+'" aria-label="'+h(day)+': '+value+' minutes"><span aria-hidden="true">'+(value?'●':'·')+'</span><small>'+h(new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}))+'</small></div>';
 }).join('');
 return '<details class="p8-reflection"><summary><span>Looking back at this week</span><span aria-hidden="true">⌄</span></summary>'+
 '<div class="p8-body"><p class="p3-muted">A quiet reflection on recorded activity, not a performance score.</p>'+
 '<div class="p8-numbers"><div><strong>'+s.totalMinutes+'</strong><span>minutes logged</span></div><div><strong>'+s.activeDays+'</strong><span>days with sessions</span></div><div><strong>'+s.reviewCount+'</strong><span>flashcard ratings</span></div></div>'+
 '<div class="p8-week" role="group" aria-label="Last seven days of logged study">'+cells+'</div>'+
 '<p class="p3-muted">'+(s.totalMinutes||s.reviewCount?'Your saved activity is here whenever you want to look back.':'Nothing logged this week. You can begin whenever you like.')+' No streaks, penalties or extra tasks.</p></div></details>';
}
window.PsychDeskPhase8={render,summary,recentDays};
})();