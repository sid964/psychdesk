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
  assert.equal((html.match(/class="nav-item(?: active)?"/g) || []).length, 5);
  assert.match(script, /MutationObserver/);
  assert.match(script, /setAttribute\('aria-current', 'page'\)/);
  assert.match(script, /removeAttribute\('aria-current'\)/);
});

test('new assets are cached with a changed version', () => {
  const sw = read('sw.js');
  assert.match(sw, /psychdesk-library-reference-v102/);
  assert.match(sw, /'\.\/design-system\.css'/);
  assert.match(sw, /'\.\/design-accessibility\.js'/);
});

test('homepage protects the living world but hides optional material until requested',()=>{
 const home=read('autopilot/studio.js');
 const archive=home.indexOf('class="home-archive"'),stories=home.indexOf('class="garden-stories"');
 assert.ok(archive>-1&&stories>archive);
 assert.match(home,/class="home-shortcuts"/);
 assert.match(home,/class="garden-path-marker studio-garden-context"/);
 assert.match(home,/Start <em>studying\.<\/em>/);
 assert.doesNotMatch(home,/PsychDeskPhase6\?\.homeCard\?/);
 assert.doesNotMatch(home,/class="garden-tool-drawer"/);
 assert.doesNotMatch(home,/class="studio-study-paths"/);
 assert.match(home,/saved in the garden/);
});

test('desktop and mobile share five primary routes, with advanced tools still reachable',()=>{
 const html=read('index.html');
 const desktop=html.split('<nav class="rail-nav"')[1].split('</nav>')[0];
 const mobile=html.split('<nav class="bottom-nav"')[1].split('</nav>')[0];
 const routes=['today','psychology','notes','materials','focus'];
 const top=desktop.split('<details class="rail-more">')[0];
 for(const markup of [top,mobile]){
  const indexes=routes.map(route=>markup.indexOf('data-tab="'+route+'"'));
  assert.ok(indexes.every(index=>index>=0));
  assert.deepEqual(indexes,indexes.slice().sort((a,b)=>a-b));
 }
 for(const route of ['tools','planner','recall','connections','ink','university'])assert.ok(desktop.includes('data-tab="'+route+'"'));
 assert.match(desktop,/<summary>More tools<\/summary>/);
 assert.doesNotMatch(html,/class="rail-quote"/);
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
  assert.match(home, /Back to <em>reading\.<\/em>/);
  assert.match(home, /studio-garden-context/);
  assert.match(session, /'Open library'/);
  assert.match(html, /design-system\.css\?v=personal-desk-1/);
  assert.match(html, /autopilot\/studio\.js\?v=phase2-home-1/);
  assert.match(html, /study-session\.js\?v=books-1/);
});

test('personal desk uses only existing records to explain the last reading and notebook', () => {
  const home=read('autopilot/studio.js');
  const css=read('design-system.css');
  assert.match(home, /Page /);
  assert.match(home, /h\(shortTitle\(resume\.title\)\)/);
  assert.match(home, /const notebookCard=continuation/);
  assert.match(home, /const hasHistory=Boolean\(recent\|\|resume\|\|safeSaved\(\)\.length\)/);
  assert.match(home, /function gardenStatusMarkup\(/);
  assert.match(home, /data-auto="garden"/);
  assert.match(home, /saved in the garden/);
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
