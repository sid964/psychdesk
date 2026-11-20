/* PsychDesk Library books. Book packages contain plain text and stable identifiers. */
(() => {
 'use strict';
 const core = window.PsychDeskCore;
 const esc = core.esc;
 const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
 const validText = (value, max = 240) => typeof value === 'string' && value.trim() && value.length <= max;
 function validateCatalog(packages) {
  if (!Array.isArray(packages)) throw Error('The book catalog must be a list.');
  const unique = (value, seen) => validId(value) && !seen.has(value) && seen.add(value);
  const books = new Set();
  return packages.map(book => {
   if (!book || !unique(book.id, books) || !validText(book.title) || !validText(book.subject) ||
       !validText(book.author) || !validText(book.edition) || !Array.isArray(book.chapters) || !book.chapters.length ||
       (book.pdfOffset !== undefined && !Number.isSafeInteger(book.pdfOffset)))
    throw Error('Invalid book metadata or duplicate book ID.');
   const chapters = new Set(), parts = new Set(), sections = [];
   for (const chapter of book.chapters) {
    if (!chapter || !unique(chapter.id, chapters) || !validText(chapter.title) ||
        !Array.isArray(chapter.sections) || !chapter.sections.length) throw Error('Invalid book chapter: ' + book.id);
    for (const section of chapter.sections) {
     if (!section || !unique(section.id, parts) || !validText(section.title) ||
         !Array.isArray(section.blocks) || !section.blocks.length ||
         (section.page !== undefined && (!Number.isSafeInteger(section.page) || section.page < 1 ||
            section.page + (book.pdfOffset ?? 0) < 1 || section.page + (book.pdfOffset ?? 0) > 100000)))
      throw Error('Invalid reading section: ' + book.id);
     const blocks = new Set();
     if (!section.blocks.every(block => block && unique(block.id, blocks) &&
          ['paragraph', 'heading', 'quote'].includes(block.type) && validText(block.text, 12000)))
      throw Error('Invalid reading block: ' + section.id);
     sections.push({...section, chapterId: chapter.id, chapterTitle: chapter.title});
    }
   }
   return {...book, sections};
  });
 }
 let catalog = [], catalogError = '';
 try { catalog = validateCatalog(window.PsychDeskBookCatalog); }
 catch (error) { catalogError = error.message; console.error('PsychDesk Books:', error); }
 const lookup = id => catalog.find(book => book.id === id);
 const records = () => core.getData().bookReading || [];
 const record = book => records().find(row => row.bookId === book.id) || {};
 const savedSection = book => book.sections.find(section => section.id === record(book).sectionId) || book.sections[0];
 const defaults = {theme:'auto', size:19, leading:1.75, width:660};
 function preferences(book) {
  const saved = record(book).preferences || {};
  return {
   theme:['auto','sepia','white','dark'].includes(saved.theme)?saved.theme:defaults.theme,
   size:Number.isInteger(saved.size)&&saved.size>=15&&saved.size<=27?saved.size:defaults.size,
   leading:Number.isFinite(saved.leading)&&saved.leading>=1.5&&saved.leading<=2.2?saved.leading:defaults.leading,
   width:[560,660,780].includes(saved.width)?saved.width:defaults.width
  };
 }
 const route = (book, section, block) => '#books' + (book ? '/' + book.id + '/' + section.id + (block ? '/' + block : '') : '');
 let current = {}, shelfSubject = '', shelfQuery = '', focus = false;
 let pending = null, saveTimer, restoreFrame, renderedOwner;

 function patch(book, changes) {
  return core.commitChange(data => {
   data.bookReading ||= [];
   const index = data.bookReading.findIndex(row => row.bookId === book.id);
   const row = {bookId:book.id, ...data.bookReading[index], ...changes};
   if (index === -1) data.bookReading.push(row);
   else data.bookReading[index] = row;
  });
 }
 function flushPosition() {
  clearTimeout(saveTimer);
  const position = pending;
  pending = null;
  if (position?.owner === core.getStorageKey()) {
   const old = record(position.book);
   if (old.sectionId !== position.sectionId || old.blockId !== position.blockId)
    patch(position.book, {sectionId:position.sectionId, blockId:position.blockId, visitedAt:new Date().toISOString()});
  }
 }
 function latestBook() {
  return records().filter(row => row.visitedAt && lookup(row.bookId))
   .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)).map(row => lookup(row.bookId))[0];
 }
 function readRoute() {
  const [root, bookId, sectionId, blockId] = location.hash.slice(1).split('/');
  if (root !== 'books') return false;
  const book = lookup(bookId);
  const section = book?.sections.find(item => item.id === sectionId);
  current = section ? {book, section, blockId:section.blocks.some(item => item.id === blockId) ? blockId : ''} : {};
  if (section) {
   const saved = record(book);
   const anchor = current.blockId || (saved.sectionId === section.id ? saved.blockId || '' : '');
   current.blockId = anchor;
   const visited=saved.visitedParts||[];
   if (saved.sectionId !== section.id || saved.blockId !== anchor || !visited.includes(section.id))
    patch(book, {sectionId:section.id, blockId:anchor, visitedAt:new Date().toISOString(),
     visitedParts:visited.includes(section.id)?visited:[...visited,section.id]});
  }
  core.setTab('books');
  return true;
 }
 function navigate(book, section, blockId = '') {
  flushPosition();
  const hash = route(book, section, blockId);
  if (location.hash !== hash) history.pushState(null, '', hash);
  readRoute();
 }
 function open(id) {
  const book = lookup(id);
  if (!book) return;
  navigate(book, savedSection(book), record(book).blockId || '');
 }
 function sourceLink(source) {
  const book = lookup(source?.bookId);
  const section = source?.kind === 'library-book' && book?.sections.find(item => item.id === source.sectionId);
  if (!section) return '';
  const block = section.blocks.some(item => item.id === source.blockId) ? source.blockId : '';
  return '<a class="bk-source-link" href="' + route(book, section, block) + '">Open book source' +
   (section.page ? ' · p. ' + section.page : '') + '</a>';
 }
 function button(action, label, attrs = '') {
  return '<button type="button" data-book-action="' + action + '" ' + attrs + '>' + esc(label) + '</button>';
 }
 function chapterStatus(book,chapter) {
  const saved=record(book),completed=new Set(saved.completed||[]);
  if ((saved.completedChapters||[]).includes(chapter.id) || chapter.sections.every(section=>completed.has(section.id))) return 'Read';
  if (chapter.sections.some(section=>completed.has(section.id)||(saved.visitedParts||[]).includes(section.id)||saved.sectionId===section.id)) return 'In progress';
  return 'Not started';
 }
 function progressFor(book){
  const done=book.chapters.filter(chapter=>chapterStatus(book,chapter)==='Read').length;
  return {done,remaining:book.chapters.length-done,total:book.chapters.length,percent:Math.round(done/book.chapters.length*100)};
 }
 function shelf(){
 const latest=latestBook();
 const subjects=[...new Set(catalog.map(book=>book.subject))].sort();
 const query=shelfQuery.trim().toLowerCase();
 const visible=catalog.filter(book=>(!shelfSubject||book.subject===shelfSubject)&&
  (!query||[book.title,book.subject,book.author,book.edition].some(value=>value.toLowerCase().includes(query))));
 const allChapters=catalog.reduce((sum,book)=>sum+book.chapters.length,0);
 const readChapters=catalog.reduce((sum,book)=>sum+progressFor(book).done,0);
 const finishedBooks=catalog.filter(book=>progressFor(book).done===book.chapters.length).length;
 const milestones=[['First chapter',readChapters>=1],['Five chapters',readChapters>=5],['Ten chapters',readChapters>=10],['Twenty-five chapters',readChapters>=25],['Book completed',finishedBooks>=1]].filter(([,earned])=>earned).map(([name])=>name);
 const cloudStatus=window.PsychDeskFirebase?.getConnectionStatus?.();
 const syncLabel=cloudStatus?.synced?'Saved to your Google account':cloudStatus?.signedIn?'Saved locally · Google sync pending':'Saved on this device · sign in to sync';
 const spotlight=latest||catalog[0];
 return `<section class="bk-shelf" aria-label="Indexed psychology books">
  <header class="bk-hero"><div class="bk-hero-main">
   <p class="bk-kicker">PsychDesk · Reading room</p><h1>My library</h1>
   <p>Your books, chapters and reading progress — all in one place.</p>
   <div class="bk-hero-stats" aria-label="Your library reading achievements">
    <div><strong>${catalog.length}</strong><span>Indexed ${catalog.length===1?'book':'books'}</span></div>
    <div><strong>${readChapters}</strong><span>Chapters read</span></div>
    <div><strong>${allChapters-readChapters}</strong><span>Remaining</span></div>
   </div>
   <div class="bk-milestones" aria-label="Personal reading achievements">
    <p class="bk-kicker">Reading achievements</p>
    ${milestones.length?'<div class="bk-earned">'+milestones.map(name=>'<span>✦ '+esc(name)+'</span>').join('')+'</div>':'<p class="bk-unearned">Complete your first chapter to earn a reading milestone.</p>'}
    <small>${esc(syncLabel)}</small>
   </div>
  </div><div class="bk-continue">
   <p class="bk-kicker">${latest?'Continue reading':'Start reading'}</p>
   ${spotlight?`<strong>${esc(spotlight.title)}</strong>
    <span>${progressFor(spotlight).done} of ${spotlight.chapters.length} chapters read</span>
    ${button('open',latest?'Resume book':'Open first book','class="bk-primary" data-book-id="'+spotlight.id+'"')}`:
    '<span>Books will appear when their verified companion content is added.</span>'}
  </div></header>
  <nav class="bk-library-actions" aria-label="Other library spaces">
   <button type="button" data-tab="files">Drive files <span aria-hidden="true">↗</span></button>
   <button type="button" data-tab="reader">PDF reader <span aria-hidden="true">↗</span></button>
   <button type="button" data-tab="research">References <span aria-hidden="true">↗</span></button>
  </nav>
  ${catalogError?'<p class="bk-empty" role="alert">The indexed book catalog could not be opened.</p>':''}
  <div class="bk-collection-top"><div><p class="bk-kicker">YOUR BOOKSHELF</p><h2>Indexed books</h2>
  <p>Only indexed study companions appear here. Your own uploaded PDFs stay in Drive files.</p></div></div>
  ${catalog.length?`<div class="bk-filter"><label for="bk-search">Search books</label>
   <input id="bk-search" type="search" value="${esc(shelfQuery)}" placeholder="Find a psychology book" autocomplete="off">
   <label for="bk-subject">Browse by subject</label>
   <select id="bk-subject"><option value="">All subjects</option>${subjects.map(subject=>'<option value="'+esc(subject)+'"'+(shelfSubject===subject?' selected':'')+'>'+esc(subject)+'</option>').join('')}</select>
   </div><div class="bk-grid">${visible.map((book,i)=>{
    const progress=progressFor(book);
    const guides=book.sections.filter(section=>section.kind==='guide').length;
    const detailed=book.sections.filter(section=>section.kind==='detailed').length;
    return `<article class="bk-book-card">
     <button type="button" class="bk-cover" data-book-action="open" data-book-id="${book.id}" aria-label="Open ${esc(book.title)}">
      <small>${esc(book.subject)}</small><strong>${esc(book.title)}</strong><span>${esc(book.edition)}</span>
     </button>
     <div class="bk-book-detail"><h3>${esc(book.title)}</h3><p>${esc(book.author)}</p>
     <span class="bk-chapter-metric">${progress.done} of ${progress.total} chapters read · ${progress.remaining} remaining</span>
     <div class="bk-chapter-track" role="progressbar" aria-label="${esc(book.title)} chapters read" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><span style="width:${progress.percent}%"></span></div>
     ${guides?`<small class="bk-source-disclosure">${detailed} detailed parts · ${guides} brief guides (not full chapters)</small>`:''}</div>
    </article>`;
   }).join('')}</div>${!visible.length?'<p class="bk-empty">No indexed books match your search.</p>':''}`:
   !catalogError?'<div class="bk-empty"><h2>No indexed books yet</h2><p>The next books will be added after their chapters are checked. Uploaded PDF files remain available separately.</p></div>':''}
  </section>`;
}
 function renderBlock(block, highlights) {
  const tag = {paragraph:'p', heading:'h2', quote:'blockquote'}[block.type];
  const ranges = highlights.filter(mark => mark.blockId === block.id && block.text.slice(mark.start, mark.end) === mark.quote)
   .sort((a, b) => a.start - b.start);
  let end = 0, content = '';
  for (const mark of ranges) {
   if (mark.end <= end) continue;
   const start = Math.max(end, mark.start);
   content += esc(block.text.slice(end, start)) + '<mark>' + esc(block.text.slice(start, mark.end)) + '</mark>';
   end = mark.end;
  }
  return '<'+tag+' data-book-block="'+block.id+'">'+content+esc(block.text.slice(end))+'</'+tag+'>';
 }
 function reader(book, section) {
  const state = record(book), prefs = preferences(book);
  const index = book.sections.indexOf(section);
  const chapter = book.chapters.find(ch=>ch.id===section.chapterId);
  const chapterIndex = book.chapters.indexOf(chapter);
  const chapterRead = (state.completedChapters||[]).includes(chapter.id);
  const chapterLabel = chapterStatus(book,chapter);
  const marked = state.bookmarks?.includes(section.id);
  const read = state.completed?.includes(section.id);
  const marks = (state.highlights || []).filter(mark => mark.sectionId === section.id);
  return `<section class="bk-reader${focus?' bk-focus':''}" data-bk-theme="${prefs.theme}" style="--bk-size:${prefs.size}px;--bk-leading:${prefs.leading};--bk-width:${prefs.width}px">
   <nav class="bk-bar" aria-label="Book tools">
   ${button('shelf','Books')}${button('contents','Contents')}${button('settings','Aa','aria-label="Reading appearance"')}
   ${button('bookmark',marked?'Bookmarked':'Bookmark','aria-pressed="'+Boolean(marked)+'"')}
   ${button('annotations','Highlights')}${button('focus',focus?'Exit focus':'Focus','aria-pressed="'+focus+'"')}
   </nav>
   <article class="bk-page"><header><p class="bk-kicker">${esc(book.title)} · ${esc(section.chapterTitle)}</p>
   <h1>${esc(section.title)}</h1><div class="bk-chapter-status"><span>Chapter ${chapterIndex+1} of ${book.chapters.length} · ${esc(chapterLabel)}</span>
   <span>${esc(section.kind==='guide'?'Brief study guide · not full textbook content':'Detailed companion section')}</span></div>${section.page ? '<p class="bk-page-ref">Printed page '+section.page+'</p>' : ''}</header>
   <div class="bk-text">${section.blocks.map(block => renderBlock(block,marks)).join('')}</div>
   <div class="bk-study" role="group" aria-label="Study with a selected passage">
   <p>Select text to highlight it or create a note or flashcard.</p>
   ${button('highlight','Highlight')}${button('note','Create note')}${button('card','Create flashcard')}
   ${section.page ? button('pdf','Open source PDF') : ''}</div>
   <div class="bk-page-end">${button('complete',read?'Part marked as read':'Mark this part read','aria-pressed="'+Boolean(read)+'"')}
    ${button('chapterComplete',chapterRead?'Undo chapter completion':'Mark chapter as read','aria-pressed="'+chapterRead+'"')}</div></article>
   <nav class="bk-bar bk-bottom" aria-label="Reading position">
   ${button('previous','Previous',index===0?'disabled':'')}
   ${button('jump','Part '+(index+1)+' of '+book.sections.length+' · '+Math.round((state.completed?.filter(id => book.sections.some(part => part.id===id)).length||0)/book.sections.length*100)+'% marked read','aria-haspopup="dialog"')}
   ${button('next','Next',index===book.sections.length-1?'disabled':'')}</nav>
   <div class="bk-selection" role="group" aria-label="Selected passage actions" hidden>
   ${button('highlight','Highlight')}${button('note','Create note')}${button('card','Create flashcard')}
   </div></section>`;
 }
 function render() {
  return current.section ? reader(current.book,current.section) : shelf();
 }
 function capturePosition() {
  const page = document.querySelector('.bk-page');
  if (!page || !current.section || restoreFrame) return;
  const blocks = [...page.querySelectorAll('[data-book-block]')];
  const blockId = (blocks.find(block => block.getBoundingClientRect().bottom > 120) || blocks.at(-1))?.dataset.bookBlock;
  if (!blockId || blockId === (pending?.blockId ?? record(current.book).blockId)) return;
  pending = {owner:core.getStorageKey(),book:current.book,sectionId:current.section.id,blockId};
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushPosition,1800);
 }
 function afterRender(tab) {
  if (tab !== 'books' || !current.section) return;
  const owner = core.getStorageKey();
  const section = current.section;
  const explicitBlock = renderedOwner && renderedOwner!==owner ? '' : current.blockId;
  renderedOwner = owner;
  current.blockId = '';
  cancelAnimationFrame(restoreFrame);
  restoreFrame = requestAnimationFrame(() => {
   restoreFrame = 0;
   if (current.section !== section || core.getStorageKey()!==owner) return;
   const saved = record(current.book);
   const blockId = explicitBlock || (saved.sectionId === section.id && saved.blockId);
   if (blockId && validId(blockId))
    document.querySelector('.bk-page [data-book-block="'+blockId+'"]')?.scrollIntoView({block:'start',behavior:'instant'});
  });
 }
 function refreshSection(blockId = '') {
  current.blockId = blockId || pending?.blockId || record(current.book).blockId;
  core.render();
 }
 function toggle(book, field, value) {
  const list = record(book)[field] || [];
  const next = list.includes(value) ? list.filter(item => item !== value) : [...list,value];
  if (patch(book,{[field]:next})) refreshSection();
 }
 function contents(book) {
  const bookmarks = record(book).bookmarks || [];
  core.openModal('Book contents', '<div class="field"><label>Search this book</label><input id="bk-find" type="search"></div><div id="bk-results" class="bk-results"></div>');
  const input = document.querySelector('#bk-find');
  const draw = () => {
   const query = input.value.trim().toLowerCase();
   document.querySelector('#bk-results').innerHTML = book.chapters.map(chapter => {
    const hits = book.sections.filter(section => section.chapterId === chapter.id &&
     (!query || [section.title,section.chapterTitle,...section.blocks.map(b=>b.text)].some(value => value.toLowerCase().includes(query))));
    return hits.length ? '<h3>'+esc(chapter.title)+' <small>· '+esc(chapterStatus(book,chapter))+'</small></h3>'+hits.map(section =>
     button('part',(bookmarks.includes(section.id)?'★ ':'')+section.title+(section.kind==='guide'?' · Brief guide':''),'data-part-id="'+section.id+'"')).join('') : '';
   }).join('') || '<p>No results in this book.</p>';
  };
  input.addEventListener('input',draw);
  draw();
 }
 function jump(book, section) {
  core.openModal('Go to a reading part', `<form id="bk-jump"><div class="field">
   <label for="bk-range">Reading part</label><input id="bk-range" type="range" min="1" max="${book.sections.length}" value="${book.sections.indexOf(section)+1}">
   </div><p id="bk-target" role="status"></p><button class="primary" type="submit">Go to part</button></form>`);
  const range = document.querySelector('#bk-range');
  const preview = () => {
   const part = book.sections[Number(range.value)-1];
   const text = 'Part '+range.value+' of '+book.sections.length+' · '+part.chapterTitle+' · '+part.title;
   document.querySelector('#bk-target').textContent = text;
   range.setAttribute('aria-valuetext',text);
  };
  range.addEventListener('input',preview);
  preview();
  document.querySelector('#bk-jump').addEventListener('submit',event => {
   event.preventDefault();
   core.closeModal();
   navigate(book,book.sections[Number(range.value)-1]);
  });
 }
 function appearance(book) {
  const prefs = preferences(book);
  core.openModal('Reading appearance', `<form id="bk-appearance">
   <div class="field"><label>Page tone</label><select name="theme">${[['auto','Match PsychDesk'],['dark','AMOLED black'],['white','White'],['sepia','Warm paper']].map(([value,label]) =>
    '<option value="'+value+'"'+(prefs.theme===value?' selected':'')+'>'+label+'</option>').join('')}</select></div>
   <div class="field"><label>Font size</label><input name="size" type="range" min="15" max="27" value="${prefs.size}"></div>
   <div class="field"><label>Line spacing</label><input name="leading" type="range" min="1.5" max="2.2" step=".1" value="${prefs.leading}"></div>
   <div class="field"><label>Page width</label><select name="width">${[[560,'Narrow'],[660,'Normal'],[780,'Wide']].map(([value,label]) =>
    '<option value="'+value+'"'+(prefs.width===value?' selected':'')+'>'+label+'</option>').join('')}</select></div>
   <button class="primary" type="submit">Apply</button></form>`);
  document.querySelector('#bk-appearance').addEventListener('submit',event => {
   event.preventDefault();
   const data = new FormData(event.currentTarget);
   if (!patch(book,{preferences:{theme:data.get('theme'),size:+data.get('size'),leading:+data.get('leading'),width:+data.get('width')}})) return;
   core.closeModal();
   refreshSection();
  });
 }
 let passage = null;
 function readSelection() {
  const selection = window.getSelection();
  if (!selection?.rangeCount||!current.section) return null;
  const range = selection.getRangeAt(0);
  const blockOf = node => (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest('.bk-text [data-book-block]');
  const block = blockOf(range.startContainer);
  if (!block || block !== blockOf(range.endContainer)) return null;
  const prefix = document.createRange();
  prefix.selectNodeContents(block);
  prefix.setEnd(range.startContainer,range.startOffset);
  const start = prefix.toString().length, quote = range.toString();
  if (!quote.trim() || quote.length > 1200) return null;
  return {sectionId:current.section.id,blockId:block.dataset.bookBlock,start,end:start+quote.length,quote};
 }
 function pickPassage() {
  const selected = readSelection() || passage;
  return selected?.sectionId === current.section.id ? selected : null;
 }
 function addHighlight(book, selected) {
  const highlights = record(book).highlights || [];
  if (highlights.some(mark => mark.sectionId === selected.sectionId && mark.blockId === selected.blockId &&
      mark.start === selected.start && mark.end === selected.end)) return core.toast('This passage is already highlighted.');
  if (highlights.length >= 250) return core.toast('Remove an older highlight before adding another to this book.');
  if (patch(book,{highlights:[...highlights,{id:core.id(),...selected}]})) {
   passage = null;
   refreshSection(selected.blockId);
   core.toast('Highlight saved.');
  }
 }
 function annotations(book) {
  const marks = record(book).highlights || [];
  core.openModal('Book highlights', '<div class="bk-results">'+(marks.map(mark => {
   const section = book.sections.find(item => item.id === mark.sectionId);
   return section ? '<article><h3>'+esc(section.title)+'</h3><p>'+esc(mark.quote)+'</p>'+
    button('source','Go to passage','data-part-id="'+section.id+'" data-block-id="'+esc(mark.blockId)+'"')+
    button('remove','Remove highlight','data-mark-id="'+esc(mark.id)+'"')+'</article>' : '';
  }).join('') || '<p>No highlights in this book yet.</p>')+'</div>');
 }
 function studyDraft(book, section, selected, type) {
  const isNote = type === 'note', source = {kind:'library-book',bookId:book.id,sectionId:section.id,blockId:selected.blockId};
  const owner = core.getStorageKey();
  core.openModal(isNote?'Create note':'Create flashcard', `<form id="bk-draft"><div class="field">
   <label>${isNote?'Title':'Question'}</label><input name="title" required maxlength="${isNote?140:500}" value="${isNote?esc(section.title.slice(0,140)):''}">
   </div><div class="field"><label>${isNote?'Note':'Answer'}</label><textarea name="body" required maxlength="1500">${esc(selected.quote)}</textarea></div>
   <div class="field"><label>Subject</label><select name="subject">${core.subjectOptions(core.getData().subjects.find(s=>s.name===book.subject)?.id)}</select></div>
   <p class="note">Source: ${esc(book.title)} · ${esc(section.title)}${section.page?' · p. '+section.page:''}</p>
   <button class="primary" type="submit">Save ${type}</button></form>`);
  document.querySelector('#bk-draft').addEventListener('submit',event => {
   event.preventDefault();
   if (owner !== core.getStorageKey()) return core.closeModal();
   const data = new FormData(event.currentTarget), title = data.get('title').trim(), body = data.get('body').trim();
   if (!title || !body) return core.toast('Fill in both fields to save.');
   const common = {id:core.id(),subjectId:data.get('subject'),sourceInfo:source};
   const time = new Date().toISOString();
   const saved = core.commitChange(snapshot => {
    if (isNote) snapshot.notes.unshift({...common,title,body,tags:'',createdAt:time,updatedAt:time});
    else snapshot.cards.push({...common,question:title,answer:body,due:core.today(),interval:0,ease:2.5,reps:0,lapses:0});
   });
   if (saved) { core.closeModal(); core.toast(isNote?'Note saved.':'Flashcard saved.'); }
  });
 }
 function openPdf(book, section) {
  core.openModal('Open your source PDF', '<div class="field"><label>Choose your copy of this edition</label><input id="bk-pdf" type="file" accept="application/pdf,.pdf"></div>');
  document.querySelector('#bk-pdf').addEventListener('change',event => {
   const file = event.target.files[0];
   if (file) { core.closeModal(); window.PsychDeskReader.openLocal(file,section.page+(book.pdfOffset ?? 0)); }
  });
 }

 document.addEventListener('selectionchange', () => {
  const selection = readSelection();
  if (selection) passage = selection;
  const bar = document.querySelector('.bk-selection');
  if(bar)bar.hidden=!selection;
 });
 document.addEventListener('pointerdown', event => {
  if (event.target.closest('.bk-text')) passage = null;
 });
 document.addEventListener('input', event => {
  if (event.target.id !== 'bk-search') return;
  shelfQuery = event.target.value;
  const cursor = event.target.selectionStart;
  core.render();
  const input = document.querySelector('#bk-search');
  if (input) {input.focus();if (Number.isInteger(cursor)) input.setSelectionRange(cursor,cursor);}
 });
 document.addEventListener('change', event => {
  if (event.target.id !== 'bk-subject') return;
  shelfSubject = event.target.value;
  core.render();
  document.querySelector('#bk-subject')?.focus();
 });
 document.addEventListener('click', event => {
  const control = event.target.closest('[data-book-action], .bk-source-link');
  if (!control) return;
  if (control.matches('.bk-source-link')) {
   if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
   event.preventDefault(); flushPosition(); core.closeModal();
   history.pushState(null,'',control.getAttribute('href')); readRoute(); return;
  }
  const action = control.dataset.bookAction;
  if (action === 'open') return open(control.dataset.bookId);
  if (action === 'shelf') return navigate();
  const {book,section} = current;
  if (!section) return;
  switch (action) {
   case 'contents': contents(book); break;
   case 'jump': jump(book,section); break;
   case 'settings': appearance(book); break;
   case 'annotations': annotations(book); break;
   case 'bookmark': toggle(book,'bookmarks',section.id); break;
   case 'complete': toggle(book,'completed',section.id); break;
   case 'chapterComplete': toggle(book,'completedChapters',section.chapterId); break;
   case 'focus': focus = !focus; refreshSection(); document.querySelector('[data-book-action="focus"]')?.focus(); break;
   case 'pdf': openPdf(book,section); break;
   case 'remove':
    if (patch(book,{highlights:record(book).highlights.filter(mark => mark.id !== control.dataset.markId)})) {
     core.closeModal(); refreshSection();
    }
    break;
   case 'part': case 'source':
    core.closeModal(); navigate(book,book.sections.find(item => item.id === control.dataset.partId),control.dataset.blockId); break;
   case 'next': case 'previous': {
    const part = book.sections[book.sections.indexOf(section)+(action==='next'?1:-1)];
    if (part) navigate(book,part);
    break;
   }
   case 'highlight': case 'note': case 'card': {
    const selected = pickPassage();
    if (!selected) return core.toast('Select text within one paragraph or heading first.');
    if (action === 'highlight') addHighlight(book,selected);
    else studyDraft(book,section,selected,action);
    break;
   }
  }
 });
 window.addEventListener('scroll',capturePosition,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)flushPosition()});
 window.addEventListener('pagehide',flushPosition);
 window.addEventListener('hashchange', () => {
  flushPosition();
  if (!readRoute() && document.querySelector('.bk-reader,.bk-shelf')) { current = {}; core.setTab('materials'); }
 });
 window.addEventListener('psychdesk:tab-changed', event => {
  passage = null;
  if (event.tab === 'books') return;
  flushPosition();
  focus = false;
  current = {};
 });
 window.PsychDeskBooks = {render,afterRender,sourceLink,open,latestBook,validateCatalog};
 if (/^#books(?:\/|$)/.test(location.hash)) readRoute();
})();
