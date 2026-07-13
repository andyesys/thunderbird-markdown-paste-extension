/**
 * Extensive coverage of single-line vs multi-line vs block-level Markdown
 * paste rendering — guards specifically against the "single-line pasted
 * content is pushed to a new line" regression (fixed in
 * renderMarkdownToSafeHtml() by using marked.parseInline()+<span> for
 * inline-only content instead of marked.parse()/parser()+<div>).
 *
 * All assertions run against the real composescript.js + vendored
 * libraries via tests/helpers/compose-env.js — nothing here reimplements
 * the parsing/classification logic.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { renderPastedText } = require("./helpers/compose-env");

// ---------------------------------------------------------------------
// Inline-only content: must stay inline (no <p>, no <div> wrapper) so it
// doesn't force a line break when pasted mid-line.
// ---------------------------------------------------------------------

test("inline: bare email address pasted mid-line stays on the same line", () => {
  const html = renderPastedText("abc@test.org", { initialHtml: "Contact: " });
  assert.equal(
    html,
    'Contact: <span class="markdown-paste-content" data-markdown-source="abc@test.org"><a href="mailto:abc@test.org">abc@test.org</a></span>'
  );
});

test("inline: bare URL pasted mid-line stays on the same line", () => {
  const html = renderPastedText("https://esys.eu", { initialHtml: "Site: " });
  assert.match(html, /^Site: <span class="markdown-paste-content"/);
  assert.ok(!html.includes("<div"), "must not wrap URL in a block <div>");
  assert.ok(!html.includes("<p>"), "must not wrap URL in a <p>");
  assert.match(html, /<a href="https:\/\/esys\.eu">https:\/\/esys\.eu<\/a>/);
});

test("inline: plain sentence with no Markdown syntax stays inline", () => {
  const html = renderPastedText("just a plain sentence", {
    initialHtml: "Note: ",
  });
  assert.equal(
    html,
    'Note: <span class="markdown-paste-content" data-markdown-source="just a plain sentence">just a plain sentence</span>'
  );
});

test("inline: sentence with **bold** stays inline (no <p>/<div>)", () => {
  const html = renderPastedText("please read **carefully**", {
    initialHtml: "Note: ",
  });
  assert.ok(html.startsWith('Note: <span class="markdown-paste-content"'));
  assert.match(html, /<strong>carefully<\/strong>/);
  assert.ok(!html.includes("<p>") && !html.includes("<div"));
});

test("inline: sentence with `code` span stays inline", () => {
  const html = renderPastedText("run `npm test` first", { initialHtml: "" });
  assert.match(html, /^<span class="markdown-paste-content"/);
  assert.match(html, /<code>npm test<\/code>/);
});

test("inline: sentence with _italic_ stays inline", () => {
  const html = renderPastedText("this is _important_", { initialHtml: "" });
  assert.match(html, /<em>important<\/em>/);
  assert.ok(!html.includes("<p>"));
});

test("inline: Markdown link [text](url) stays inline", () => {
  const html = renderPastedText("see [the docs](https://example.com/docs)", {
    initialHtml: "",
  });
  assert.match(
    html,
    /<a href="https:\/\/example\.com\/docs">the docs<\/a>/
  );
  assert.ok(!html.includes("<p>") && !html.includes("<div"));
});

test("inline: mixed content (bold + link + email on one line) stays inline", () => {
  const text = "**Important**: contact [support](https://esys.eu) or abc@test.org";
  const html = renderPastedText(text, { initialHtml: "" });
  assert.match(html, /^<span class="markdown-paste-content"/);
  assert.match(html, /<strong>Important<\/strong>/);
  assert.match(html, /<a href="https:\/\/esys\.eu">support<\/a>/);
  assert.match(html, /<a href="mailto:abc@test\.org">abc@test\.org<\/a>/);
});

test("inline: pasted content preserves data-markdown-source with escaped HTML-special characters", () => {
  const html = renderPastedText('a < b && "quoted"', { initialHtml: "" });
  // jsdom re-serializes the attribute value; "<" does not strictly need
  // escaping inside an already-double-quoted attribute so it round-trips
  // as a literal "<" character.
  assert.match(
    html,
    /data-markdown-source="a < b &amp;&amp; &quot;quoted&quot;"/
  );
});

// ---------------------------------------------------------------------
// Multi-line plain text (no block syntax): intentional behavior change —
// still classified as a single inline "paragraph" token by marked's
// lexer, so it now renders inline (via parseInline()) with <br> between
// lines, instead of being wrapped in a block <p>. This is NOT a bug.
// ---------------------------------------------------------------------

test("multiline plain text (no block syntax) renders inline with <br>, not a block <p>", () => {
  const html = renderPastedText("line one\nline two\nline three", {
    initialHtml: "",
  });
  assert.match(html, /^<span class="markdown-paste-content"/);
  assert.ok(!html.includes("<div") && !html.includes("<p>"));
  assert.match(html, /line one<br>line two<br>line three/);
});

// ---------------------------------------------------------------------
// Block-level content: must remain block (wrapped in <div>, not <span>).
// ---------------------------------------------------------------------

test("block: ATX heading renders as a block <div> with <h1>", () => {
  const html = renderPastedText("# Title", { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<h1>Title<\/h1>/);
});

test("block: heading level 2-6 all render as headings inside a block <div>", () => {
  for (let level = 2; level <= 6; level++) {
    const hashes = "#".repeat(level);
    const html = renderPastedText(`${hashes} Section`, { initialHtml: "" });
    assert.match(html, /^<div class="markdown-paste-content"/);
    assert.match(html, new RegExp(`<h${level}>Section<\\/h${level}>`));
  }
});

test("block: unordered list renders as a block <div> with <ul>/<li>", () => {
  const html = renderPastedText("- one\n- two\n- three", { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<ul>/);
  assert.equal((html.match(/<li>/g) || []).length, 3);
});

test("block: ordered list renders as a block <div> with <ol>/<li>", () => {
  const html = renderPastedText("1. first\n2. second", { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<ol>/);
});

test("block: blockquote renders as a block <div> with <blockquote>", () => {
  const html = renderPastedText("> quoted text", { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<blockquote>/);
});

test("block: fenced code block renders as a block <div> with hljs highlighting", () => {
  const html = renderPastedText("```js\nconst x = 1;\n```", { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<pre><code class="hljs language-js">/);
  // highlight.js should have wrapped at least the keyword/token in a span
  assert.match(html, /<span class="hljs-/);
});

test("block: GFM table renders as a block <div> with <table>", () => {
  const text = "| A | B |\n| - | - |\n| 1 | 2 |";
  const html = renderPastedText(text, { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>A<\/th>/);
  assert.match(html, /<td>1<\/td>/);
});

test("block: GFM task list renders checkboxes inside a block <div>", () => {
  const text = "- [ ] todo item\n- [x] done item";
  const html = renderPastedText(text, { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<input disabled(="")? type="checkbox">/);
  assert.match(html, /<input checked(="")? disabled(="")? type="checkbox">/);
});

test("block: strikethrough ~~text~~ inside a paragraph still classifies inline (single paragraph token)", () => {
  // Strikethrough alone does not introduce a new block-level token type,
  // so a lone line of "~~text~~" is still just a paragraph -> inline.
  const html = renderPastedText("~~cancelled~~", { initialHtml: "" });
  assert.match(html, /^<span class="markdown-paste-content"/);
  assert.match(html, /<del>cancelled<\/del>/);
});

test("block: horizontal rule renders as a block <div> with <hr>", () => {
  const html = renderPastedText("---", { initialHtml: "" });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<hr>/);
});

test("block: heading followed by a paragraph (multiple tokens) is NOT classified inline", () => {
  const html = renderPastedText("# Title\n\nSome body text.", {
    initialHtml: "",
  });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<p>Some body text\.<\/p>/);
});

test("block: multiple separate paragraphs (blank-line separated) render as block, not inline", () => {
  const html = renderPastedText("First paragraph.\n\nSecond paragraph.", {
    initialHtml: "",
  });
  assert.match(html, /^<div class="markdown-paste-content"/);
  assert.match(html, /<p>First paragraph\.<\/p>/);
  assert.match(html, /<p>Second paragraph\.<\/p>/);
});

// ---------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------

test("edge: a line starting with '#' but no following space is NOT a heading (CommonMark rule) and stays inline", () => {
  const html = renderPastedText("#nothash", { initialHtml: "" });
  assert.match(html, /^<span class="markdown-paste-content"/);
  assert.ok(!/<h1>/.test(html));
  assert.match(html, /#nothash/);
});

test("edge: whitespace-only paste does not throw and does not insert visible markup", () => {
  assert.doesNotThrow(() => {
    renderPastedText("   ", { initialHtml: "before" });
  });
});

test("edge: an empty clipboard text value is a no-op (paste has no visible effect)", () => {
  const html = renderPastedText("", { initialHtml: "unchanged" });
  assert.equal(html, "unchanged");
});
