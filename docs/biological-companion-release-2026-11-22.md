# Biological Psychology comprehensive companion release — 2026-11-22

The existing PsychDesk bookshelf now links to the Final Comprehensive Study Edition: 14 chapters, 42 modules, 448 indexed textbook headings and 137 embedded figures. Edition-specific reading-state key, original chapter/part/topic IDs, notes and highlights are preserved.

## Bug fix
- Removed the floating **Hide contents / Show contents** pill that overlapped the reading-page breadcrumb/header.
- Reused the existing top-bar contents icon to open or collapse the desktop outline; narrower desktop widths continue to use the contents drawer.
- Retained the unobtrusive sidebar-header collapse control. No changes to colors, typography, reading layout, PDF reader, Google/Firebase integrations or other PsychDesk tools.

## GitHub Pages delivery
The wrapper `biological-psychology-14e.html` assembles 29 UTF-8 chunks from the versioned `biological-psychology-assets/comprehensive-20261122/` directory. Previous assets remain intact so that cached older loaders cannot load mixed old and new chunks.

## QA
Local standalone Chromium verification: 74/74 assertions passed at widths 1024, 1280, 1440, 1600 and 1920, including bookshelf chapter layout, sidebar show/hide, no overlap, search, diagrams, bookmarks, notes, completion, themes, PDF picker and simulated persistence. Repeat on a local HTTP server using `node tests/biological-companion-browser.cjs` for the versioned chunk loader.
