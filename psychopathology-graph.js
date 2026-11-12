/* PsychDesk Psychopathology: source-grounded interactive knowledge graph.
 * No third-party graphics engine, runtime AI, or remote requests.
 */
(()=>{'use strict';
const core=window.PsychDeskCore,source=window.PsychDeskPsychopathologyContent;
if(!core||!source)return;
const NS='http://www.w3.org/2000/svg',W=1100,H=700,chapters=source.chapters,topics=source.topics;
const safe=core.esc,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const nodes=[{id:'course',type:'course',title:'Psychopathology',label:'Psychopathology'}]
 .concat(chapters.map(c=>({id:c.id,type:'chapter',chapter:c.number,title:c.title,label:'Chapter '+c.number})))
 .concat(topics.map(t=>({...t,id:'t-'+t.id,type:'topic',label:t.title})));
const nodeById=new Map(nodes.map(n=>[n.id,n]));
const edges=chapters.map(c=>({from:'course',to:c.id,kind:'chapter'}))
 .concat(topics.map(t=>({from:t.parent?'t-'+t.parent:'ch'+t.chapter,to:'t-'+t.id,kind:'hierarchy'})))
 .concat(source.links.map(([a,b])=>({from:a.startsWith('ch')?a:'t-'+a,to:b.startsWith('ch')?b:'t-'+b,kind:'related'})));
let selected='t-definition',chapter='all',mode='global',search='',transform={x:0,y:0,z:1};
let positions={},root=null,svg=null,raf=0,pointer=null,accountKey='',progress={completed:[],last:''};
const ns=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));return el;};
const account=()=>{try{return String(core.getStorageKey()||'psychdesk-v1')}catch{return 'psychdesk-v1'}};
const progressKey=()=> 'psychdesk-psychopathology-course-v1:'+account();
function loadProgress(){
 const key=progressKey();if(key===accountKey)return;
 accountKey=key;progress={completed:[],last:''};selected='t-definition';
 try{const data=JSON.parse(localStorage.getItem(key)||'{}');if(Array.isArray(data.completed))progress.completed=data.completed.filter(x=>typeof x==='string');if(typeof data.last==='string'&&nodeById.has(data.last))progress.last=data.last;}catch{}
 if(progress.last)selected=progress.last;
}
function saveProgress(){
 try{localStorage.setItem(progressKey(),JSON.stringify(progress));return true}catch{core.toast('This browser could not save course progress.');return false}
}
function position(n){
 if(positions[n.id])return positions[n.id];
 if(n.type==='course')return positions[n.id]={x:W/2,y:H/2,vx:0,vy:0,pinned:true};
 if(n.type==='chapter'){const angle=(n.chapter-1)*Math.PI*2/16-Math.PI/2;return positions[n.id]={x:W/2+320*Math.cos(angle),y:H/2+235*Math.sin(angle),vx:0,vy:0};}
 const index=topics.findIndex(t=>'t-'+t.id===n.id),a=index*2.4;
 const base=position(nodeById.get(n.parent?'t-'+n.parent:'ch'+n.chapter));
 return positions[n.id]={x:clamp(base.x+85*Math.cos(a),40,W-40),y:clamp(base.y+75*Math.sin(a),40,H-40),vx:0,vy:0};
}
function visible(){
 let ids=new Set();
 if(chapter==='all')nodes.forEach(n=>ids.add(n.id));
 else {ids.add('ch'+chapter);topics.filter(t=>t.chapter===Number(chapter)).forEach(t=>ids.add('t-'+t.id));}
 if(mode==='local'){
  const focus=selected;
  const near=new Set([focus]);
  edges.forEach(e=>{if(e.from===focus)near.add(e.to);if(e.to===focus)near.add(e.from);});
  ids=new Set([...ids].filter(id=>near.has(id)));
  if(!ids.size)ids=new Set([focus]);
 }
 return nodes.filter(n=>ids.has(n.id));
}
function activeEdges(ids){return edges.filter(e=>ids.has(e.from)&&ids.has(e.to));}
function html(){
 loadProgress();
 const ready=topics.filter(t=>t.kind==='lesson').length,done=progress.completed.filter(id=>topics.some(t=>t.id===id&&t.kind==='lesson')).length;
 return '<section class="psycourse" id="psyCourse">'+
 '<nav class="psycourse-breadcrumb" aria-label="Psychology subject navigation"><button type="button" data-tab="psychology">← Overall psychology learning</button><span aria-hidden="true">/</span><span>Psychopathology</span></nav><header class="psycourse-heading"><div><div class="eyebrow">OVERALL PSYCHOLOGY · TEXTBOOK SUBJECT</div><h1>Psychopathology</h1><p>Learn in layers. Explore concepts as a connected knowledge graph.</p></div><div class="psycourse-count"><strong>16</strong><span>chapters</span></div></header>'+
 '<div class="psycourse-progress" role="status">'+done+' of '+ready+' introductory lessons completed on this device <span aria-hidden="true">·</span> '+source.edition+'</div>'+
 '<div class="psycourse-layout"><div class="psycourse-map">'+
 '<div class="psycourse-tools"><label class="psycourse-search"><span class="sr-only">Search course concepts</span><input id="psyGraphSearch" type="search" value="'+safe(search)+'" placeholder="Find a concept…" autocomplete="off"></label>'+
 '<select id="psyGraphChapter" aria-label="Filter by chapter"><option value="all">All 16 chapters</option>'+chapters.map(c=>'<option value="'+c.number+'"'+(chapter===String(c.number)?' selected':'')+'>Chapter '+c.number+'</option>').join('')+'</select>'+
 '<button type="button" id="psyGraphMode" aria-pressed="'+(mode==='local'?'true':'false')+'" title="Show selected topic and immediate neighbors">'+(mode==='local'?'Global graph':'Local graph')+'</button></div>'+
 '<div class="psycourse-stage"><svg id="psyGraph" viewBox="0 0 '+W+' '+H+'" aria-label="Interactive concept graph. Drag to pan, scroll to zoom, select nodes to open lessons." role="group"></svg><div class="psycourse-zoom"><button type="button" data-psy-action="zoomIn" aria-label="Zoom in">+</button><button type="button" data-psy-action="zoomOut" aria-label="Zoom out">−</button><button type="button" data-psy-action="fit" aria-label="Reset graph view">Fit</button></div></div>'+
 '<div id="psyGraphResults" class="psycourse-results"></div><p class="psycourse-help">Drag empty space to pan · Scroll or use +/- to zoom · Drag a node to move it · Select a node to read</p></div>'+
 '<aside class="psycourse-detail" id="psyGraphDetail" aria-live="polite"></aside></div>'+
 '<section class="psycourse-outline"><h2>Textbook chapters</h2><div class="psycourse-chapter-list">'+chapters.map(c=>'<button type="button" data-psy-node="'+c.id+'"><span>'+String(c.number).padStart(2,'0')+'</span><span class="psycourse-chapter-title">'+safe(c.title)+'</span><small>p. '+c.startPage+'</small></button>').join('')+'</div></section>'+
 '<p class="psycourse-disclaimer">Academic source: Barlow, Durand & Hofmann, ninth edition (2023). Chapter 1 contains the first authored lessons; other chapters are mapped for future verified content. Lessons are original paraphrases, not a replacement copy of the textbook. Course progress currently stays on this device.</p></section>';
}
function textBlock(value){return '<p>'+safe(value)+'</p>';}
function detail(){
 if(!root)return;
 const target=root.querySelector('#psyGraphDetail'),n=nodeById.get(selected)||nodes[0],t=n.type==='topic'?topics.find(t=>'t-'+t.id===n.id):null;
 const completed=t&&progress.completed.includes(t.id);
 let body='<div class="psycourse-detail-overline">'+(n.type==='chapter'?'CHAPTER '+n.chapter:n.type==='course'?'COURSE OVERVIEW':'CHAPTER '+t.chapter+' · PAGE '+safe(t.page))+'</div><h2>'+safe(n.title)+'</h2>';
 if(n.type==='course'){
  body+='<p>Explore all 16 textbook chapters. Open a chapter or a connected concept to find its introductory lesson.</p><p>Only the verified Chapter 1 lessons are available so far.</p>';
 }else if(n.type==='chapter'){
  body+='<p>Chapter '+n.chapter+' of 16 from '+safe(source.book)+'. Starts on page '+n.startPage+'.</p>';
  if(n.chapter===1)body+='<p>Six introductory lessons are available. Select a connected concept to begin.</p>';
  else body+='<p class="psycourse-coming">This chapter is mapped from the table of contents. Detailed lessons have not yet been authored and checked against the textbook.</p>';
 }else if(t){
  body+='<div class="psycourse-level"><h3>01 · Understand simply</h3>'+textBlock(t.simple)+'</div>';
  if(t.advanced&&t.advanced.length)body+='<details class="psycourse-level psycourse-advanced"><summary>02 · Master’s-level explanation</summary>'+t.advanced.map(textBlock).join('')+'</details>';
  if(t.example)body+='<details class="psycourse-level"><summary>03 · Clinical case from the textbook</summary>'+textBlock(t.example)+(t.examplePage?'<p class="psycourse-ref">Case source: Chapter '+t.chapter+', pages '+safe(t.examplePage)+'.</p>':'')+'</details>';
  if(t.question)body+='<div class="psycourse-level psycourse-quiz"><h3>04 · Check understanding</h3><p>'+safe(t.question)+'</p>'+t.choices.map((choice,i)=>'<button type="button" data-psy-answer="'+i+'">'+safe(choice)+'</button>').join('')+'<p id="psyQuizFeedback" role="status"></p></div>';
  body+='<p class="psycourse-ref">Source: Chapter '+t.chapter+', pages '+safe(t.page)+'.</p>';
  if(t.kind==='lesson')body+='<div class="psycourse-detail-actions"><button type="button" data-psy-action="complete">'+(completed?'✓ Completed · Undo':'Mark lesson complete')+'</button>'+ (t.question?'<button type="button" data-psy-action="flashcard">Save question as flashcard</button>':'')+'</div>';
 }
 body+='<div class="psycourse-links"><h3>Connected topics</h3>';
 const adjacent=edges.filter(e=>e.from===n.id||e.to===n.id).map(e=>nodeById.get(e.from===n.id?e.to:e.from)).filter(Boolean);
 body+=(adjacent.length?adjacent.map(a=>'<button type="button" data-psy-node="'+a.id+'">'+safe(a.title)+'</button>').join(''):'<p>No connections are published for this topic yet.</p>')+'</div>';
 target.innerHTML=body;
 root.querySelectorAll('[data-psy-node]').forEach(b=>b.classList.toggle('is-selected',b.dataset.psyNode===selected));
}
function draw(){
 if(!svg||!svg.isConnected)return;
 const show=visible(),ids=new Set(show.map(n=>n.id)),links=activeEdges(ids),query=search.trim().toLowerCase();
 svg.replaceChildren();
 const surface=ns('g',{transform:'translate('+transform.x+' '+transform.y+') scale('+transform.z+')'});
 links.forEach(edge=>{
  const a=position(nodeById.get(edge.from)),b=position(nodeById.get(edge.to));
  surface.appendChild(ns('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'psycourse-edge '+(edge.kind==='related'?'psycourse-related':'')}));
 });
 show.forEach(n=>{
  const p=position(n),matched=!query||n.title.toLowerCase().includes(query);
  const g=ns('g',{'data-psy-id':n.id,role:'button',tabindex:0,'aria-label':'Open '+n.title,
   transform:'translate('+p.x+' '+p.y+')',class:'psycourse-node psycourse-'+n.type+(n.id===selected?' is-selected':'')+(!matched?' is-dim':'')});
  const r=n.type==='course'?31:n.type==='chapter'?18:12;
  g.appendChild(ns('circle',{r:r+9,class:'psycourse-hit'}));
  g.appendChild(ns('circle',{r,class:'psycourse-dot'}));
  const label=ns('text',{x:0,y:r+19,'text-anchor':'middle'});
  label.textContent=n.label.length>27?n.label.slice(0,26)+'…':n.label;
  g.appendChild(label);surface.appendChild(g);
 });
 svg.appendChild(surface);
 const result=root.querySelector('#psyGraphResults');
 if(result)result.innerHTML=query?'<strong>Search matches</strong> '+(nodes.filter(n=>n.title.toLowerCase().includes(query)).slice(0,20).map(n=>'<button type="button" data-psy-node="'+n.id+'">'+safe(n.title)+'</button>').join('')||'<span>No concepts match.</span>'):'';
}
function select(id){
 if(!nodeById.has(id))return;
 selected=id;if(nodeById.get(id).type==='topic'){progress.last=id;saveProgress();}if(mode==='local'){const p=position(nodeById.get(id));transform={x:W/2-p.x,y:H/2-p.y,z:1};}
 if(chapter!=='all'){const n=nodeById.get(id);if(n.type==='course'||(n.chapter&&String(n.chapter)!==chapter))chapter='all';}
 if(root){const box=root.querySelector('#psyGraphChapter');if(box)box.value=chapter;detail();draw();}
}
function tick(){
 raf=0;if(!svg||!svg.isConnected)return;
 const show=visible(),ids=new Set(show.map(n=>n.id)),links=activeEdges(ids);
 for(let i=0;i<show.length;i++)for(let j=i+1;j<show.length;j++){
  const a=position(show[i]),b=position(show[j]),dx=a.x-b.x,dy=a.y-b.y,d2=Math.max(350,dx*dx+dy*dy),d=Math.sqrt(d2);
  const force=Math.min(1.8,16500/d2);
  if(!a.pinned){a.vx+=dx/d*force;a.vy+=dy/d*force;}
  if(!b.pinned){b.vx-=dx/d*force;b.vy-=dy/d*force;}
 }
 links.forEach(edge=>{
  const a=position(nodeById.get(edge.from)),b=position(nodeById.get(edge.to));
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy));
  const ideal=edge.kind==='chapter'?245:edge.kind==='related'?185:135;
  const force=(d-ideal)*0.0015;
  if(!a.pinned){a.vx+=dx/d*force;a.vy+=dy/d*force;}
  if(!b.pinned){b.vx-=dx/d*force;b.vy-=dy/d*force;}
 });
 show.forEach(n=>{const p=position(n);if(p.pinned)return;
  p.vx=(p.vx+(W/2-p.x)*0.0004)*0.81;p.vy=(p.vy+(H/2-p.y)*0.0004)*0.81;
  p.x=clamp(p.x+p.vx,38,W-38);p.y=clamp(p.y+p.vy,36,H-40);
 });
 draw();
 if(++frames<90)raf=requestAnimationFrame(tick);
}
let frames=0;
function animate(){
 if(raf)cancelAnimationFrame(raf);
 frames=0;
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 raf=requestAnimationFrame(tick);
}
function zoomTo(z,cx=W/2,cy=H/2){
 const old=transform.z,next=clamp(z,0.45,3.2);
 transform.x=cx-(cx-transform.x)*next/old;transform.y=cy-(cy-transform.y)*next/old;transform.z=next;draw();
}
function flashcard(){
 const n=nodeById.get(selected),t=topics.find(x=>'t-'+x.id===n?.id);if(!t?.question)return;
 const data=core.getData(),id='psycourse-card-'+t.id;
 if(data.cards.some(c=>c.id===id)){core.toast('This lesson’s question is already in Flashcards.');return;}
 const saved=core.commitChange(()=>data.cards.push({
  id,subjectId:data.subjects.find(s=>s.id==='abnormal')?.id||data.subjects[0]?.id||'',
  question:t.question,answer:t.choices[t.correct]+' — '+t.reason,due:core.today(),interval:0
 }));
 if(saved)core.toast('Question saved to existing Flashcards.');
}
function action(which){
 if(which==='zoomIn')zoomTo(transform.z*1.2);
 if(which==='zoomOut')zoomTo(transform.z/1.2);
 if(which==='fit'){transform={x:0,y:0,z:1};draw();}
 if(which==='flashcard')flashcard();
 if(which==='complete'){
  const t=topics.find(x=>'t-'+x.id===selected);if(!t||t.kind!=='lesson')return;
  progress.completed=progress.completed.includes(t.id)?progress.completed.filter(x=>x!==t.id):progress.completed.concat(t.id);
  if(saveProgress()){const target=root.querySelector('.psycourse-progress');if(target)target.textContent=progress.completed.filter(id=>topics.some(t=>t.id===id&&t.kind==='lesson')).length+' of '+topics.filter(t=>t.kind==='lesson').length+' introductory lessons completed on this device · '+source.edition;detail();}
 }
}
function onPointerDown(e){
 if(e.button!==0)return;
 const node=e.target.closest('[data-psy-id]'),rect=svg.getBoundingClientRect();
 pointer={id:e.pointerId,node:node?.dataset.psyId||'',sx:e.clientX,sy:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,width:rect.width||1,height:rect.height||1};
 if(pointer.node){const p=position(nodeById.get(pointer.node));p.pinned=true;}
 if(raf)cancelAnimationFrame(raf);
 svg.setPointerCapture?.(e.pointerId);e.preventDefault();
}
function onPointerMove(e){
 if(!pointer||e.pointerId!==pointer.id)return;
 const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;
 if(Math.hypot(e.clientX-pointer.sx,e.clientY-pointer.sy)>5)pointer.moved=true;
 if(pointer.moved){
  if(pointer.node){const p=position(nodeById.get(pointer.node));p.x=clamp(p.x+dx*W/pointer.width/transform.z,25,W-25);p.y=clamp(p.y+dy*H/pointer.height/transform.z,25,H-25);}
  else{transform.x+=dx*W/pointer.width;transform.y+=dy*H/pointer.height;}
  draw();
 }
 pointer.lastX=e.clientX;pointer.lastY=e.clientY;
}
function onPointerEnd(e){
 if(!pointer||e.pointerId!==pointer.id)return;
 const p=pointer;pointer=null;
 if(p.node)position(nodeById.get(p.node)).pinned=false;
 if(e.type!=='pointercancel'&&p.node&&!p.moved)select(p.node);
 if(p.moved)animate();
}
function onWheel(e){
 e.preventDefault();
 const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)*W/(rect.width||1),y=(e.clientY-rect.top)*H/(rect.height||1);
 zoomTo(transform.z*(e.deltaY>0?0.88:1.12),x,y);
}
function mount(){
 root=document.getElementById('psyCourse');svg=root?.querySelector('#psyGraph');if(!root||!svg)return;
 loadProgress();
 root.addEventListener('click',e=>{
  const node=e.target.closest('[data-psy-node]');if(node){select(node.dataset.psyNode);return;}
  const a=e.target.closest('[data-psy-action]');if(a)action(a.dataset.psyAction);
  const ans=e.target.closest('[data-psy-answer]');
  if(ans){const t=topics.find(x=>'t-'+x.id===selected);if(!t?.question)return;
   const correct=Number(ans.dataset.psyAnswer)===t.correct;
   const feedback=root.querySelector('#psyQuizFeedback');
   if(feedback)feedback.textContent=(correct?'Correct. ':'Try again. ')+t.reason;
   root.querySelectorAll('[data-psy-answer]').forEach(b=>b.setAttribute('aria-pressed',b===ans?'true':'false'));
  }
 });
 root.querySelector('#psyGraphChapter').addEventListener('change',e=>{chapter=e.target.value;mode='global';root.querySelector('#psyGraphMode').textContent='Local graph';root.querySelector('#psyGraphMode').setAttribute('aria-pressed','false');draw();});
 root.querySelector('#psyGraphMode').addEventListener('click',e=>{mode=mode==='global'?'local':'global';e.target.textContent=mode==='local'?'Global graph':'Local graph';e.target.setAttribute('aria-pressed',mode==='local'?'true':'false');if(mode==='local'){const p=position(nodeById.get(selected));transform={x:W/2-p.x,y:H/2-p.y,z:1};}else transform={x:0,y:0,z:1};draw();});
 root.querySelector('#psyGraphSearch').addEventListener('input',e=>{search=e.target.value.slice(0,100);draw();});
 svg.addEventListener('pointerdown',onPointerDown);
 svg.addEventListener('pointermove',onPointerMove);
 svg.addEventListener('pointerup',onPointerEnd);
 svg.addEventListener('pointercancel',onPointerEnd);
 svg.addEventListener('wheel',onWheel,{passive:false});
 svg.addEventListener('keydown',e=>{const n=e.target.closest('[data-psy-id]');if(n&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(n.dataset.psyId);}});
 detail();draw();animate();
}
window.PsychDeskPsychopathology={render:html,mount,chapters:()=>chapters.slice(),topics:()=>topics.slice()};
})();