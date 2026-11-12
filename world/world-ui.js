/* Navigation works with or without WebGL, a GPU, or the 3D CDN. */
(()=>{'use strict';
const allowed=new Set(['notes','materials','garden','recall','dictionary','focus']);
function visit(tab){
 if(!allowed.has(tab))return;
 if(window.parent!==window)window.parent.postMessage({type:'psychworld:visit',tab},location.origin);
 else location.href='../index.html';
}
function close(){
 if(window.parent!==window)window.parent.postMessage({type:'psychworld:close'},location.origin);
 else location.href='../index.html';
}
document.addEventListener('click',event=>{
 const tab=event.target.closest?.('[data-visit]')?.dataset.visit;
 if(tab)visit(tab);
});
document.getElementById('worldClose').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
window.PsychDeskWorldUI={visit,close};
})();
