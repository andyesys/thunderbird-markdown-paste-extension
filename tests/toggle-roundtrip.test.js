/**
 * Render <-> unrender round-trip coverage for the whole-draft toggle
 * (toolbar button / Ctrl+Alt+M). Verifies that unrenderWholeDraft()
 * restores the *exact* original Markdown source text for every rendered
 * block, using the real composescript.js loaded via compose-env.js.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadComposeEnv, setCaretAtEnd, dispatchPaste } = require("./helpers/compose-env");

test("toggle: render then unrender a single live-pasted inline fragment restores the original text", () => {
  const { window, document, triggerToggle } = loadComposeEnv();
  document.body.innerHTML = "";
  setCaretAtEnd(window, document.body);
  dispatchPaste(window, "Hello **World**");

  assert.match(document.body.innerHTML, /<strong>World<\/strong>/);

  triggerToggle(); // renderWholeDraft() — no-op path? Actually body already has a rendered block.
  // Since the body already contains a .markdown-paste-content block from
  // the live paste, isDraftRendered() is true, so toggling calls
  // unrenderWholeDraft(), restoring the original source text.
  assert.equal(document.body.innerHTML, "Hello **World**");
});

test("toggle: unrender -> render round trip restores identical rendered HTML", () => {
  const { window, document, triggerToggle } = loadComposeEnv();
  document.body.innerHTML = "";
  setCaretAtEnd(window, document.body);
  dispatchPaste(window, "Hello **World**");
  const renderedOnce = document.body.innerHTML;

  triggerToggle(); // unrender
  assert.equal(document.body.innerHTML, "Hello **World**");

  triggerToggle(); // render again (renderWholeDraft, no signature, no existing block)
  assert.equal(document.body.innerHTML, renderedOnce);
});

test("toggle: a whole plain-Markdown draft (typed, not pasted) renders then unrenders back exactly", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const source = "# Title\n\nSome *text* and a [link](https://example.com).";
  document.body.textContent = source;

  triggerToggle(); // render
  assert.match(document.body.innerHTML, /<h1>Title<\/h1>/);
  assert.match(document.body.innerHTML, /<a href="https:\/\/example\.com">link<\/a>/);

  triggerToggle(); // unrender
  // unrenderWholeDraft() restores each line joined by <br> (not literal
  // "\n" text nodes), since it goes through textToEditableHtml(); plain
  // `textContent` would silently drop the line breaks (browsers/jsdom
  // never contribute text for <br> elements), so compare against the
  // <br>-joined HTML that composescript.js is documented to produce.
  const expectedHtml = source
    .split("\n")
    .map((line) =>
      line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    )
    .join("<br>");
  assert.equal(document.body.innerHTML, expectedHtml);
});

test("toggle: multiple separate live-pasted blocks each restore their own original source independently", () => {
  const { window, document, triggerToggle } = loadComposeEnv();
  document.body.innerHTML = "";
  setCaretAtEnd(window, document.body);
  dispatchPaste(window, "# Heading One");
  // Move caret to end again before the next paste (a real user would click
  // at the end of the draft before pasting the next block).
  setCaretAtEnd(window, document.body);
  dispatchPaste(window, "\n\n# Heading Two");

  const blocks = document.body.querySelectorAll(".markdown-paste-content");
  assert.equal(blocks.length, 2);

  triggerToggle(); // unrender everything
  const restored = document.body.textContent;
  assert.match(restored, /# Heading One/);
  assert.match(restored, /# Heading Two/);
});

test("toggle: a large mixed multi-block document (headings + list + code + table) round-trips exactly", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const source = [
    "# Report",
    "",
    "- item one",
    "- item two",
    "",
    "```js",
    "const x = 1;",
    "```",
    "",
    "| A | B |",
    "| - | - |",
    "| 1 | 2 |",
  ].join("\n");
  document.body.textContent = source;

  triggerToggle(); // render
  assert.match(document.body.innerHTML, /<h1>Report<\/h1>/);
  assert.match(document.body.innerHTML, /<table>/);
  assert.match(document.body.innerHTML, /class="hljs/);

  triggerToggle(); // unrender
  const expectedHtml = source
    .split("\n")
    .map((line) =>
      line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    )
    .join("<br>");
  assert.equal(document.body.innerHTML, expectedHtml);
});

test("toggle: toggling an empty draft body is a harmless no-op", () => {
  const { document, triggerToggle } = loadComposeEnv();
  document.body.innerHTML = "";
  assert.doesNotThrow(() => triggerToggle());
  assert.equal(document.body.innerHTML, "");
});
