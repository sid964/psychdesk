# Psychopathology companion deployment — November 2026

## Scope
- Adds **Psychopathology: An Integrative Approach to Mental Disorders**, ninth edition (Barlow, Durand & Hofmann) to the *existing* PsychDesk Bookshelf, alongside Biological Psychology.
- Keeps the approved, standalone desktop study reader intact. Its assets are split into 23 lazy-loaded text chunks to avoid slowing normal app startup.
- Adds **25 original, accessible SVG study diagrams** in a small supplemental script. These are explanatory companion illustrations, not copies of the textbook's figures.
- Uses existing local PDF selection; **no publisher PDF pages, cover images, or other original textbook artwork are shipped**.

## Source and status
The base is the user's PsychDesk Psychopathology v6 reading companion:
- 16 indexed chapters, 78 reading modules.
- 588 indexed topic-level teaching drafts, with varying explanation depth.
- 121 original diagrams in v6, plus 25 supplemental diagrams = 146 total when loaded.
- Content remains **under academic review**, particularly source-by-source research and figure verification. Do not label the companion a fully verified or exhaustive reproduction of the source.

## State and compatibility
- Existing main-app authentication, Firestore snapshot data, and Book catalog records are untouched.
- The companion retains the stable local-storage key `psychdesk-reader:psychopathology:barlow-durand-hofmann:9e:9780357657843`.
- **Important limitation:** standalone companion reading progress currently persists in browser-local storage; the existing PsychDesk account/snapshot synchronization does not yet include this separate reader's internal state. Do not claim cloud sync until a bridge is implemented and tested.
- Opening the companion requires fetching its chunks once; the service worker caches chunks on demand for later offline reuse.

## Verification
- The companion regression test reconstructs all 23 chunks, parses the 16-chapter package, checks stable IDs/page links, executes the supplemental diagram generator and validates original SVG payloads.
- The existing Bookshelf test checks that Psychopathology appears without reviving an old abbreviated catalog.
- Check the live Books tab and open at least one module per chapter after publishing, including a new diagram; verify local PDF selection and browser storage separately.
