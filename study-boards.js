/* PsychDesk Study Board and Psychology Mind Maps. Native pointer drag, account-synced JSON. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,$=q=>document.querySelector(q),d=()=>core.getData();
const board=()=>Array.isArray(d().boardItems)?d().boardItems:[];
const maps=()=>Array.isArray(d().mindMaps)?d().mindMaps:[];
const allStickies=()=>Array.isArray(d().stickies)?d().stickies:[];
const limit=(x,min,max)=>Math.max(min,Math.min(max,x));
let currentMap='',linkFrom='',selectedNode='',drag=null;
function boardCard(x){
 const sticky=allStickies().find(n=>n.id===x.stickyId);
 const text=x.kind==='sticky'?(sticky?sticky.title+'\n'+(sticky.lines||[]).join('\n'):'Sticky removed from your wall'):x.text;
 return '<article class="board-card '+(x.kind==='sticky'?'board-attached':'')+'" style="left:'+limit(Number(x.x)||0,0,87)+'%;top:'+limit(Number(x.y)||0,0,86)+'%" data-board-id="'+h(x.id)+'" tabindex="0" aria-label="Draggable board item">'+
 '<div class="board-grip" data-drag-board="'+h(x.id)+'" title="Drag to rearrange">⠿ <span>Drag</span></div>'+
 '<p>'+h(String(text||'').slice(0,800))+'</p>'+
 '<div class="board-item-footer"><button data-board="edit" data-id="'+h(x.id)+'">Edit</button><button data-board="remove" data-id="'+h(x.id)+'">×</button></div></article>';
}
function renderBoard(){
 const items=board();const selected=allStickies().filter(n=>!items.some(b=>b.stickyId===n.id));
 return '<section class="hero"><div class="eyebrow">ARRANGE WHAT MATTERS</div><h1>Your study board.</h1><p>Pin ideas, move cards, and make your own visual study wall.</p></section>'+
 '<div class="board-top"><button class="primary" data-board="add">+ Add idea card</button><select id="pinSticky" aria-label="Choose a sticky to pin"><option value="">Pin an existing sticky…</option>'+
 selected.map(n=>'<option value="'+h(n.id)+'">'+h(n.title)+'</option>').join('')+'</select><button data-board="pin" class="secondary">Pin sticky</button><button data-board="clear" class="secondary">Clear board</button></div>'+
 '<p class="study-legal">Drag cards by their handles. Positions and card text sync with your study account; the original sticky notes remain unchanged.</p>'+
 '<div class="board-canvas" id="boardCanvas" aria-label="Drag-and-drop study board">'+(items.length?items.map(boardCard).join(''):'<div class="board-empty">✳<br><strong>Your board starts here.</strong><br>Add an idea or pin one of your handwritten sticky notes.</div>')+'</div>';
}
function boardAdd(){
 const text=prompt('Write a short idea for your board (up to 500 characters):','');
 if(!text?.trim())return;
 d().boardItems=board().concat({id:core.id(),kind:'note',text:text.trim().slice(0,500),x:12+(board().length%5)*14,y:12+(board().length%4)*17,createdAt:new Date().toISOString()});
 core.save();core.render();
}
function boardPin(){
 const id=$('#pinSticky')?.value;
 if(!id||!allStickies().some(n=>n.id===id)){core.toast('Choose an existing sticky note.');return;}
 d().boardItems=board().concat({id:core.id(),kind:'sticky',stickyId:id,x:12+(board().length%5)*14,y:12+(board().length%4)*17});
 core.save();core.render();
}
function mapSelect(){
 const list=maps();
 if(!currentMap||!list.find(m=>m.id===currentMap))currentMap=list[0]?.id||'';
 return list.find(m=>m.id===currentMap)||null;
}
function nodeHTML(n){
 return '<button type="button" class="mind-node'+(selectedNode===n.id?' selected':'')+(linkFrom===n.id?' connecting':'')+'" data-mind-node="'+h(n.id)+'" style="left:'+limit(Number(n.x),3,92)+'%;top:'+limit(Number(n.y),4,88)+'%" aria-label="Concept: '+h(n.label)+'">'+
 '<span class="mind-grip" data-drag-mind="'+h(n.id)+'" aria-hidden="true">⠿</span><span>'+h(n.label)+'</span></button>';
}
function renderMind(){
 const list=maps(),map=mapSelect();
 return '<section class="hero"><div class="eyebrow">CONNECT THE CONCEPTS</div><h1>Mind maps.</h1><p>Build interactive maps of theories, researchers, experiments and their relationships.</p></section>'+
 '<div class="mind-top"><select id="mindMapSelect" aria-label="Select mind map"><option value="">Choose a map…</option>'+list.map(m=>'<option value="'+h(m.id)+'"'+(m.id===currentMap?' selected':'')+'>'+h(m.title)+'</option>').join('')+'</select>'+
 '<button data-mind="newMap" class="primary">+ New map</button>'+
 (map?'<button data-mind="newNode" class="secondary">+ Concept</button><button data-mind="link" class="secondary">'+(linkFrom?'Choose another concept':'Connect concepts')+'</button><button data-mind="deleteMap" class="secondary">Delete map</button>':'')+'</div>'+
 (map?'<div class="mind-board"><svg id="mindEdges" aria-hidden="true" preserveAspectRatio="none"></svg>'+
 map.nodes.map(nodeHTML).join('')+'</div><div class="mind-bottom"><span id="mindHint">'+(linkFrom?'Select a second concept to create a connection.':'Drag concepts to rearrange. Select a concept to edit or connect it.')+'</span>'+
 '<button data-mind="editNode" '+(!selectedNode?'disabled':'')+'>Rename selected</button><button data-mind="removeNode" '+(!selectedNode?'disabled':'')+'>Remove selected</button></div>'+
 '<div class="mind-description"><strong>'+h(map.title)+'</strong> · '+map.nodes.length+' concepts · '+map.edges.length+' connections</div>':'<div class="study-empty">Create your first concept map. For example: “Memory Systems” or “Psychological Assessment”.</div>');
}
function drawEdges(){
 const map=mapSelect(),svg=$('#mindEdges'),surface=$('.mind-board');if(!map||!svg||!surface)return;
 svg.setAttribute('viewBox','0 0 '+surface.clientWidth+' '+surface.clientHeight);
 svg.setAttribute('width','100%');svg.setAttribute('height','100%');
 const w=surface.clientWidth,height=surface.clientHeight;
 svg.innerHTML=map.edges.map(e=>{
  const from=map.nodes.find(n=>n.id===e.from),to=map.nodes.find(n=>n.id===e.to);
  if(!from||!to)return '';
  const x1=from.x*w/100+62,y1=from.y*height/100+24,x2=to.x*w/100+62,y2=to.y*height/100+24;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#959595" stroke-width="2" stroke-linecap="round"/>';
 }).join('');
}
function makeMap(){
 const title=prompt('Name your new psychology mind map:','Memory systems');
 if(!title?.trim())return;
 const map={id:core.id(),title:title.trim().slice(0,90),nodes:[],edges:[]};
 d().mindMaps=maps().concat(map);currentMap=map.id;selectedNode='';linkFrom='';core.save();core.render();drawEdges();
}
function addNode(){
 const map=mapSelect();if(!map)return;
 const text=prompt('Concept, theory, researcher or finding:','');
 if(!text?.trim())return;
 if(map.nodes.length>=55){core.toast('Maps are limited to 55 concepts for performance.');return;}
 map.nodes.push({id:core.id(),label:text.trim().slice(0,90),x:9+(map.nodes.length%5)*17,y:11+(Math.floor(map.nodes.length/5)%4)*20});
 core.save();core.render();drawEdges();
}
function selectNode(id){
 const map=mapSelect();if(!map)return;
 if(linkFrom&&linkFrom!==id){
  if(!map.edges.some(e=>(e.from===linkFrom&&e.to===id)||(e.from===id&&e.to===linkFrom))){
   map.edges.push({id:core.id(),from:linkFrom,to:id});core.save();
  }
  linkFrom='';selectedNode=id;core.render();drawEdges();return;
 }
 if(linkFrom===id){linkFrom='';selectedNode=id;core.render();drawEdges();return;}
 selectedNode=id;
 $('.mind-node.selected')?.classList.remove('selected');
 const btn=document.querySelector('[data-mind-node="'+id+'"]');
 btn?.classList.add('selected');
 const rename=$('[data-mind="editNode"]'),del=$('[data-mind="removeNode"]');
 if(rename)rename.disabled=false;if(del)del.disabled=false;
}
function renameNode(){
 const node=mapSelect()?.nodes.find(n=>n.id===selectedNode);if(!node)return;
 const value=prompt('Rename this concept:',node.label);if(!value?.trim())return;
 node.label=value.trim().slice(0,90);core.save();core.render();drawEdges();
}
function removeNode(){
 const map=mapSelect();if(!map||!selectedNode)return;
 if(!confirm('Remove the selected concept and its connections?'))return;
 map.nodes=map.nodes.filter(n=>n.id!==selectedNode);
 map.edges=map.edges.filter(e=>e.from!==selectedNode&&e.to!==selectedNode);
 selectedNode='';linkFrom='';core.save();core.render();drawEdges();
}
function dragStart(event,selector,kind){
 const grip=event.target.closest(selector);if(!grip||event.button!==0)return;
 const surface=kind==='board'?$('#boardCanvas'):$('.mind-board');if(!surface)return;
 const el=grip.closest(kind==='board'?'.board-card':'.mind-node');
 const id=kind==='board'?el?.dataset.boardId:el?.dataset.mindNode;
 const rec=kind==='board'?board().find(x=>x.id===id):mapSelect()?.nodes.find(n=>n.id===id);
 if(!rec||!el)return;
 drag={kind,id,el,surface,rec,startX:event.clientX,startY:event.clientY,moved:false};
 el.setPointerCapture?.(event.pointerId);event.preventDefault();
}
function dragMove(event){
 if(!drag)return;
 const b=drag.surface.getBoundingClientRect(),x=limit((event.clientX-b.left)/b.width*100,0,drag.kind==='board'?83:82),
 y=limit((event.clientY-b.top)/b.height*100,0,drag.kind==='board'?83:85);
 if(Math.abs(event.clientX-drag.startX)+Math.abs(event.clientY-drag.startY)>4)drag.moved=true;
 if(!drag.moved)return;
 drag.rec.x=Math.round(x*10)/10;drag.rec.y=Math.round(y*10)/10;
 drag.el.style.left=drag.rec.x+'%';drag.el.style.top=drag.rec.y+'%';
 if(drag.kind==='mind')drawEdges();
}
function dragEnd(){
 if(!drag)return;
 if(drag.moved)core.save();
 drag=null;
}
document.addEventListener('pointerdown',e=>{
 if(e.target.closest('[data-drag-board]'))dragStart(e,'[data-drag-board]','board');
 if(e.target.closest('[data-drag-mind]'))dragStart(e,'[data-drag-mind]','mind');
});
document.addEventListener('pointermove',dragMove);
document.addEventListener('pointerup',dragEnd);
document.addEventListener('pointercancel',dragEnd);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-board],[data-mind],[data-mind-node]');if(!b)return;
 e.preventDefault();
 if(b.dataset.mindNode){if(drag?.moved)return;selectNode(b.dataset.mindNode);return;}
 if(b.dataset.board){
  switch(b.dataset.board){
  case 'add':boardAdd();break;case 'pin':boardPin();break;
  case 'edit':{const item=board().find(x=>x.id===b.dataset.id);if(!item)return;
   const value=prompt('Edit idea:',item.kind==='sticky'?(allStickies().find(n=>n.id===item.stickyId)?.title||''):item.text);
   if(!value?.trim())return;
   item.kind='note';delete item.stickyId;item.text=value.trim().slice(0,500);core.save();core.render();break;}
  case 'remove':d().boardItems=board().filter(x=>x.id!==b.dataset.id);core.save();core.render();break;
  case 'clear':if(confirm('Clear this board? Original stickies remain saved.')){d().boardItems=[];core.save();core.render();}break;
  }
 }
 if(b.dataset.mind){
  switch(b.dataset.mind){
   case 'newMap':makeMap();break;case 'newNode':addNode();break;
   case 'link':if(!selectedNode){core.toast('Select a concept first.');break;}linkFrom=selectedNode;core.render();drawEdges();break;
   case 'editNode':renameNode();break;case 'removeNode':removeNode();break;
   case 'deleteMap':if(confirm('Delete this map and all its concepts?')){d().mindMaps=maps().filter(m=>m.id!==currentMap);currentMap='';selectedNode='';linkFrom='';core.save();core.render();}break;
  }
 }
});
document.addEventListener('change',e=>{
 if(e.target?.id==='mindMapSelect'){currentMap=e.target.value;selectedNode='';linkFrom='';core.render();drawEdges();}
});
window.addEventListener('resize',()=>{if($('.mind-board'))drawEdges();});
window.addEventListener('psychdesk:session-reset',()=>{currentMap='';selectedNode='';linkFrom='';drag=null;});
window.PsychDeskBoards={renderBoard,renderMind,drawEdges};
})();