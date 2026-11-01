/* PsychDesk Sticky Notes Studio — instant, local, handwritten paper notes. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const esc=core.esc, LIMIT=4500, LINE_WIDTH=65, LINES_PER_CARD=5;
const palette=[['butter','#F8E8B5'],['rose','#F4DADD'],['sky','#DDE9FA'],['lilac','#E8DDF5'],['cream','#F1E5CD']];
const paperColor=id=>palette.find(p=>p[0]===id)?.[1]||palette[0][1];
let groupId='',heading='',raw='',subjectId='',paper='butter',filter='all',autosave=null;
const $=query=>document.querySelector(query);
const all=()=>Array.isArray(core.getData().stickies)?core.getData().stickies:[];
const bucket=id=>all().filter(n=>(n.groupId||n.id)===id).sort((a,b)=>(a.part||0)-(b.part||0));
function splitLong(text){
 const rows=[];let line='';
 for(const word of text.trim().split(/\s+/).filter(Boolean)){
  if(line && (line+' '+word).length>LINE_WIDTH){rows.push(line);line='';}
  if(word.length>LINE_WIDTH){if(line){rows.push(line);line='';}
   for(let i=0;i<word.length;i+=LINE_WIDTH)rows.push(word.slice(i,i+LINE_WIDTH));
  }else line=line?line+' '+word:word;
 }
 if(line)rows.push(line);
 return rows;
}
function paragraphs(value){
 const rows=[];
 String(value).replace(/\r/g,'').trim().split(/\n+/).forEach(p=>{
  p=p.trim().replace(/^([-*•]\s+|\d+[.)]\s+)/,'');if(!p)return;
  p.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).forEach(s=>rows.push(...splitLong(s)));
 });
 return rows;
}
function titleFor(text,title){
 if(title.trim())return title.trim().slice(0,70);
 const first=text.trim().split('\n')[0]||'Quick thought';
 return first.length<=46?first:first.slice(0,43).replace(/\s+\S*$/,'')+'…';
}
function generate(text,title,subject,color,id,previous=[]){
 const source=String(text).replace(/\r/g,'').trim().slice(0,LIMIT);if(!source)return[];
 const name=titleFor(source,title),lines=paragraphs(source),blocks=[];
 if(!title.trim()&&lines.length>1&&lines[0]===name)lines.shift();
 while(lines.length)blocks.push(lines.splice(0,LINES_PER_CARD));
 if(!blocks.length)blocks.push([source]);
 const old=new Map(previous.map(n=>[n.part||0,n]));
 const stamp=new Date().toISOString();
 return blocks.map((body,part)=>{
  const former=old.get(part);
  return {id:former?.id||core.id(),groupId:id,part,
   title:part?name+' · '+(part+1):name,lines:body,rawText:part?'' :source,
   subjectId:subject||'',color:color,angle:[-2,1.2,-1,2.2,0][part%5],
   pinned:Boolean(former?.pinned),createdAt:former?.createdAt||stamp,updatedAt:stamp};
 });
}
function subj(id){return core.getData().subjects.find(s=>s.id===id)?.name||'General';}
function card(n,preview=false){
 const label=(n.part||0)+1,rot=Number(n.angle)||0;
 let out='<article class="sticky-paper'+(preview?' sticky-preview-paper':'')+'" style="--sticky-paper:'+paperColor(n.color)+';--sticky-angle:'+rot+'deg">';
 out+='<div class="sticky-tape" aria-hidden="true"></div><div class="sticky-top"><span>'+esc(subj(n.subjectId))+'</span><span aria-label="Pinned">'+(n.pinned?'✦':'✧')+'</span></div>';
 out+='<h3>'+esc(n.title)+'</h3><div class="sticky-handwriting">'+(n.lines||[]).map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>';
 if(preview)return out+'<div class="sticky-preview-caption">LIVE PAPER PREVIEW</div></article>';
 out+='<div class="sticky-bottom"><span>No. '+String(label).padStart(2,'0')+'</span><span>'+esc(new Date(n.updatedAt||Date.now()).toLocaleDateString(undefined,{month:'short',day:'numeric'}))+'</span></div>';
 out+='<div class="sticky-actions"><button data-sticky="edit" data-id="'+esc(n.groupId||n.id)+'">Edit</button><button data-sticky="pin" data-id="'+esc(n.id)+'">'+(n.pinned?'Unpin':'Pin')+'</button><button data-sticky="duplicate" data-id="'+esc(n.groupId||n.id)+'">Duplicate</button><button data-sticky="delete" data-id="'+esc(n.groupId||n.id)+'">Delete</button></div>';
 return out+'</article>';
}
function getPreview(){
 const pages=generate(raw,heading,subjectId,paper,groupId||'preview',[]);
 return pages.length?pages.slice(0,2).map(n=>card(n,true)).join('')+(pages.length>2?'<p class="sticky-more">+ '+(pages.length-2)+' more paper cards</p>':''):'<div class="sticky-preview-empty">Your thoughts become handwritten sticky notes here as you type.</div>';
}
function getWall(){
 const notes=all().filter(n=>filter==='all'||n.subjectId===filter).slice();
 notes.sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||(a.part||0)-(b.part||0));
 return notes.length?notes.map(n=>card(n)).join(''):'<div class="sticky-empty"><span>✳</span><strong>Your wall is waiting.</strong><p>Type a thought above to create your first handwritten sticky note.</p></div>';
}
function setStatus(t){const el=$('#stickySaveStatus');if(el)el.textContent=t;}
function redraw(){
 const wall=$('#stickyWall');if(wall)wall.innerHTML=getWall();
 const total=$('#stickyTotal');if(total)total.textContent=String(all().length);
}
function preview(){
 const el=$('#stickyLivePreview');if(el)el.innerHTML=getPreview();
 const count=$('#stickyPageCount');if(count)count.textContent=generate(raw,heading,subjectId,paper,'preview').length+' cards';
 const chars=$('#stickyCharCount');if(chars)chars.textContent=String(raw.length)+'/'+LIMIT;
}
function save(){
 clearTimeout(autosave);autosave=null;
 if(!raw.trim()){setStatus('Start typing to create your first sticky.');return false;}
 const data=core.getData();if(!Array.isArray(data.stickies))data.stickies=[];
 const id=groupId||core.id(),prior=bucket(id);
 const pages=generate(raw,heading,subjectId,paper,id,prior);
 const previous=data.stickies;
 data.stickies=data.stickies.filter(n=>(n.groupId||n.id)!==id).concat(pages);
 groupId=id;
 if(core.save()===false){
  data.stickies=previous;
  groupId=prior.length?id:'';
  setStatus('Could not save. Your writing is still here; free up storage and retry.');
  return false;
 }
 redraw();
 const composerTitle=$('#stickyComposerTitle');if(composerTitle)composerTitle.textContent='Editing a sticky';
 setStatus('✓ Saved on device · Account sync follows the top status');
 return true;
}
function schedule(){
 clearTimeout(autosave);
 preview();setStatus(raw.trim()?'Shaping your handwritten notes…':'Type a thought to get started.');
 if(raw.trim())autosave=setTimeout(save,950);
}
function newDraft(){
 clearTimeout(autosave);autosave=null;groupId='';heading='';raw='';paper='butter';subjectId='';
 const t=$('#stickyText'),h=$('#stickyTitle'),s=$('#stickySubject');
 if(t)t.value='';if(h)h.value='';if(s)s.value='';
 const chosen=$('input[name="stickyPaper"][value="butter"]');if(chosen)chosen.checked=true;
 const name=$('#stickyComposerTitle');if(name)name.textContent='Write a new sticky';
 setStatus('Auto-save begins when you type.');preview();
}
function edit(id){
 if(autosave&&raw.trim())save();
 const pieces=bucket(id);if(!pieces.length)return;
 const first=pieces[0];groupId=id;
 heading=String(first.title||'').replace(/\s+·\s+\d+$/,'');
 raw=first.rawText||pieces.map(n=>(n.lines||[]).join('\n')).join('\n');
 subjectId=first.subjectId||'';paper=first.color||'butter';
 core.setTab('stickies');
 setStatus('Editing existing note · Auto-save is on.');$('#stickyText')?.focus();
}
function duplicate(id){
 const list=bucket(id);if(!list.length)return;
 const original=list[0],text=original.rawText||list.map(n=>n.lines.join('\n')).join('\n');
 const copy=generate(text,original.title,original.subjectId,original.color,core.id());
 const data=core.getData(),before=all();data.stickies=before.concat(copy);if(core.save()===false){data.stickies=before;return;}redraw();core.toast('Sticky duplicated');
}
function pin(id){
 const n=all().find(n=>n.id===id);if(!n)return;
 n.pinned=!n.pinned;if(core.save()===false){n.pinned=!n.pinned;return;}redraw();
}
function remove(id){
 if(!bucket(id).length||!confirm('Delete this sticky collection? Your original notebook notes remain unchanged.'))return;
 const before=all();core.getData().stickies=before.filter(n=>(n.groupId||n.id)!==id);if(core.save()===false){core.getData().stickies=before;return;}
 if(groupId===id)newDraft();redraw();core.toast('Sticky removed');
}
function render(){
 const d=core.getData();if(!Array.isArray(d.stickies))d.stickies=[];
 const subjects=d.subjects.map(s=>'<option value="'+esc(s.id)+'"'+(subjectId===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('');
 const filters=d.subjects.map(s=>'<option value="'+esc(s.id)+'"'+(filter===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('');
 const swatches=palette.map(p=>'<label title="'+p[0]+' paper"><input type="radio" name="stickyPaper" value="'+p[0]+'"'+(paper===p[0]?' checked':'')+'><span style="background:'+p[1]+'"></span><small>'+p[0]+'</small></label>').join('');
 return '<section class="hero sticky-hero"><div class="eyebrow">A LITTLE SPACE FOR BIG IDEAS</div><h1>Sticky Notes <span>✳</span></h1><p>Write freely. Every idea becomes handwritten paper, right as you type.</p></section>'+
 '<div class="sticky-workspace"><section class="sticky-compose"><div class="sticky-compose-head"><div><small>YOUR PAPER DESK</small><h2 id="stickyComposerTitle">'+(groupId?'Editing a sticky':'Write a new sticky')+'</h2></div><button data-sticky="new" class="secondary">+ New</button></div>'+
 '<label for="stickyTitle">Title <small>optional</small></label><input id="stickyTitle" maxlength="70" placeholder="e.g. Classical conditioning" value="'+esc(heading)+'">'+
 '<label for="stickySubject">Subject</label><select id="stickySubject"><option value="">General notes</option>'+subjects+'</select>'+
 '<label for="stickyText">Your thoughts</label><textarea id="stickyText" maxlength="'+LIMIT+'" rows="9" placeholder="Type or paste a theory, definition, example or bullet points…">'+esc(raw)+'</textarea>'+
 '<div class="sticky-input-meta"><span id="stickySaveStatus" role="status">Auto-save after you pause typing.</span><span id="stickyCharCount">'+raw.length+'/'+LIMIT+'</span></div>'+
 '<div class="sticky-palette"><span>Paper color</span><div class="sticky-swatches">'+swatches+'</div></div>'+
 '<div class="sticky-compose-actions"><button data-sticky="save" class="primary">Save now</button><button data-sticky="notes" class="secondary">Open notebook ↗</button></div>'+
 '<p class="sticky-fineprint">Saved locally and synced with your PsychDesk account when signed in. Longer writing automatically flows onto more cards.</p></section>'+
 '<section class="sticky-live" aria-label="Live sticky note preview"><div class="sticky-live-head"><strong>LIVE PREVIEW</strong><span id="stickyPageCount">'+generate(raw,heading,subjectId,paper,'preview').length+' cards</span></div><div id="stickyLivePreview" class="sticky-preview-grid">'+getPreview()+'</div></section></div>'+
 '<section class="sticky-gallery"><div class="sticky-gallery-head"><div><small>YOUR COLLECTION</small><h2>On the wall <span id="stickyTotal">'+d.stickies.length+'</span></h2></div><label>Filter <select id="stickyFilter"><option value="all">All subjects</option>'+filters+'</select></label></div>'+
 '<div id="stickyWall" class="sticky-wall">'+getWall()+'</div></section>';
}
function fromNote(note){
 if(!note)return;
 if(autosave&&raw.trim())save();
 heading=String(note.title||'').slice(0,70);
 raw=String(note.body||'').slice(0,LIMIT);
 subjectId=note.subjectId||'';paper='cream';groupId='';
 core.setTab('stickies');
 if(String(note.body||'').length>LIMIT)core.toast('First '+LIMIT+' characters imported; original notebook note is unchanged.');
 if(raw.trim())schedule();
}
document.addEventListener('input',e=>{
 if(e.target.id==='stickyText')raw=e.target.value;
 else if(e.target.id==='stickyTitle')heading=e.target.value;
 else return;schedule();
});
document.addEventListener('change',e=>{
 if(e.target.id==='stickySubject')subjectId=e.target.value;
 else if(e.target.name==='stickyPaper')paper=e.target.value;
 else if(e.target.id==='stickyFilter'){filter=e.target.value;redraw();return;}
 else return;schedule();
});
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-sticky]');if(!button)return;
 e.preventDefault();const id=button.dataset.id;
 switch(button.dataset.sticky){
 case 'new':if(autosave&&raw.trim())save();newDraft();$('#stickyText')?.focus();break;
 case 'save':save();break;
 case 'notes':if(autosave&&raw.trim())save();core.setTab('notes');break;
 case 'edit':edit(id);break;
 case 'pin':pin(id);break;
 case 'duplicate':duplicate(id);break;
 case 'delete':remove(id);break;
 }
});
document.addEventListener('pointerdown',e=>{
 if(autosave&&raw.trim()&&e.target.closest('[data-tab]'))save();
},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&autosave&&raw.trim())save();});
window.addEventListener('pagehide',()=>{if(autosave&&raw.trim())save();});
function resetDraft(){clearTimeout(autosave);autosave=null;groupId='';raw='';heading='';subjectId='';paper='butter';}
window.addEventListener('psychdesk:session-reset',resetDraft);
window.addEventListener('psychdesk:data-replaced',()=>{if(groupId&&!bucket(groupId).length)resetDraft();});
window.PsychDeskStickies={render,fromNote,generate,save,edit};
})();