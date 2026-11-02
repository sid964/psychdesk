/* Bounded, ephemeral speech. Revalidate context before every queued message. */
(()=>{'use strict';
window.PsychDeskCompanionBubbles=({hint,text,allowed,place})=>{
 let queue=[],timer=0;
 function clear(){clearTimeout(timer);timer=0;queue=[];hint.hidden=true;text.textContent='';}
 function next(){
  clearTimeout(timer);timer=0;hint.hidden=true;text.textContent='';
  if(!allowed()){queue=[];return;}
  const item=queue.shift();if(!item)return;
  hint.dataset.tone=item.tone;hint.hidden=false;place();
  // Keep the live region mounted; announce only after the bubble is exposed.
  text.textContent=item.message;timer=setTimeout(next,item.ms);
 }
 return {clear,say(message,ms=3200,tone='guidance'){
  if(!allowed())return;
  const item={message:String(message).slice(0,180),ms:Math.max(2000,Math.min(ms,4000)),tone};
  if(queue.some(x=>x.message===item.message)||text.textContent===item.message)return;
  queue=queue.slice(-1);queue.push(item);if(!timer)next();
 }};
};
})();
