/* A tiny truthful Drive status chip, kept independent of the Firebase sync badge. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const cloud=()=>window.PsychDeskCloud,auth=()=>window.PsychDeskFirebase;
let busy=false;
function update(){
 const node=$('#driveStatusChip');if(!node)return;
 const signed=Boolean(auth()?.getUserId?.()),connected=signed&&Boolean(cloud()?.isConnected?.());
 node.dataset.state=!signed?'signed-out':connected?'ready':busy?'connecting':'reconnect';
 const label=!signed?'Sign in for Drive':connected?'Drive connected':busy?'Checking Drive…':'Drive reconnect';
 node.title=label;node.setAttribute('aria-label',label);
 if(!node.querySelector('.drive-orbit'))node.innerHTML='<span class="drive-orbit" aria-hidden="true"><span class="drive-orbit-ring"></span><span class="drive-orbit-center"></span></span><span class="drive-chip-label"></span>';
 const text=connected?'Drive ✓':busy?'Drive…':signed?'Drive ↻':'Drive';
 const caption=node.querySelector('.drive-chip-label');if(caption.textContent!==text)caption.textContent=text;
}
async function click(){
 if(busy)return;
 if(!auth()?.getUserId?.()){auth()?.openAccount?.();return;}
 if(cloud()?.isConnected?.()){cloud()?.openSettings?.();return;}
 busy=true;update();
 try{
  await cloud()?.connectDrive?.();
  await cloud()?.verifyDriveConnection?.();
  window.PsychDeskCore?.toast?.('Google Drive is connected.');
 }catch(error){
  window.PsychDeskCore?.toast?.(String(error?.message||error).slice(0,130));
 }finally{busy=false;update();}
}
document.addEventListener('click',event=>{if(event.target.closest('#driveStatusChip')){event.preventDefault();void click();}});
window.addEventListener('psychdesk:drive-connected',update);
window.addEventListener('psychdesk:drive-disconnected',update);
window.addEventListener('psychdesk:account-ready',update);
window.addEventListener('psychdesk:login-complete',update);
window.addEventListener('psychdesk:session-reset',update);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')update()});
// Local status only; no network polling or repeated animation recreation.
setInterval(()=>{if(!document.hidden)update();},1000);
update();
window.PsychDeskDriveIndicator={update};
})();