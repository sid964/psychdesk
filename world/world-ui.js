/* HTML navigation works even if WebGL, graphics drivers or CDN fail. */
(()=>{'use strict';
const allowed=new Set(['notes','materials','garden','recall','dictionary','focus']);
function visit(tab){
 if(!allowed.has(tab))return;
 if(window.parent!==window){
  window.parent.postMessage({type:'psychworld:visit',tab},location.origin);
 }else location.href='../index.html#pd-'+tab;
}
function close(){
 if(window.parent!==window)window.parent.postMessage({type:'psychworld:close'},location.origin);
 else location.href='../index.html#pd-today';
}
document.addEventListener('click',event=>{
 const tab=event.target.closest?.('[data-visit]')?.dataset.visit;
 if(tab)visit(tab);
});
document.getElementById('worldClose').addEventListener('click',close);
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 if(!detail.hidden){detail.hidden=true;document.getElementById('worldClose').focus();}
 else close();
});
const detail=document.getElementById('worldDetail'),detailVisit=document.getElementById('worldDetailVisit');
document.getElementById('worldDetailClose').addEventListener('click',()=>detail.hidden=true);
function showDetail(title,body,destination){
 document.getElementById('worldDetailTitle').textContent=String(title||'A small discovery');
 document.getElementById('worldDetailText').textContent=String(body||'');
 detailVisit.hidden=!allowed.has(destination);
 detailVisit.dataset.visit=allowed.has(destination)?destination:'';
 detailVisit.textContent=destination==='dictionary'?'Open Psychology Dictionary':'Open '+String(title||'study space');
 detail.hidden=false;
 detail.querySelector('#worldDetailClose')?.focus();
}
window.PsychDeskWorldUI={visit,close,showDetail};
})();
