/* Phase 6: one calm next action. All suggestions are derived from existing records.
   Never changes tasks, reviews, sessions or account data automatically. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,d=()=>core.getData();
const choices=()=>{
 const data=d(),today=core.today();
 const tasks=(data.tasks||[]).filter(t=>t?.id&&!t.done).slice().sort((a,b)=>
  String(a.due||'9999-12-31').localeCompare(String(b.due||'9999-12-31')));
 const due=(data.cards||[]).filter(c=>c?.id&&(!c.due||c.due<=today));
 const chapters=window.PsychDeskPhase5?.chapters?.()||[];
 const out=[];
 if(tasks.length){const task=tasks[0];out.push({type:'task',id:task.id,title:task.title||'Your next topic',
  detail:(data.subjects||[]).find(s=>s.id===task.subjectId)?.name||'From your study plan',
  action:'Study this topic'});}
 if(due.length)out.push({type:'recall',title:'Review '+Math.min(due.length,10)+' flashcards',
  detail:due.length+' cards due · your existing review schedule',action:'Start review'});
 if(chapters.length){const chapter=chapters[0];out.push({type:'chapter',id:chapter.note.id,
  title:chapter.source.originalName||chapter.note.title||'Prepared chapter',
  detail:'Return to an outline you already prepared',action:'Open chapter outline'});}
 const session=window.PsychDeskSession?.getResume?.();
 if(session&&session.tab==='reader')out.push({type:'resume',title:session.title||'Continue reading',
  detail:'Page '+session.page+' · saved on this device',action:'Continue reading'});
 if(!out.length)out.push({type:'focus',title:'Begin with one focused session',
  detail:'No tasks or reviews need your attention right now.',action:'Open Focus Room'});
 return out;
};
let selected=0;
function render(){
 const options=choices(),current=options[Math.min(selected,options.length-1)];selected=Math.min(selected,options.length-1);
 return '<section class="p3-panel p6-panel"><div class="p6-heading"><div><span class="focus-room-overline">A SIMPLE PLACE TO BEGIN</span><h2>Just one next step.</h2><p class="p3-muted">Based on your saved study plan, due flashcards and prepared chapters. You choose what happens next.</p></div></div>'+
 '<div class="p6-choice"><span class="p6-kind">'+h(current.type==='task'?'FROM YOUR PLAN':current.type==='recall'?'READY TO REVIEW':current.type==='chapter'?'PREPARED CHAPTER':current.type==='resume'?'CONTINUE READING':'FOCUS TIME')+'</span>'+
 '<h3>'+h(current.title)+'</h3><p>'+h(current.detail)+'</p><button class="primary" type="button" data-p6="go">'+h(current.action)+' →</button></div>'+
 (options.length>1?'<div class="p6-alternatives"><span>Or choose something else</span><div>'+options.map((item,i)=>'<button type="button" data-p6="choose" data-index="'+i+'" aria-pressed="'+(selected===i)+'">'+h(item.type==='task'?'Study plan':item.type==='recall'?'Flashcards':item.type==='chapter'?'Chapter':item.type==='resume'?'Reading':'Focus')+'</button>').join('')+'</div></div>':'')+
 '<p class="p3-muted">Nothing starts automatically. Your existing data and study schedule remain unchanged.</p>'+(window.PsychDeskPhase8?.render?.()||'')+'</section>';
}
function go(){
 const item=choices()[selected];if(!item)return;
 if(item.type==='task'){core.setTab('planner');core.toast('Your next topic is in your study plan.');}
 else if(item.type==='recall')core.setTab('recall');
 else if(item.type==='chapter'){
  const note=(d().notes||[]).find(n=>n.id===item.id);
  if(!note)return core.toast('This chapter is no longer available.');
  core.setTab('notes');window.PsychDeskCloud?.noteEditor?.(note);
 }else if(item.type==='resume')window.PsychDeskSession?.resume?.();
 else core.setTab('focus');
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-p6]');if(!b)return;e.preventDefault();
 if(b.dataset.p6==='choose'){const index=Number(b.dataset.index);if(Number.isInteger(index)&&index>=0&&index<choices().length){selected=index;core.render();}}
 if(b.dataset.p6==='go')go();
});
window.addEventListener('psychdesk:session-reset',()=>{selected=0;});
window.PsychDeskPhase6={render,choices};
})();
