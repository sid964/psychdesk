# Add a book to PsychDesk

The Books tab in the Library is driven by `book-catalog.js`. For each reviewed edition, add one object to that list. Use lowercase letters, digits and hyphens for IDs. Keep IDs stable when correcting text. Give a new edition a new book ID. Choose the same subject name as the PsychDesk subject if drafts should use it by default.

```js
{
  id: 'example-first-edition',
  title: 'Example Book',
  author: 'Example Author',
  subject: 'Research Methods',
  edition: '1st edition',
  pdfOffset: 8, // Optional. PDF page = printed page + offset.
  chapters: [{
    id: 'first-chapter',
    title: 'First chapter',
    sections: [{
      id: 'first-reading',
      title: 'First reading',
      page: 1, // Optional. Omit to hide the source PDF action.
      blocks: [{
        id: 'opening',
        type: 'paragraph', // paragraph, heading or quote
        text: 'Use reviewed text approved for distribution.'
      }]
    }]
  }]
}
```

Book IDs are unique across the catalog, chapter and section IDs are unique within a book, and block IDs are unique within a section. Values are rendered as plain text. The Library reader checks the catalog at startup. A source link has the form `#books/<book-id>/<section-id>/<block-id>`; the block segment is optional. Keep it stable when adding later sections.

Run `node --test tests/book-reader.test.cjs` and open the Books tab in a local copy before publishing. Confirm the chapter and section links, printed page references, and page offset against the edition being added. Only publish material approved for public distribution. Readers choose PDF files locally.

The book package ships as part of the existing static site. When publishing a catalog update, change the service worker cache version and the catalog script version in `index.html`. Guest and account reading records are independent. Signed-in accounts use the existing PsychDesk snapshot sync and its existing conflict controls.
