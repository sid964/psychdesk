# PsychDesk interface

The study desk starts with the last note or reading position. A first visit offers a new note. The daily concept follows, and saved concepts and their garden sit behind a disclosure. Use plain action names and put subject, page, or note title next to the action it describes.

Keep the AMOLED canvas black and use neutral raised surfaces. Warm Paper uses dark brown text and soft paper backgrounds. Keep Fraunces for headings and DM Sans for controls and supporting text. The shared study tokens in `study-desk.css` define the paper, text, contrast, spacing, and 44px target used by the redesigned screens. Layouts wrap in normal flow, with the existing desktop rail and mobile bottom navigation. Keep the reading surface comfortable and allow book and note titles to wrap. Use the existing navigation and dialog motion and respect the system motion setting.

## Codex project setup

Run `bash scripts/install-design-skills.sh` once per checkout before opening it in Codex. The pinned sources install to `.agents/skills/` and are discovered from that checkout in later sessions. The script fetches files with Git, checks the expected revisions and skill names, and leaves existing installations in place. It does not run third-party installers or hooks. The downloaded assets stay out of the public GitHub Pages source tree.

| Skill | Responsibility |
| --- | --- |
| `frontend-design` | Set the notebook-first hierarchy and decide where the visual emphasis goes. |
| `ui-ux-pro-max` | Review the palette, readable text, control sizes, breakpoints, and keyboard behavior. |
| `design-taste-frontend` | Check for repeated slogans, decorative motion, and interchangeable cards. |
| `impeccable` | Refine spacing, interaction feedback, reading surfaces, and small-screen behavior. |
| `web-design-guidelines` | Review keyboard focus, form labels, semantic controls, and reduced motion. |

Use the shared direction when guidance overlaps. The work surfaces take priority over marketing layouts and decorative effects.
