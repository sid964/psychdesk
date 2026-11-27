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
  let frame, active, previousFocus, scroll = 0, previousCrumb = '', timer, focused = false;
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
  host.innerHTML = '<header class="companion-toolbar"><button type="button" class="companion-back">‹ Bookshelf</button><h1 tabindex="-1"></h1><button type="button" class="companion-focus" aria-pressed="false">Focus mode</button><a class="companion-standalone" target="_blank" rel="noopener">Open separately ↗</a></header><div class="companion-frame-slot"><p class="companion-status" role="status" hidden></p></div>';
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
  function setFocus(value) {
    focused = value;
    shell?.classList.toggle('companion-focused', value);
    focus.setAttribute('aria-pressed', String(value));
    focus.textContent = value ? 'Exit focus' : 'Focus mode';
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
    standalone.href = bookURL(target.id, target.anchor).href;
    if (!frame || active.id !== target.id || (target.anchor && active.anchor !== target.anchor)) {
      createFrame(target);
    } else {
      syncFrameRoute();
    }
    if (wasHidden) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      title.focus({ preventScroll: true });
    }
    const crumb = document.getElementById('railCurrentSection');
    if (crumb) crumb.textContent = books[target.id];
  }
  function hide() {
    if (host.hidden) return;
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
    history.pushState(history.state, '', location.pathname + location.search);
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
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, document.baseURI);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname) || url.search) return;
    const id = url.pathname.slice(root.pathname.length).replace(/\.html$/, '');
    if (!own(id) || url.pathname !== bookURL(id).pathname) return;
    event.preventDefault();
    navigate(id, url.hash.slice(1));
  }, true);
  window.addEventListener('hashchange', readRoute);
  window.addEventListener('popstate', readRoute);
  window.addEventListener('psychdesk:tab-changed', () => {
    if (host.hidden) return;
    if (route()) history.pushState(history.state, '', location.pathname + location.search);
    hide();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && focused && !document.querySelector('#modalRoot .modal')) setFocus(false);
  });
  readRoute();
})();
