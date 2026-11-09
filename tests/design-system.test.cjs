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
  assert.match(sw, /psychdesk-study-adoption-midnight-sage-v70/);
  assert.match(sw, /'\.\/design-system\.css'/);
  assert.match(sw, /'\.\/design-accessibility\.js'/);
});
