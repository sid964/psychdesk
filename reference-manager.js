/* PsychDesk Reference Manager — upgrades existing research[] records without migration or loss.
   RIS / BibTeX interchange, DOI lookup, editable metadata, APA-style draft previews. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc,$=s=>document.querySelector(s),data=()=>core.getData(),rows=()=>Array.isArray(data().research)?data().research:[];
const text=value=>String(value??'').trim();
const take=(v,n=300)=>text(v).slice(0,n);
const types=[['journal','Journal article'],['book','Book'],['chapter','Book chapter'],['conference','Conference paper'],['thesis','Thesis / dissertation'],['report','Report'],['web','Web page'],['other','Other']];
const typeName=t=>types.find(a=>a[0]===t)?.[1]||types[0][1];
const known=new Set(types.map(a=>a[0]));
const safeURL=value=>{try{const u=new URL(text(value));return /^(http|https):$/.test(u.protocol)?u.href:''}catch{return''}};
const cleanDOI=value=>text(value).replace(/^doi:\s*/i,'').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');
const validDOI=value=>/^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i.test(value)&&value.length<=190;
const normalizeType=value=>known.has(value)?value:'journal';
let search='',subjectFilter='all',typeFilter='all',sort='newest',pendingImport=[];
const normalized=row=>({
 id:row.id||'',type:normalizeType(row.type||'journal'),title:take(row.title,230),authors:take(row.authors,400),
 year:Number(row.year)||null,doi:cleanDOI(row.doi),url:safeURL(row.url),journal:take(row.journal||row.containerTitle,220),
 publisher:take(row.publisher,220),volume:take(row.volume,40),issue:take(row.issue,40),pages:take(row.pages,80),
 edition:take(row.edition,80),tags:take(row.tags,260),notes:take(row.notes,3000),
 subjectId:take(row.subjectId,80),citationKey:take(row.citationKey,100),createdAt:row.createdAt||new Date().toISOString()
});
function authorsList(value){
 const source=text(value);if(!source)return[];
 if(source.includes(';'))return source.split(';').map(text).filter(Boolean);
 if(/\s+and\s+/i.test(source))return source.split(/\s+and\s+/i).map(text).filter(Boolean);
 const parts=source.split(/\s*,\s*/).filter(Boolean);
 if(parts.length===2&&parts[0].split(/\s+/).length===1&&parts[1].split(/\s+/).length<=2)return [parts[0]+', '+parts[1]];
 return parts;
}
function authorAPA(name){
 const raw=text(name);
 if(!raw)return '';
 let surname='',given='';
 if(raw.includes(',')){
  const pos=raw.indexOf(',');surname=raw.slice(0,pos).trim();given=raw.slice(pos+1).trim();
 }else{
  const bits=raw.split(/\s+/);surname=bits.pop()||'';given=bits.join(' ');
 }
 const initials=given.split(/[\s-]+/).filter(Boolean).map(x=>x.replace(/\.$/,'')).filter(Boolean).map(x=>x[0]?.toLocaleUpperCase()+'.').join(' ');
 return surname+(initials?', '+initials:'');
}
function citationAuthors(value){
 const names=authorsList(value).map(authorAPA).filter(Boolean);
 if(!names.length)return '';
 if(names.length===1)return names[0];
 if(names.length<=20)return names.slice(0,-1).join(', ')+', & '+names.at(-1);
 return names.slice(0,19).join(', ')+', … '+names.at(-1);
}
function doiURL(doi){return validDOI(cleanDOI(doi))?'https://doi.org/'+cleanDOI(doi):''}
function apaDraft(record){
 const row=normalized(record);
 const author=citationAuthors(row.authors),date=row.year?'('+row.year+').':'(n.d.).';
 const pieces=[author?author+'.':'',date,row.title?(row.title.endsWith('.')?row.title:row.title+'.'):''];
 const location=row.type==='journal'?[
  row.journal+(row.volume?', '+row.volume+(row.issue?'('+row.issue+')':''):''),
  row.pages
 ].filter(Boolean).join(', '):
 row.type==='book'?[row.edition?'('+row.edition+' ed.).':'',row.publisher?row.publisher+'.':''].filter(Boolean).join(' '):
 row.type==='chapter'?[row.journal?'In '+row.journal+'.':'',row.pages?'(pp. '+row.pages+').':'',row.publisher?row.publisher+'.':''].filter(Boolean).join(' '):
 row.type==='conference'?[row.journal?row.journal+'.':'',row.pages?'pp. '+row.pages+'.':''].filter(Boolean).join(' '):
 row.publisher?row.publisher+'.':'';
 if(location)pieces.push(location.replace(/\.\./g,'.')+(location.endsWith('.')?'':'.'));
 if(doiURL(row.doi))pieces.push(doiURL(row.doi));
 else if(row.url)pieces.push(row.url);
 return pieces.filter(Boolean).join(' ').replace(/\s{2,}/g,' ').trim();
}
function dedupeKeys(raw){
 const r=normalized(raw);
 const keys=[];
 if(validDOI(r.doi))keys.push('doi:'+r.doi.toLowerCase());
 if(r.title)keys.push('title:'+r.title.toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+'|'+(r.year||''));
 return keys;
}
function dedupeKey(raw){return dedupeKeys(raw)[0]||'';}
function filterRows(){
 const needle=search.toLowerCase().trim();
 return rows().map(normalized).filter(r=>(subjectFilter==='all'||r.subjectId===subjectFilter)&&
 (typeFilter==='all'||r.type===typeFilter)&&(!needle||[r.title,r.authors,r.doi,r.journal,r.tags,r.notes,r.publisher].join(' ').toLowerCase().includes(needle)))
 .sort((a,b)=>{
  if(sort==='title')return a.title.localeCompare(b.title);
  if(sort==='year')return (b.year||0)-(a.year||0)||a.title.localeCompare(b.title);
  return String(b.createdAt).localeCompare(String(a.createdAt));
 });
}
function render(){
 const list=filterRows(),d=data();
 const opts=d.subjects.map(s=>'<option value="'+h(s.id)+'"'+(subjectFilter===s.id?' selected':'')+'>'+h(s.name)+'</option>').join('');
 return '<section class="hero ref-hero"><div class="eyebrow">YOUR ACADEMIC LIBRARY</div><h1>Reference Manager.</h1><p>Collect psychological research, verify source details, and build a personal bibliography.</p></section>'+
 '<div class="ref-metrics"><div><strong>'+rows().length+'</strong><span>Saved sources</span></div><div><strong>'+rows().filter(r=>validDOI(cleanDOI(r.doi))).length+'</strong><span>DOIs recorded</span></div><div><strong>'+list.length+'</strong><span>Matching results</span></div></div>'+
 '<section class="ref-quick-add"><div><small>ADD A REFERENCE</small><h2>Start with a DOI or enter metadata.</h2><p>Look up published work through Crossref. Every field remains editable after lookup.</p></div>'+
 '<div class="ref-doi-row"><input type="text" id="refLookupInput" autocomplete="off" placeholder="10.1037/… or DOI link" aria-label="Reference DOI"><button type="button" data-ref="lookup" class="primary">Find DOI</button><button type="button" data-ref="add" class="secondary">+ Manual entry</button></div><p id="refLookupStatus" role="status"></p></section>'+
 '<div class="ref-toolbar"><div><button data-ref="import" class="secondary">↑ Import RIS / BibTeX</button><button data-ref="exportRIS" class="secondary">↓ Export RIS</button><button data-ref="exportBIB" class="secondary">↓ Export BibTeX</button></div>'+
 '<input type="file" id="referenceImportFile" accept=".ris,.bib,.bibtex,.txt,text/plain,application/x-bibtex" hidden>'+
 '<span>Compatible with reference managers such as Zotero. Imports are reviewed before saving.</span></div>'+
 '<div class="ref-controls"><label>Search bibliography<input id="refSearch" type="search" value="'+h(search)+'" placeholder="Title, author, DOI, keywords…"></label>'+
 '<label>Subject<select id="refSubjectFilter"><option value="all">All subjects</option>'+opts+'</select></label>'+
 '<label>Type<select id="refTypeFilter"><option value="all">All types</option>'+types.map(([id,name])=>'<option value="'+id+'"'+(typeFilter===id?' selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
 '<label>Sort<select id="refSort"><option value="newest"'+(sort==='newest'?' selected':'')+'>Recently added</option><option value="year"'+(sort==='year'?' selected':'')+'>Year</option><option value="title"'+(sort==='title'?' selected':'')+'>Title A–Z</option></select></label></div>'+
 '<div id="refList" class="ref-library">'+cards(list)+'</div>'+
 '<p class="psy-disclaimer">Citation previews are APA-style drafts, not certified APA 7 output. Check author names, capitalization, italics, issue numbers, page ranges, and official publication metadata before submitting academic work. Export/import may not carry attachments or Zotero collections.</p>';
}
function cards(list=filterRows()){
 if(!list.length)return '<div class="psy-empty">No references found. Use the DOI lookup, enter a paper manually, or import an existing RIS/BibTeX file.</div>';
 return list.map(r=>'<article class="ref-item"><div class="ref-item-top"><span>'+h(typeName(r.type))+' · '+h(r.year||'n.d.')+'</span><span>'+h(data().subjects.find(s=>s.id===r.subjectId)?.name||'General')+'</span></div>'+
 '<h3>'+h(r.title)+'</h3><p>'+h(r.authors||'Author information not entered')+'</p>'+
 (r.journal?'<div class="ref-journal">'+h(r.journal)+(r.volume?' · '+h(r.volume):'')+'</div>':'')+
 '<div class="ref-citation"><span>APA-STYLE DRAFT</span><p>'+h(apaDraft(r))+'</p></div>'+
 '<div class="ref-item-actions">'+(safeURL(r.url)||doiURL(r.doi)?'<a href="'+h(safeURL(r.url)||doiURL(r.doi))+'" target="_blank" rel="noopener noreferrer">Open source ↗</a>':'')+
 '<button data-ref="copy" data-id="'+h(r.id)+'">Copy citation</button><button data-ref="edit" data-id="'+h(r.id)+'">Edit</button><button data-ref="remove" data-id="'+h(r.id)+'">Delete</button></div></article>').join('');
}
function redraw(){const el=$('#refList');if(el)el.innerHTML=cards();}
function referenceForm(record={}){
 const r=normalized(record);
 const opts=data().subjects.map(s=>'<option value="'+h(s.id)+'"'+(r.subjectId===s.id?' selected':'')+'>'+h(s.name)+'</option>').join('');
 core.openModal(r.id?'Edit reference':'New reference','<form id="refEditorForm"><input type="hidden" name="id" value="'+h(r.id)+'">'+
 '<div class="ref-edit-form"><label>Source type<select name="type">'+types.map(([id,name])=>'<option value="'+id+'"'+(r.type===id?' selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
 '<label>Year<input name="year" type="number" min="1500" max="2100" value="'+h(r.year||'')+'"></label>'+
 '<label class="wide">Title *<input name="title" required maxlength="230" value="'+h(r.title)+'"></label>'+
 '<label class="wide">Authors (separate names with semicolons)<textarea name="authors" rows="2" maxlength="400" placeholder="Given Family; Given Family">'+h(r.authors)+'</textarea></label>'+
 '<label>Journal / proceedings / edited book<input name="journal" maxlength="220" value="'+h(r.journal)+'"></label>'+
 '<label>Publisher<input name="publisher" maxlength="220" value="'+h(r.publisher)+'"></label>'+
 '<label>Volume<input name="volume" maxlength="40" value="'+h(r.volume)+'"></label>'+
 '<label>Issue<input name="issue" maxlength="40" value="'+h(r.issue)+'"></label>'+
 '<label>Pages<input name="pages" maxlength="80" value="'+h(r.pages)+'"></label>'+
 '<label>Edition<input name="edition" maxlength="80" value="'+h(r.edition)+'"></label>'+
 '<label>DOI<input name="doi" maxlength="190" value="'+h(r.doi)+'"></label>'+
 '<label>URL<input name="url" maxlength="600" value="'+h(r.url)+'"></label>'+
 '<label>Subject<select name="subjectId"><option value="">General</option>'+opts+'</select></label>'+
 '<label>Citation key (optional)<input name="citationKey" maxlength="100" value="'+h(r.citationKey)+'"></label>'+
 '<label class="wide">Keywords<input name="tags" maxlength="260" value="'+h(r.tags)+'"></label>'+
 '<label class="wide">Notes<textarea name="notes" rows="3" maxlength="3000">'+h(r.notes)+'</textarea></label></div>'+
 '<div class="ref-editor-footer"><button type="submit" class="primary">Save reference</button><span>Existing records are updated; originals are not duplicated.</span></div></form>');
}
function serializeForm(f){
 return normalized({id:f.elements.id.value,title:f.elements.title.value,authors:f.elements.authors.value,
 type:f.elements.type.value,year:f.elements.year.value,doi:f.elements.doi.value,url:f.elements.url.value,
 journal:f.elements.journal.value,publisher:f.elements.publisher.value,volume:f.elements.volume.value,
 issue:f.elements.issue.value,pages:f.elements.pages.value,edition:f.elements.edition.value,
 tags:f.elements.tags.value,notes:f.elements.notes.value,subjectId:f.elements.subjectId.value,
 citationKey:f.elements.citationKey.value});
}
function saveForm(e){
 e.preventDefault();const r=serializeForm(e.target);
 if(!r.title){core.toast('A reference title is required.');return;}
 if(r.doi&&!validDOI(r.doi)){core.toast('Check DOI format.');return;}
 const original=rows().find(x=>x.id===r.id);
 const newKeys=new Set(dedupeKeys(r));const duplicate=rows().find(x=>x.id!==r.id&&dedupeKeys(x).some(key=>newKeys.has(key)));
 if(duplicate){core.toast('This reference appears to be saved already.');return;}
 const d=data();if(!Array.isArray(d.research))d.research=[];
 if(original)Object.assign(original,r,{createdAt:original.createdAt,updatedAt:new Date().toISOString()});
 else d.research.push({...r,id:core.id(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 core.save();core.closeModal();core.render();core.toast(original?'Reference updated':'Reference saved');
}
async function doiLookup(){
 const el=$('#refLookupInput'),status=$('#refLookupStatus');
 const doi=cleanDOI(el?.value);
 if(!validDOI(doi)){if(status)status.textContent='Enter a valid DOI or https://doi.org/… link.';return;}
 if(status)status.textContent='Looking up publication metadata…';
 const ctrl=new AbortController(),time=setTimeout(()=>ctrl.abort(),13000);
 try{
  const response=await fetch('https://api.crossref.org/works/'+encodeURIComponent(doi),{signal:ctrl.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Crossref did not return metadata for that DOI.');
  const item=(await response.json()).message||{};
  const authors=(item.author||[]).map(x=>[x.given,x.family].filter(Boolean).join(' ')).filter(Boolean).join('; ');
  const type=item.type==='book'?'book':item.type==='book-chapter'?'chapter':item.type==='proceedings-article'?'conference':item.type==='dissertation'?'thesis':item.type==='report'?'report':'journal';
  const r={type,title:item.title?.[0]||'',authors,year:item.published?.['date-parts']?.[0]?.[0]||item.issued?.['date-parts']?.[0]?.[0]||null,
   doi,journal:item['container-title']?.[0]||'',publisher:item.publisher||'',volume:item.volume||'',issue:item.issue||'',pages:item.page||'',url:item.URL||doiURL(doi)};
  if(status)status.textContent='Metadata found. Review before saving.';
  referenceForm(r);
 }catch(e){
  if(status)status.textContent='Lookup unavailable: '+take(e?.message||e,180)+'. You can enter a reference manually.';
 }finally{clearTimeout(time);}
}
// Text-based interchange formats. Parse only metadata; no imported content is evaluated.
function parseRIS(src){
 const result=[],lines=String(src).replace(/\r\n?/g,'\n').split('\n');
 let fields=null,last='',records=0;
 const flush=()=>{
  if(!fields)return;
  const val=(...tags)=>tags.map(t=>fields[t]?.[0]).find(Boolean)||'';
  const names=[...(fields.AU||[]),...(fields.A1||[])].map(text).filter(Boolean);
  const first=val('SP'),end=val('EP'),pages=val('PG')||(first+(end?'-'+end:''));
  const row=normalized({
   title:val('TI','T1','CT'),authors:names.join('; '),year:(val('PY','Y1','DA').match(/\d{4}/)||[])[0]||'',
   type:val('TY')==='BOOK'?'book':val('TY')==='CHAP'?'chapter':val('TY')==='CONF'?'conference':val('TY')==='THES'?'thesis':val('TY')==='RPRT'?'report':val('TY')==='ELEC'?'web':'journal',
   journal:val('JO','JF','T2','BT'),publisher:val('PB'),volume:val('VL'),issue:val('IS'),pages,
   doi:val('DO'),url:val('UR','L1'),notes:[...(fields.N1||[]),...(fields.AB||[])].join('\n'),
   tags:(fields.KW||[]).join(', ')
  });
  if(row.title)result.push(row);
  fields=null;last='';
 };
 for(const raw of lines){
  if(result.length>=250)break;
  const match=raw.match(/^([A-Z][A-Z0-9])\s*-\s?(.*)$/);
  if(match){
   const tag=match[1],value=match[2];
   if(tag==='TY'){flush();fields={};records++;if(records>300)break;}
   if(tag==='ER'){flush();continue;}
   if(fields){(fields[tag] ||= []).push(value);last=tag;}
  }else if(fields&&last&&raw.trim()&&raw.startsWith(' ')){
   const arr=fields[last];arr[arr.length-1]+=' '+raw.trim();
  }
 }
 flush();return result;
}
function findClosing(src,start,open,close){
 let depth=0,quote=false,escaped=false;
 for(let i=start;i<src.length;i++){
  const c=src[i];
  if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}
  if(c==='"'&&depth===1){quote=!quote;continue;}
  if(quote)continue;
  if(c===open)depth++;
  else if(c===close){depth--;if(!depth)return i;}
 }
 return -1;
}
function bibFields(body){
 const result={};let i=0;
 while(i<body.length){
  while(i<body.length&&/[\s,]/.test(body[i]))i++;
  const nameMatch=/^[A-Za-z][A-Za-z0-9_-]*/.exec(body.slice(i));if(!nameMatch)break;
  const key=nameMatch[0].toLowerCase();i+=key.length;
  while(/\s/.test(body[i]||''))i++;
  if(body[i]!=='=')break;i++;
  while(/\s/.test(body[i]||''))i++;
  let value='',opened=body[i];
  if(opened==='{'){
   let depth=0;i++;
   for(;i<body.length;i++){
    const c=body[i];if(c==='{'){depth++;value+=c;}
    else if(c==='}'){if(depth===0){i++;break;}depth--;value+=c;}
    else value+=c;
   }
  }else if(opened==='"'){
   i++;for(;i<body.length;i++){const c=body[i];if(c==='\\'&&i+1<body.length){value+=body[++i];continue;}if(c==='"'){i++;break;}value+=c;}
  }else{
   while(i<body.length&&body[i]!==',')value+=body[i++];
  }
  result[key]=value.replace(/[{}]/g,'').replace(/\s+/g,' ').trim();
 }
 return result;
}
function parseBibTeX(src){
 const input=String(src),result=[];let cursor=0;
 while(cursor<input.length&&result.length<250){
  const at=input.indexOf('@',cursor);if(at<0)break;
  const typeMatch=/^@([A-Za-z]+)\s*([\{\(])/.exec(input.slice(at));
  if(!typeMatch){cursor=at+1;continue;}
  const bibType=typeMatch[1].toLowerCase(),open=typeMatch[2],start=at+typeMatch[0].length-1,close=open==='{'?'}':')';
  const end=findClosing(input,start,open,close);
  if(end<0){cursor=at+1;continue;}cursor=end+1;
  if(['comment','string','preamble'].includes(bibType))continue;
  const body=input.slice(start+1,end),comma=body.indexOf(',');
  if(comma<0)continue;
  const cite=take(body.slice(0,comma),100),fields=bibFields(body.slice(comma+1));
  const kind=bibType==='book'?'book':bibType==='incollection'?'chapter':bibType==='inproceedings'?'conference':bibType==='phdthesis'||bibType==='mastersthesis'?'thesis':bibType==='techreport'?'report':bibType==='online'||bibType==='misc'?'web':'journal';
  const entry=normalized({
   title:fields.title,authors:(fields.author||'').split(/\s+and\s+/i).map(text).join('; '),year:fields.year,type:kind,
   doi:fields.doi,url:fields.url,journal:fields.journal||fields.booktitle,publisher:fields.publisher,
   volume:fields.volume,issue:fields.number,pages:fields.pages,edition:fields.edition,
   notes:fields.abstract||fields.note||'',tags:fields.keywords,citationKey:cite
  });
  if(entry.title)result.push(entry);
 }
 return result;
}
function bibValue(raw){return take(raw,3000).replace(/\\/g,'\\textbackslash ').replace(/[{}]/g,'');}
function bibKey(record,index){
 const explicit=take(record.citationKey,100).replace(/[^a-z0-9_:-]/gi,'');
 if(explicit)return explicit;
 const surname=authorsList(record.authors)[0]?.split(/[\s,]+/).filter(Boolean).at(-1)||'source';
 return (surname+(record.year||'nd')+'_'+(index+1)).replace(/[^a-z0-9_:-]/gi,'');
}
function exportBibTeX(records){
 return records.map((record,index)=>{
  const r=normalized(record);
  const type=r.type==='book'?'book':r.type==='chapter'?'incollection':r.type==='conference'?'inproceedings':r.type==='thesis'?'phdthesis':r.type==='report'?'techreport':r.type==='web'?'misc':'article';
  const entries=[['title',r.title],['author',authorsList(r.authors).join(' and ')],['year',r.year],['journal',r.type==='journal'?r.journal:''],
   ['booktitle',['chapter','conference'].includes(r.type)?r.journal:''],['publisher',r.publisher],['volume',r.volume],
   ['number',r.issue],['pages',r.pages],['edition',r.edition],['doi',r.doi],['url',r.url],['keywords',r.tags],['note',r.notes]]
    .filter(([,v])=>String(v??'').trim()).map(([k,v])=>'  '+k+' = {'+bibValue(v)+'}');
  return '@'+type+'{'+bibKey(r,index)+',\n'+entries.join(',\n')+'\n}';
 }).join('\n\n')+'\n';
}
function exportRIS(records){
 return records.map(record=>{
  const r=normalized(record);
  const type=r.type==='book'?'BOOK':r.type==='chapter'?'CHAP':r.type==='conference'?'CONF':r.type==='thesis'?'THES':r.type==='report'?'RPRT':r.type==='web'?'ELEC':'JOUR';
  const tags=[['TY',type],['TI',r.title],...authorsList(r.authors).map(x=>['AU',x]),['PY',r.year],['JO',r.journal],['PB',r.publisher],
   ['VL',r.volume],['IS',r.issue],['SP',r.pages.split(/[-–]/)[0]||''],['EP',r.pages.split(/[-–]/)[1]||''],
   ['DO',r.doi],['UR',r.url],['N1',r.notes],['KW',r.tags]];
  return tags.filter(([,v])=>String(v??'').trim()).map(([tag,v])=>tag+'  - '+String(v).replace(/[\r\n]+/g,' ')).concat('ER  -').join('\r\n');
 }).join('\r\n\r\n')+'\r\n';
}
function importPreview(items){
 const present=new Set(rows().flatMap(dedupeKeys)),seen=new Set(),accepted=[];
 for(const value of items.slice(0,250)){
  const row=normalized(value),keys=dedupeKeys(row);
  if(!row.title||keys.some(key=>seen.has(key)||present.has(key)))continue;
  keys.forEach(key=>seen.add(key));accepted.push(row);
 }
 return accepted;
}
function importModal(parsed,filename){
 pendingImport=importPreview(parsed);
 core.openModal('Review reference import','<div class="ref-import-preview"><p><strong>'+parsed.length+'</strong> parsed from '+h(filename)+'. <strong>'+pendingImport.length+'</strong> new references after duplicate checks.</p>'+
 '<p>Nothing has been overwritten. Importing adds only new records. Check the results and export a JSON backup if you need a full library snapshot.</p>'+
 '<div class="ref-import-list">'+pendingImport.slice(0,15).map(r=>'<div><strong>'+h(r.title)+'</strong><small>'+h(r.authors||'Unknown author')+' · '+h(r.year||'n.d.')+'</small></div>').join('')+'</div>'+
 '<div class="ref-import-actions"><button data-ref="confirmImport" class="primary" '+(!pendingImport.length?'disabled':'')+'>Import '+pendingImport.length+' references</button><button data-ref="cancelImport" class="secondary">Cancel</button></div></div>');
}
async function loadFile(file){
 if(!file)return;
 if(file.size>1024*1024){core.toast('Import files are limited to 1 MB. Split your bibliography and try again.');return;}
 try{
  const content=await file.text(),ext=file.name.toLowerCase();
  const parsed=/\.ris$/.test(ext)?parseRIS(content):/\.(bib|bibtex)$/.test(ext)?parseBibTeX(content):
   /@\w+\s*[\{\(]/.test(content)?parseBibTeX(content):parseRIS(content);
  if(!parsed.length){core.toast('No supported references found. Check RIS/BibTeX format.');return;}
  importModal(parsed,file.name);
 }catch(e){core.toast('Could not read the bibliography: '+take(e.message||e,130));}
}
function confirmImport(){
 if(!pendingImport.length)return;
 const d=data();d.research=rows().concat(pendingImport.map(x=>({...x,id:core.id(),createdAt:new Date().toISOString()})));
 const count=pendingImport.length;pendingImport=[];
 core.save();core.closeModal();core.render();core.toast(count+' reference'+(count===1?'':'s')+' imported');
}
function download(name,content,type='text/plain'){
 const url=URL.createObjectURL(new Blob([content],{type:type+';charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function copy(textValue){
 try{await navigator.clipboard.writeText(textValue);core.toast('APA-style citation draft copied. Please verify formatting.');}
 catch{core.toast('Clipboard unavailable in this browser.');}
}
document.addEventListener('input',e=>{
 if(e.target?.id==='refSearch'){search=e.target.value;redraw();}
});
document.addEventListener('change',e=>{
 if(e.target?.id==='refSubjectFilter'){subjectFilter=e.target.value;redraw();}
 if(e.target?.id==='refTypeFilter'){typeFilter=e.target.value;redraw();}
 if(e.target?.id==='refSort'){sort=e.target.value;redraw();}
 if(e.target?.id==='referenceImportFile'){loadFile(e.target.files?.[0]);e.target.value='';}
});
document.addEventListener('submit',e=>{if(e.target?.id==='refEditorForm')saveForm(e);});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-ref]');if(!b)return;e.preventDefault();
 const id=b.dataset.id,action=b.dataset.ref,ref=rows().find(r=>r.id===id);
 switch(action){
  case 'add':referenceForm({});break;
  case 'lookup':doiLookup();break;
  case 'edit':if(ref)referenceForm(ref);break;
  case 'remove':if(ref&&confirm('Delete this reference? Imported PDFs and notebook notes are not affected.')){data().research=rows().filter(r=>r.id!==id);core.save();core.render();}break;
  case 'copy':if(ref)copy(apaDraft(ref));break;
  case 'import':$('#referenceImportFile')?.click();break;
  case 'exportRIS':if(rows().length)download('psychdesk-references.ris',exportRIS(rows()),'application/x-research-info-systems');else core.toast('No references to export.');break;
  case 'exportBIB':if(rows().length)download('psychdesk-references.bib',exportBibTeX(rows()),'application/x-bibtex');else core.toast('No references to export.');break;
  case 'confirmImport':confirmImport();break;
  case 'cancelImport':pendingImport=[];core.closeModal();break;
 }
});
window.addEventListener('psychdesk:session-reset',()=>{search='';subjectFilter='all';typeFilter='all';sort='newest';pendingImport=[];});
window.PsychDeskReferences={render,normalized,apaDraft,parseRIS,parseBibTeX,exportRIS,exportBibTeX,importPreview,authorsList,dedupeKey,cleanDOI,validDOI};
})();