# Private book suggestions — owner setup

The live homepage has a **Suggest a book** button. Its destination is intentionally disabled until a privately owned upload form exists. This avoids telling visitors that their PDF was received when it was not.

## Setup (free, no Firebase Storage or paid backend)

1. In your own Google account open [Google Forms](https://forms.google.com) and create **PsychDesk book suggestions**.
2. Add a required short-answer question **Book title**, an optional short-answer **Author**, and a required **File upload** question **PDF of the book**.
3. Restrict the file upload to **PDF**, maximum **one file**, and choose a size limit your Google Drive can accommodate. Google Forms stores files in the form owner's Drive. Respondents must sign in with Google to upload.
4. In **Publish / Send**, copy the **respondent link** (typically `https://docs.google.com/forms/d/e/.../viewform` or `https://forms.gle/...`), not the editor link.
5. Set the public respondent URL as `window.PSYCHDESK_BOOK_SUGGESTION_FORM_URL` in `book-suggestions.config.js`, commit and deploy.
6. Test with a different Google account and a sample **PDF**. Confirm that the title, author, and file appear in your form's Responses and owner Drive before announcing submissions are open.

Never add a service-account private key, Google credentials, or a public writable cloud bucket to this repository. Avoid public GitHub issues for submitted textbook PDFs.

**Note:** Upload forms require Google account sign-in. The form needs to be created or configured by the receiving account owner; GitHub Pages cannot create a private upload destination itself.
