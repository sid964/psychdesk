# Library reading sync — manual acceptance checklist

The automated tests use simulated Google accounts and local fixture PDFs. **Do not call real Google sign-in, Drive restoration, or cross-device behavior verified until someone completes these steps on the published site.**

## Before trying changes

1. Open PsychDesk and download a Settings/Account JSON safety backup of study data.
2. Confirm the Google account badge is **✓ Synced**, not *Awaiting sync* or *Conflict*.
3. Keep a copy of the original PDF in Drive. The indexed books use companion text, not the original PDF bytes.

## Indexed chapter progress (two real devices)

1. Sign into the same Google account on Device A. Navigate to Library → Psychopathology.
2. Open a chapter and return to the bookshelf. Confirm its chapter count **does not** increase merely from visiting.
3. Mark the chapter read; verify the book's **read** and **remaining** counts change and a milestone appears when earned.
4. Wait until the account badge actually says **✓ Synced**.
5. Sign into the **same Google account** on Device B. Confirm chapter status, progress, last reading position and milestones match.
6. Undo the mark on A, wait for sync, and confirm B shows the updated count on reload.
7. Sign out on B and use a different test account. Confirm the other account cannot see the first account's progress.

## Drive PDF reading

1. With Drive authorized, open an existing uploaded PDF via Library → Drive files → Read & highlight.
2. Go to a later page and verify the reader retains the original PDF layout.
3. Close and reopen the PDF, and then reopen on a second signed-in device. Check the saved page resumes. Local PDFs selected with the device file picker should *not* sync file names or bytes.
4. Save one highlight and a notebook note, then confirm they still exist after a refresh. Use a scanned PDF to verify the selectable-text limitation is explained.

## Offline / conflicts / data protection

1. Load the site online, disconnect from the network, read and mark a chapter, then reconnect. Verify the badge reports a pending local change until cloud sync succeeds.
2. With two devices, edit different progress while one is offline. Confirm a conflict is surfaced rather than silently replacing either version.
3. Export a fresh backup, and verify the existing Notes, Ink, Flashcards, Drive file catalogue and older Psychopathology lessons remain accessible.
4. Test at mobile and laptop widths; test keyboard focus in the chapter index, PDF toolbar and Drive files navigation.

Manual results: **Not performed by automation.** Record the date, device, browser, account-state screenshots and pass/fail for each scenario before changing this status.
