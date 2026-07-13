/**
 * Test harness for exercising composescript.js exactly as Thunderbird runs
 * it: as a set of plain (non-module) scripts injected into the live DOM of
 * a compose window via messenger.composeScripts.register() (see
 * background.js). We reproduce that environment with jsdom + `window.eval`
 * (which requires `runScripts: "dangerously"`), loading the *actual*
 * vendored libraries and the *actual* composescript.js source file - not a
 * reimplementation - so these tests fail if the shipped behavior regresses.
 *
 * Design notes:
 *  - `document.designMode = "on"` is used instead of trying to get jsdom's
 *    contentEditable/isContentEditable support exactly right. composescript.js's
 *    isInsideEditableRegion() falls back to checking `document.designMode`
 *    when no ancestor reports `isContentEditable`, so this reliably makes
 *    the whole document body act like an editable compose region for tests.
 *  - `messenger` is stubbed with just enough of the API surface that
 *    composescript.js touches (`runtime.sendMessage`, `runtime.onMessage`).
 *  - Each test gets a *fresh* jsdom window (loadComposeEnv() creates a new
 *    one), so there is no state leakage between tests.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..", "..");

const VENDOR_FILES = [
  "vendor/marked.min.js",
  "vendor/purify.min.js",
  "vendor/highlight.min.js",
];

/**
 * Creates a fresh jsdom window with the real vendored libraries and the
 * real composescript.js loaded into it, ready for paste/toggle simulation.
 *
 * @param {object} [options]
 * @param {boolean} [options.isPlainTextMode=false] value the stubbed
 *   `get-compose-mode` background message resolves with.
 * @returns {{dom: JSDOM, window: Window, document: Document}}
 */
function loadComposeEnv({ isPlainTextMode = false } = {}) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://example.invalid/compose",
    runScripts: "dangerously",
  });
  const { window } = dom;
  const document = window.document;
  document.designMode = "on";

  let toggleListener = null;
  window.messenger = {
    runtime: {
      sendMessage: () => Promise.resolve({ isPlainText: isPlainTextMode }),
      onMessage: {
        addListener: (fn) => {
          toggleListener = fn;
        },
      },
    },
  };

  for (const relPath of VENDOR_FILES) {
    const src = fs.readFileSync(path.join(ROOT, relPath), "utf8");
    window.eval(src);
  }
  const composeScriptSrc = fs.readFileSync(
    path.join(ROOT, "composescript.js"),
    "utf8"
  );
  window.eval(composeScriptSrc);

  return {
    dom,
    window,
    document,
    /** Invokes the "toggle-markdown-render" message handler directly. */
    triggerToggle() {
      if (!toggleListener) {
        throw new Error("composescript.js did not register a message listener");
      }
      toggleListener({ action: "toggle-markdown-render" });
    },
  };
}

/**
 * Places the caret (collapsed selection) at the end of the given node's
 * contents, mirroring where a user's cursor would be after typing/clicking
 * at the end of a line before pasting.
 */
function setCaretAtEnd(window, node) {
  const range = window.document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Simulates a native paste event carrying plain-text clipboard data,
 * dispatched on document.body (captured by composescript.js's
 * document-level capture-phase "paste" listener) exactly like a real
 * paste into the compose editor.
 */
function dispatchPaste(window, text) {
  const document = window.document;
  const event = new window.Event("paste", { bubbles: true, cancelable: true });
  event.clipboardData = {
    getData: (type) => (type === "text/plain" ? text : ""),
  };
  const defaultPrevented = !document.body.dispatchEvent(event);
  return defaultPrevented;
}

/**
 * Convenience one-shot helper: fresh env, set initial body HTML, place
 * caret at the end of the body, paste `text`, return the resulting
 * body.innerHTML.
 */
function renderPastedText(text, { initialHtml = "" } = {}) {
  const { window, document } = loadComposeEnv();
  document.body.innerHTML = initialHtml;
  setCaretAtEnd(window, document.body);
  dispatchPaste(window, text);
  return document.body.innerHTML;
}

/**
 * The compose-mode query (messenger.runtime.sendMessage) resolves
 * asynchronously, so `isPlainTextMode` inside composescript.js is not
 * updated until a microtask/macrotask tick after loadComposeEnv() returns.
 * Await this after creating an env with `isPlainTextMode: true` and before
 * dispatching a paste/toggle that depends on that mode being applied.
 */
function flushPendingMicrotasks(window) {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

module.exports = {
  loadComposeEnv,
  setCaretAtEnd,
  dispatchPaste,
  renderPastedText,
  flushPendingMicrotasks,
};
