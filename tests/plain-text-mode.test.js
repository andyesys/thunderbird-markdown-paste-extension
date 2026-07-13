/**
 * Verifies that Markdown rendering/toggling is entirely disabled when the
 * compose window is in plain-text mode (isPlainTextMode derived from the
 * "get-compose-mode" background message) — Markdown rendering only makes
 * sense for the HTML editor.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loadComposeEnv,
  setCaretAtEnd,
  dispatchPaste,
  flushPendingMicrotasks,
} = require("./helpers/compose-env");

test("plain-text mode: pasted Markdown is left completely unrendered (native paste behavior applies)", async () => {
  const { window, document } = loadComposeEnv({ isPlainTextMode: true });
  await flushPendingMicrotasks(window);

  document.body.textContent = "";
  setCaretAtEnd(window, document.body);
  const defaultPrevented = dispatchPaste(window, "# Not a heading here");

  // The extension's paste listener must NOT call preventDefault() in
  // plain-text mode, letting the browser's/editor's native paste happen.
  assert.equal(defaultPrevented, false);
  assert.equal(document.body.querySelector(".markdown-paste-content"), null);
});

test("plain-text mode: the whole-draft toggle is a no-op", async () => {
  const { window, document, triggerToggle } = loadComposeEnv({
    isPlainTextMode: true,
  });
  await flushPendingMicrotasks(window);

  document.body.textContent = "# Heading\n\nSome text";
  triggerToggle();

  assert.equal(document.body.querySelector(".markdown-paste-content"), null);
  assert.equal(document.body.textContent, "# Heading\n\nSome text");
});
