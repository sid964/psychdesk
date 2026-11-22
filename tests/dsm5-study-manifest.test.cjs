'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/dsm5-2013-study-manifest.json'), 'utf8'));
test('DSM-5 staging manifest is intact and not presented as a released book', () => {
  assert.equal(manifest.edition, 'DSM-5 (2013)');
  assert.equal(manifest.releaseStatus, 'AUDIT_ONLY_NOT_PUBLISHED');
  assert.equal(manifest.entryCount, 392);
  assert.equal(manifest.entries.length, manifest.entryCount);
  assert.equal(new Set(manifest.entries.map(entry => entry.id)).size, manifest.entries.length);
  assert.equal(manifest.classificationCandidateAudit.unresolved, 0);
  assert.equal(manifest.classificationCandidateAudit.reviewed,
    manifest.classificationCandidateAudit.directlyLinked
    + manifest.classificationCandidateAudit.ocrAliases
    + manifest.classificationCandidateAudit.groupHeaders
    + manifest.classificationCandidateAudit.ocrFragments);
  assert.ok(manifest.fullOriginalNoteRewritesOutstanding > 0, 'Do not silently label incomplete editorial work as finished');
  for (const entry of manifest.entries) {
    assert.match(entry.id, /^dsm5-2013-[a-z0-9-]+$/);
    assert.ok(entry.title.trim());
    assert.ok(entry.printedPage === null || (Number.isInteger(entry.printedPage) && entry.printedPage >= 1));
    assert.ok(entry.pdfViewerPage === null || (Number.isInteger(entry.pdfViewerPage) && entry.pdfViewerPage >= 1));
    assert.equal(Object.hasOwn(entry, 'criteria'), false, 'Publisher-owned diagnostic criteria must not be bundled');
  }
});
