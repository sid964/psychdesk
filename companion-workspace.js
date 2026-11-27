/* Keep legacy study companions in the live PsychDesk shell.
   A single same-origin frame isolates their existing CSS, scripts and storage. */
(() => {
  'use strict';
  const books = Object.freeze({
    'biological-psychology-14e': 'Biological Psychology',
    'psychopathology-9e': 'Psychopathology',
    'singh-research-methods': 'Research Methods',
    'dsm5-2013': 'DSM-5',
    'counseling-psychotherapy-corey-9e': 'Theory and Practice of Counseling and Psychotherapy'
  });
  const root = new URL('./', document.baseURI);
  const main = document.getElementById('main');
  if (!main) return;
  let frame, active, previousFocus, scroll = 0, previousCrumb = '', timer, routePoll, focused = false;
  const own = id => Object.prototype.hasOwnProperty.call(books, id);
  const route = () => {
    const match = /^#companion\/([a-z0-9-]+)(?:\/(.*))?$/.exec(location.hash);
    if (!match || !own(match[1])) return null;
    try { return { id: match[1], anchor: decodeURIComponent(match[2] || '') }; }
    catch { return null; }
  };
  const bookURL = (id, anchor = '') => {
    const url = new URL(id + '.html', root);
    url.hash = anchor;
    return url;
  };
  const host = document.createElement('section');
  host.id = 'companionWorkspace';
  host.hidden = true;
  host.setAttribute('aria-label', 'Book reading workspace');
  host.innerHTML = '<header class="companion-toolbar"><button type="button" class="companion-back">‹ Bookshelf</button><h1 tabindex="-1"></h1><button type="button" class="companion-tools-toggle" aria-expanded="false" aria-controls="companionTools">Study tools</button><button type="button" class="companion-focus" aria-pressed="false">Focus mode</button><a class="companion-standalone" target="_blank" rel="noopener">Open separately ↗</a></header><div class="companion-body"><div class="companion-frame-slot"><p class="companion-status" role="status" hidden></p></div><aside id="companionTools" class="companion-tools" aria-label="Study tools" hidden><div class="companion-resizer" role="separator" aria-label="Study tools width" aria-orientation="vertical" tabindex="0" aria-valuemin="260" aria-valuemax="480" aria-valuenow="320"></div><div class="companion-tool-content"><h2>Dictionary</h2><label for="companionLookup">Look up a concept</label><input id="companionLookup" type="search" placeholder="Search your bookshelf" autocomplete="off"><div id="companionLookupResults" aria-live="polite"></div><section class="companion-notes"><h2>Sticky notes</h2><form id="companionNoteForm"><label for="companionNote">Capture a thought</label><textarea id="companionNote" rows="4" maxlength="4500" required></textarea><button type="submit">Save note</button><p id="companionNoteStatus" role="status"></p></form><div id="companionRecentNotes"></div></section></div></aside></div>';
  main.after(host);
  const title = host.querySelector('h1');
  const back = host.querySelector('.companion-back');
  const focus = host.querySelector('.companion-focus');
  const standalone = host.querySelector('.companion-standalone');
  const slot = host.querySelector('.companion-frame-slot');
  const status = host.querySelector('.companion-status');
  const shell = main.closest('.app-shell');
  const railToggle = document.querySelector('.academic-rail-toggle');
  railToggle?.addEventListener('click', () => {
    const collapsed = shell.classList.toggle('academic-rail-collapsed');
    railToggle.setAttribute('aria-expanded', String(!collapsed));
    railToggle.setAttribute('aria-label', collapsed ? 'Expand workspace navigation' : 'Collapse workspace navigation');
    railToggle.title = collapsed ? 'Expand navigation' : 'Collapse navigation';
    railToggle.textContent = collapsed ? '»' : '«';
  });
  const toolsToggle = host.querySelector('.companion-tools-toggle');
  const tools = host.querySelector('#companionTools');
  const lookup = host.querySelector('#companionLookup');
  const results = host.querySelector('#companionLookupResults');
  const note = host.querySelector('#companionNote');
  const noteStatus = host.querySelector('#companionNoteStatus');
  const recent = host.querySelector('#companionRecentNotes');
  const resizer = host.querySelector('.companion-resizer');
  const core = () => window.PsychDeskCore;
  const textNode = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
  let toolsOpen = false;
  let width = 320;
  function setTools(value) {
    toolsOpen = value;
    tools.hidden = !value || focused;
    toolsToggle.setAttribute('aria-expanded', String(value && !focused));
    if (value && !focused) { renderLookup(); renderNotes(); }
  }
  function renderLookup() {
    results.replaceChildren();
    const q = lookup.value.trim().toLocaleLowerCase();
    if (q.length < 2) { results.append(textNode('p', 'Search indexed textbook headings or existing glossary terms.')); return; }
    const entries = (window.PsychDeskKnowledge?.findTerms(q, 'All', false) || []).slice(0, 4);
    for (const item of entries) {
      const section = document.createElement('article');
      section.append(textNode('h3', item.term), textNode('p', item.definition), textNode('small', 'Psychology Dictionary · ' + (item.category || 'General')));
      results.append(section);
    }
    const rows = (window.PsychDeskBiologicalIndex || []).filter(item => [item.term,item.chapter,item.module,item.summary].join(' ').toLocaleLowerCase().includes(q)).slice(0, 6);
    if (rows.length) results.append(textNode('h3', 'From Biological Psychology'));
    for (const item of rows) {
      const link = document.createElement('a');
      link.href = bookURL('biological-psychology-14e').href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.append(textNode('strong', item.term), textNode('small', [item.chapter, item.module, item.page ? 'p. ' + item.page : ''].filter(Boolean).join(' · ')));
      results.append(link);
    }
    if (!entries.length && !rows.length) results.append(textNode('p', 'No matching entries.'));
  }
  function renderNotes() {
    recent.replaceChildren();
    const rows = (core()?.getData()?.stickies || []).filter(n => !n.part).slice().sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))).slice(0, 4);
    if (!rows.length) recent.append(textNode('p', 'No saved sticky notes yet.'));
    for (const item of rows) {
      const article = document.createElement('article');
      article.append(textNode('h3', item.title || 'Sticky note'), textNode('p', item.rawText || (item.lines || []).join(' ')));
      recent.append(article);
    }
  }
  toolsToggle.addEventListener('click', () => setTools(!toolsOpen));
  lookup.addEventListener('input', renderLookup);
  host.querySelector('#companionNoteForm').addEventListener('submit', event => {
    event.preventDefault();
    const api = core(), value = note.value.trim();
    if (!api || !value || !active) return;
    const cards = window.PsychDeskStickies?.generate(value, books[active.id], '', 'cream', api.id(), []) || [];
    if (!cards.length) { noteStatus.textContent = 'Note creator unavailable.'; return; }
    const data = api.getData(), before = data.stickies;
    data.stickies = [...(Array.isArray(before) ? before : []), ...cards];
    if (api.save() === false) { data.stickies = before; noteStatus.textContent = 'Unable to save. Your text is still here.'; return; }
    note.value = '';
    noteStatus.textContent = 'Saved to Sticky Notes.';
    renderNotes();
  });
  function resizeTools(value) {
    width = Math.max(260, Math.min(480, value));
    host.style.setProperty('--companion-tools-width', width + 'px');
    resizer.setAttribute('aria-valuenow', String(width));
  }
  resizer.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const start = event.clientX, initial = width;
    resizer.setPointerCapture(event.pointerId);
    host.classList.add('companion-resizing');
    const move = e => resizeTools(initial + start - e.clientX);
    const finish = () => { host.classList.remove('companion-resizing'); resizer.removeEventListener('pointermove', move); };
    resizer.addEventListener('pointermove', move);
    resizer.addEventListener('lostpointercapture', finish, {once:true});
  });
  resizer.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    resizeTools(event.key === 'Home' ? 260 : event.key === 'End' ? 480 : width + (event.key === 'ArrowLeft' ? 20 : -20));
  });
  function setFocus(value) {
    focused = value;
    shell?.classList.toggle('companion-focused', value);
    focus.setAttribute('aria-pressed', String(value));
    focus.textContent = value ? 'Exit focus' : 'Focus mode';
    toolsToggle.hidden = value;
    setTools(toolsOpen);
  }
  function syncFrameRoute() {
    if (!active || !frame || host.hidden) return;
    try {
      const url = new URL(frame.contentWindow.location.href);
      if (url.origin !== root.origin || url.pathname !== bookURL(active.id).pathname) return;
      standalone.href = url.href;
      const next = '#companion/' + active.id + (url.hash ? '/' + encodeURIComponent(url.hash.slice(1)) : '');
      if (location.hash !== next) history.replaceState(history.state, '', next);
      active.anchor = url.hash.slice(1);
    } catch { /* The standalone link remains available if the frame is inaccessible. */ }
  }
  function watchFrame() {
    if (!frame) return;
    clearTimeout(timer);
    status.hidden = true;
    try { frame.contentWindow.addEventListener('hashchange', syncFrameRoute); } catch {}
    syncFrameRoute();
  }
  function createFrame(target) {
    if (frame) frame.remove();
    active = { ...target };
    const src = bookURL(target.id, target.anchor);
    frame = document.createElement('iframe');
    frame.id = 'companionFrame';
    frame.title = books[target.id] + ' study companion';
    frame.src = src.href;
    frame.addEventListener('load', watchFrame);
    status.textContent = 'Opening ' + books[target.id] + '…';
    status.hidden = false;
    slot.append(frame);
    clearTimeout(timer);
    timer = setTimeout(() => {
      status.textContent = 'Still opening the book. You can also open it separately using the link above.';
    }, 15000);
  }
  function show(target) {
    const wasHidden = host.hidden;
    if (wasHidden) {
      previousFocus = document.activeElement;
      scroll = window.scrollY;
      previousCrumb = document.getElementById('railCurrentSection')?.textContent || 'Bookshelf';
    }
    host.hidden = false;
    main.hidden = true;
    shell?.classList.add('companion-open');
    title.textContent = books[target.id];
    if (toolsOpen && !focused) { renderLookup(); renderNotes(); }
    standalone.href = bookURL(target.id, target.anchor).href;
    if (!frame || active.id !== target.id || (target.anchor && active.anchor !== target.anchor)) {
      createFrame(target);
    } else {
      syncFrameRoute();
    }
    if (wasHidden) {
      // A companion may replace its own document after loading its text chunks.
      // Reconcile its URL even when document.open() removes the hash listener.
      clearInterval(routePoll);
      routePoll = setInterval(syncFrameRoute, 250);
      window.scrollTo({ top: 0, behavior: 'instant' });
      title.focus({ preventScroll: true });
    }
    const crumb = document.getElementById('railCurrentSection');
    if (crumb) crumb.textContent = books[target.id];
  }
  function hide() {
    if (host.hidden) return;
    clearInterval(routePoll);
    setFocus(false);
    host.hidden = true;
    main.hidden = false;
    shell?.classList.remove('companion-open');
    const crumb = document.getElementById('railCurrentSection');
    if (crumb && active && crumb.textContent === books[active.id]) crumb.textContent = previousCrumb;
    requestAnimationFrame(() => {
      if (!host.hidden) return;
      window.scrollTo({ top: scroll, behavior: 'instant' });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    });
  }
  function readRoute() {
    const target = route();
    if (target) show(target);
    else hide();
  }
  function navigate(id, anchor) {
    const next = '#companion/' + id + (anchor ? '/' + encodeURIComponent(anchor) : '');
    if (location.hash !== next) history.pushState(history.state, '', next);
    readRoute();
  }
  function exitToShelf() {
    const current = route();
    if (!current) return;
    // Explicit bookshelf navigation must not walk the iframe's chapter history.
    history.pushState({...history.state,psychdeskViewV1:{kind:'tab',tab:'today'}}, '', '#pd-today');
    hide();
    if (!main.querySelector('.desktop-bookshelf')) {
      scroll = 0;
      window.PsychDeskCore?.setTab('today');
    }
  }
  back.addEventListener('click', exitToShelf);
  focus.addEventListener('click', () => setFocus(!focused));
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const exhibit = event.target.closest?.('[data-explore-chapter]');
    if (exhibit) {
      const chapter = exhibit.dataset.exploreChapter, api = core();
      const rows = (window.PsychDeskBiologicalIndex || []).filter(item => item.chapter === chapter);
      const groups = new Map();
      for (const item of rows) {
        if (!groups.has(item.module)) groups.set(item.module, []);
        groups.get(item.module).push(item);
      }
      const escape = api.esc;
      const html = Array.from(groups, ([module,items]) => '<section class="academic-exhibit"><h3>'+escape(module)+'</h3><ul>'+items.map(item=>'<li>'+escape(item.term)+(item.page?' <small>· p. '+escape(String(item.page))+'</small>':'')+'</li>').join('')+'</ul></section>').join('');
      api.openModal(chapter, '<p>Indexed headings · Biological Psychology, 14th edition</p>'+html+'<p><a href="./biological-psychology-14e.html" data-exhibit-open>Open study companion →</a></p>');
      return;
    }
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, document.baseURI);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname) || url.search) return;
    const id = url.pathname.slice(root.pathname.length).replace(/\.html$/, '');
    if (!own(id) || url.pathname !== bookURL(id).pathname) return;
    event.preventDefault();
    if (link.hasAttribute('data-exhibit-open')) core()?.closeModal();
    navigate(id, url.hash.slice(1));
  }, true);
  window.addEventListener('hashchange', readRoute);
  window.addEventListener('popstate', readRoute);
  window.addEventListener('psychdesk:tab-changed', event => {
    if (host.hidden) return;
    if (route()) { const tab = event.tab || 'today'; history.pushState({...history.state,psychdeskViewV1:{kind:'tab',tab}}, '', '#pd-' + tab); }
    hide();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && focused && !document.querySelector('#modalRoot .modal')) setFocus(false);
  });
  let noteScope = core()?.getStorageKey();
  function refreshAccount() {
    const next = core()?.getStorageKey();
    if (noteScope !== next) {
      noteScope = next;
      note.value = '';
      noteStatus.textContent = '';
      lookup.value = '';
    }
    if (toolsOpen) { renderLookup(); renderNotes(); }
  }
  window.addEventListener('psychdesk:data-replaced', refreshAccount);
  window.addEventListener('psychdesk:account-ready', refreshAccount);
  window.addEventListener('psychdesk:changed', () => { if (toolsOpen) renderNotes(); });
  readRoute();
})();
