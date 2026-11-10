const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('design skill is a standalone final stylesheet using the approved UI typeface', () => {
  const html = read('index.html');
  const css = read('design-system.css');
  assert.match(html, /family=Manrope:wght@400;500;600;700/);
  assert.match(html, /garden-refresh\.css[^"]*"><link rel="stylesheet" href="design-system\.css/);
  assert.doesNotMatch(html, /family=DM\+Sans/);
  assert.match(css, /--pd-font:\s*"Manrope"/);
  assert.match(css, /--pd-ease:\s*cubic-bezier\(\.22,1,\.36,1\)/);
  assert.match(css, /#000000/);
  assert.match(css, /#f6f3eb/);
});

test('mobile design preserves the garden with usable typography and reduced motion', () => {
  const css = read('design-system.css');
  assert.match(css, /\.garden-home \.garden-landing/);
  assert.match(css, /\.garden-home \.garden-art-wrap/);
  assert.match(css, /@media \(max-width:570px\)/);
  assert.match(css, /font-size:36px!important;line-height:40px!important/);
  assert.match(css, /font-size:16px!important;line-height:24px!important/);
  assert.match(css, /@media \(max-width:390px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(read('autopilot/garden.css'), /garden-canopy/);
});

test('accessible tab announcement does not replace route and settings handlers', () => {
  const html = read('index.html');
  const script = read('design-accessibility.js');
  assert.match(html, /id="settingsBtn"/);
  assert.match(html, /id="main"/);
  assert.equal((html.match(/class="nav-item(?: active)?"/g) || []).length, 4);
  assert.match(script, /MutationObserver/);
  assert.match(script, /setAttribute\('aria-current', 'page'\)/);
  assert.match(script, /removeAttribute\('aria-current'\)/);
});

test('new assets are cached with a changed version', () => {
  const sw = read('sw.js');
  assert.match(sw, /psychdesk-study-adoption-open-desk-motion-v76/);
  assert.match(sw, /'\.\/design-system\.css'/);
  assert.match(sw, /'\.\/design-accessibility\.js'/);
});

test('homepage now puts notebook and concept before the optional next step', () => {
  const home = read('autopilot/studio.js');
  const garden = home.indexOf('class="garden-path-marker studio-garden-context"');
  const stories = home.indexOf('class="garden-stories"');
  const next = home.indexOf('(window.PsychDeskPhase6?.homeCard?.()||');
  const tools = home.indexOf('class="studio-quiet-tools garden-tool-drawer"');
  assert.ok(garden > -1 && stories > garden && next > stories && tools > next);
  assert.match(home, /A place for <em>your ideas\.<\/em>/);
  assert.doesNotMatch(home, /class="garden-scene-footer"/);
  assert.match(home, /saved in your garden/);
});

test('desktop navigation is ordered around everyday study and remains complete', () => {
  const html = read('index.html');
  const source = html.split('<nav class="rail-nav"')[1].split('</nav>')[0];
  const routes = ['today', 'notes', 'materials', 'planner', 'focus', 'tools'];
  const indexes = routes.map(route => source.indexOf('data-tab="' + route + '"'));
  assert.ok(indexes.every(x => x >= 0));
  assert.deepEqual(indexes, indexes.slice().sort((a, b) => a - b));
  for (const route of ['ink','connections','university','psychology']) {
    assert.match(source, new RegExp('data-tab="' + route + '"'));
  }
});

test('mobile header retains brand and five operable controls', () => {
  const css = read('design-system.css');
  const js = read('design-accessibility.js');
  assert.match(css, /\.topbar \.brand strong\{display:block!important/);
  assert.match(css, /\.topbar \.account-chip::before/);
  assert.match(css, /\.topbar \.drive-status-chip\[data-state="ready"\]/);
  assert.match(js, /Google account and sync:/);
  assert.match(js, /accountObserver\.observe\(account/);
  assert.match(read('index.html'), /design-accessibility\.js\?v=design-skill-2/);
});

test('mobile landing compacts the first screen without removing the living garden', () => {
  const css = read('design-system.css');
  const home = read('autopilot/studio.js');
  const session = read('study-session.js');
  const html = read('index.html');
  assert.match(css, /Mobile garden composition/);
  assert.match(css, /grid-template-rows:auto auto!important/);
  assert.match(css, /width:min\(87%,295px\)!important/);
  assert.match(css, /filter:brightness\(\.96\) saturate\(1\.10\)!important/);
  assert.match(css, /\.garden-home \.garden-world-caption \{display:none!important\}/);
  assert.match(home, /Back to <em>your book\.<\/em>/);
  assert.match(home, /studio-garden-context/);
  assert.match(session, /'Open reading shelf'/);
  assert.match(html, /design-system\.css\?v=personal-desk-1/);
  assert.match(html, /autopilot\/studio\.js\?v=open-desk-motion-3/);
  assert.match(html, /study-session\.js\?v=mobile-home-3/);
});

test('personal desk uses only existing records to explain the last reading and notebook', () => {
  const home=read('autopilot/studio.js');
  const css=read('design-system.css');
  assert.match(home, /You stopped at page /);
  assert.match(home, /h\(shortTitle\(resume\.title\)\)/);
  assert.match(home, /const notebookCard=continuation/);
  assert.match(home, /const hasHistory=Boolean\(recent\|\|resume\|\|safeSaved\(\)\.length\)/);
  assert.match(home, /function gardenStatusMarkup\(/);
  assert.match(home, /data-auto="garden"/);
  assert.match(home, /saved in your garden/);
  assert.doesNotMatch(home, /class="garden-bloom-line"/);
  assert.match(css, /Personal desk: actual last reading/);
  assert.match(css, /\.studio-garden-context \.studio-garden-open/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('memory postcard is opt-in and derived only from saved curated concepts', () => {
  const home=read('autopilot/studio.js');
  const css=read('design-system.css');
  assert.match(home, /function postcard\(\)/);
  assert.match(home, /const older=safeSaved\(\)\.filter/);
  assert.match(home, /Date\.now\(\)-Date\.parse\(x\.savedAt\)>2\*86400000/);
  assert.match(home, /id="studioMemoryPostcard"/);
  assert.match(home, /postcardSlot\.innerHTML=postcard\(\)/);
  assert.match(home, /data-auto="postcard"/);
  assert.match(css, /\.studio-memory-postcard-slot:empty\{display:none\}/);
  assert.match(css, /\.studio-postcard\{/);
});
