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
 const defaults = {theme:'sepia', size:19, leading:1.8, width:660};
 function preferences(book) {
  const saved = record(book).preferences || {};
  return {
   theme:['sepia','white','dark'].includes(saved.theme)?saved.theme:defaults.theme,
   size:Number.isInteger(saved.size)&&saved.size>=15&&saved.size<=27?saved.size:defaults.size,
   leading:Number.isFinite(saved.leading)&&saved.leading>=1.5&&saved.leading<=2.2?saved.leading:defaults.leading,
   width:[560,660,780].includes(saved.width)?saved.width:defaults.width
  };
 }
 const route = (book, section, block) => '#books' + (book ? '/' + book.id + '/' + section.id + (block ? '/' + block : '') : '');
 let current = {}, shelfSubject = '', shelfQuery = '', shelfBookId = '', focus = false;
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
  if(book&&!section)shelfBookId=book.id;
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
 const latest=latestBook(),featured=lookup(shelfBookId)||latest||catalog[0];
 const subjects=[...new Set(catalog.map(b=>b.subject))].sort(),query=shelfQuery.trim().toLowerCase();
 const visible=catalog.filter(b=>(!shelfSubject||b.subject===shelfSubject)&&(!query||[b.title,b.subject,b.author,b.edition].some(t=>t.toLowerCase().includes(query))));
 const doneAll=catalog.reduce((a,b)=>a+progressFor(b).done,0),remainingAll=catalog.reduce((a,b)=>a+progressFor(b).remaining,0);
 const earned=[['First chapter',doneAll>=1],['Five chapters',doneAll>=5],['Ten chapters',doneAll>=10],['Book completed',catalog.some(b=>progressFor(b).remaining===0)]].filter(x=>x[1]).map(x=>x[0]);
 const status=window.PsychDeskFirebase?.getConnectionStatus?.();
 const sync=status?.synced?'Saved to your Google account':status?.signedIn?'Saved locally · Google sync pending':'Saved on this device · sign in to sync';
 const book=featured,progress=book?progressFor(book):null;
 const chapters=book?book.chapters.map((ch,i)=>{
  const readParts=ch.sections.filter(p=>(record(book).completed||[]).includes(p.id)).length;
  const first=ch.sections[0],page=ch.sections.find(p=>Number.isInteger(p.page))?.page;
  const detailed=ch.sections.some(p=>p.kind==='detailed'),isRead=chapterStatus(book,ch)==='Read';
  return `<button type="button" class="bk-ref-chapter" data-book-action="openPart" data-book-id="${esc(book.id)}" data-part-id="${esc(first.id)}" data-palette="${i<4?1:i<8?2:i<11?3:i<15?4:5}" aria-label="Read chapter ${i+1}: ${esc(ch.title)}">
   <span class="bk-ref-number">${String(i+1).padStart(2,'0')}</span><strong>${esc(ch.title)}</strong>
   <small>${page?'Book p. '+page+' · ':''}${detailed?'Full Chapter 1 notes':'Original chapter guide'}<span>${readParts}/${ch.sections.length} parts reviewed${isRead?' · Chapter read':''}</span></small>
  </button>`;
 }).join(''):'';
 const icon=(kind)=>kind==='menu'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>':
  kind==='home'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3z"/></svg>':
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 13h8M8 17h8"/></svg>';
 return `<section class="bk-shelf bk-reference-library" aria-label="Indexed psychology library">
  <header class="bk-ref-topbar">
   <div class="bk-ref-top-start"><button type="button" class="bk-ref-icon" data-book-action="bookMenu" aria-label="Browse books and chapters">${icon('menu')}</button>
    <button type="button" class="bk-ref-icon" data-tab="today" aria-label="Home">${icon('home')}</button>
    <span class="bk-ref-logo">P.</span><span class="bk-ref-brand">PsychDesk Reader</span></div>
   <div class="bk-ref-top-brand"><strong>${esc(book?.subject||'Psychology')}</strong><small>Your reading library</small></div>
   <div class="bk-ref-top-end"><button type="button" class="bk-ref-icon" data-tab="files" aria-label="Drive files">${icon('doc')}</button>
    <button type="button" class="bk-ref-icon" data-tab="reader" aria-label="PDF reader">${icon('doc')}</button>
    <button type="button" class="bk-ref-icon bk-ref-aa" data-book-action="readingAppearance" aria-label="Reading appearance">Aa</button></div>
  </header>
  <div class="bk-ref-body">
   <div class="bk-ref-heading"><div><p class="bk-ref-overline">PsychDesk reading room · Your textbooks</p><h1>Reading library</h1></div>
    <p>A quiet, source-based companion to your study books. Not a copied textbook, with reading progress and private notes linked to your account.</p></div>
   <section class="bk-ref-feature" aria-label="Biological Psychology study companion" style="margin:0 0 30px;min-height:310px">
    <div class="bk-ref-cover" aria-hidden="true" style="background:linear-gradient(145deg,#263947,#17232c);border-color:#394955"><small>PsychDesk · Reading companion</small><strong>Biological Psychology</strong><span>James W. Kalat · 14th Edition</span></div>
    <div class="bk-ref-feature-content"><p class="bk-ref-overline">Complete classroom notes</p><h2>Biological Psychology</h2>
      <p class="bk-ref-description">Study all 14 chapters with 448 topic explanations, 42 modules, and 41 illustrated textbook figures. Designed for focused desktop reading with a collapsible contents panel.</p>
      <div class="bk-ref-tags"><span>14 chapters</span><span>448 topic notes</span><span>41 illustrations</span></div>
      <div class="bk-ref-feature-actions"><a href="./biological-psychology-14e.html" class="bk-ref-primary" style="display:inline-flex;align-items:center;text-decoration:none">Open complete study notes</a></div>
      <p style="font-size:11px;color:#5f6059;margin-top:14px">This separate book companion saves progress, notes and highlights in this browser; Google-account sync has not yet been connected.</p>
    </div>
   </section>
   ${catalogError?'<p class="bk-empty" role="alert">The indexed book catalog could not be opened.</p>':''}
   ${book?`<section class="bk-ref-feature" aria-label="Current book">
    <div class="bk-ref-cover" aria-hidden="true"><small>PsychDesk · Psychology</small><strong>${esc(book.subject)}</strong><span>Reading companion · ${esc(book.edition)}</span></div>
    <div class="bk-ref-feature-content"><p class="bk-ref-overline">${latest?.id===book.id?'Your current book':'Your selected book'}</p><h2>${esc(book.subject)}</h2>
     <p class="bk-ref-description">${esc(book.author)}. ${esc(book.description||'A calmer way to study with focused reading, a chapter index and your own notes.')}</p>
     <div class="bk-ref-tags"><span>${book.chapters.length} chapters indexed</span><span>${book.id==='psychopathology-9e'?'695 textbook headings':book.sections.length+' reading parts'}</span><span>${book.sections.filter(p=>p.kind==='detailed').length} detailed reading parts</span></div>
     <div class="bk-ref-feature-actions"><button type="button" class="bk-ref-primary" data-book-action="open" data-book-id="${esc(book.id)}">Continue reading</button>
     <button type="button" class="bk-ref-secondary" data-book-action="viewChapters">View chapters</button></div>
     <div class="bk-ref-progress"><strong>${progress.percent}% through the book</strong><span> · ${progress.done} read · ${progress.remaining} remaining</span></div>
     <div class="bk-ref-progress-track" role="progressbar" aria-label="Chapter progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><span style="width:${progress.percent}%"></span></div>
    </div></section>`:'<p class="bk-empty">Your verified study books will appear here.</p>'}
   ${book?`<section class="bk-ref-chapters" id="bk-chapters" aria-labelledby="bk-chapters-heading"><div class="bk-ref-section-heading">
    <h2 id="bk-chapters-heading">Chapters in this book</h2><p>${book.id==='psychopathology-9e'?'Chapter 1: detailed draft · Others: source-based guides':'Detailed notes and source-based guides'}</p>
    </div><div class="bk-ref-chapter-grid">${chapters}</div></section>`:''}
   ${catalog.length>1?`<section class="bk-ref-book-list" id="bk-book-list" aria-labelledby="bk-books-title"><div class="bk-ref-section-heading"><h2 id="bk-books-title">Your books</h2><p>Choose a book to view its chapters</p></div>
    <div class="bk-filter"><label for="bk-search">Search books</label><input type="search" id="bk-search" value="${esc(shelfQuery)}" placeholder="Find a psychology book">
     <label for="bk-subject">Browse by subject</label><select id="bk-subject"><option value="">All subjects</option>${subjects.map(v=>'<option value="'+esc(v)+'"'+(shelfSubject===v?' selected':'')+'>'+esc(v)+'</option>').join('')}</select></div>
    <div class="bk-grid">${visible.map(b=>{const p=progressFor(b);return `<article class="bk-book-card"><button type="button" class="bk-cover" data-book-action="open" data-book-id="${esc(b.id)}" aria-label="Read ${esc(b.title)}"><small>${esc(b.subject)}</small><strong>${esc(b.title)}</strong><span>${esc(b.edition)}</span></button><div class="bk-book-detail"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><span class="bk-chapter-metric">${p.done} of ${p.total} chapters read · ${p.remaining} remaining</span><div class="bk-chapter-track" role="progressbar" aria-label="${esc(b.title)} chapters read" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.percent}"><span style="width:${p.percent}%"></span></div><button type="button" class="bk-ref-view-book" data-book-action="selectBook" data-book-id="${esc(b.id)}">View chapters</button></div></article>`}).join('')}</div>
    ${visible.length?'':'<p class="bk-empty">No indexed books match your search.</p>'}</section>`:''}
   <section class="bk-ref-achievements" aria-label="Your reading achievements"><div class="bk-hero-stats"><div><strong>${catalog.length}</strong><span>Books</span></div><div><strong>${doneAll}</strong><span>Chapters read</span></div><div><strong>${remainingAll}</strong><span>Remaining</span></div></div>
    <div class="bk-milestones"><p class="bk-ref-overline">Your reading achievements</p>${earned.length?'<div class="bk-earned">'+earned.map(x=>'<span>✦ '+esc(x)+'</span>').join('')+'</div>':'<p class="bk-unearned">Finish your first chapter to earn a milestone.</p>'}
    <small>${esc(sync)}</small></div></section>
   <nav class="bk-ref-links" aria-label="Other library spaces"><button type="button" data-tab="files">Drive files</button><button type="button" data-tab="reader">PDF reader</button><button type="button" data-tab="research">References</button></nav>
  </div></section>`;
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
   <div class="field"><label>Page tone</label><select name="theme">${[['sepia','Warm paper'],['white','White'],['dark','Dark']].map(([value,label]) =>
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
  if (action === 'openPart') {const book=lookup(control.dataset.bookId),part=book?.sections.find(p=>p.id===control.dataset.partId);if(book&&part)navigate(book,part);return;}
  if (action === 'selectBook') {if(lookup(control.dataset.bookId)){shelfBookId=control.dataset.bookId;history.pushState(null,'','#books/'+shelfBookId);readRoute();document.querySelector('.bk-reference-library')?.scrollIntoView({block:'start'});}return;}
  if (action === 'viewChapters') {document.querySelector('#bk-chapters')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
  if (action === 'bookMenu') {document.querySelector(catalog.length>1?'#bk-book-list':'#bk-chapters')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
  if (action === 'readingAppearance') {const book=lookup(shelfBookId)||latestBook()||catalog[0];if(book){open(book.id);appearance(book);}return;}
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
