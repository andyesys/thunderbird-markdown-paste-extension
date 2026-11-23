/** Regression coverage for issues #1 and #6.
 * jsdom does not implement the native undo stack: here the test harness
 * implements insertHTML's DOM effect, while browser integration tests must
 * validate Ctrl+Z/Ctrl+Y against a real editable document.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadComposeEnv, setCaretAtEnd, dispatchPaste } = require("./helpers/compose-env");

function dispatchClipboard(window, text, html = "", types = []) {
  const event = new window.Event("paste", { bubbles: true, cancelable: true });
  event.clipboardData = {
    types,
    getData: (type) =>
      type === "text/plain" ? text : type === "text/html" ? html : "",
  };
  return !window.document.body.dispatchEvent(event);
}

test("paste uses the editor's insertHTML command for a Markdown fragment", () => {
  const { window, document } = loadComposeEnv();
  setCaretAtEnd(window, document.body);
  const nativeCommand = document.execCommand;
  const calls = [];
  document.execCommand = (...args) => {
    calls.push(args[0]);
    return nativeCommand(...args);
  };

  assert.equal(dispatchPaste(window, "Hello **world**"), true);
  assert.deepEqual(calls, ["insertHTML"]);
  assert.match(document.body.innerHTML, /<strong>world<\/strong>/);
});

test("rich HTML is left untouched by the Markdown interceptor", () => {
  const { window, document } = loadComposeEnv();
  setCaretAtEnd(window, document.body);
  assert.equal(dispatchClipboard(window, "linked text", '<a href="https://example.org">linked text</a>', ["text/plain", "text/html"]), false);
  assert.equal(document.body.innerHTML, ""); // native editor owns the paste
});

test("HTML type is respected even when getData(text/html) is empty", () => {
  const { window, document } = loadComposeEnv();
  setCaretAtEnd(window, document.body);
  assert.equal(dispatchClipboard(window, "**hello**", "", ["text/plain", "text/html"]), false);
});

test("file/image clipboard entries remain the editor's responsibility", () => {
  const { window, document } = loadComposeEnv();
  setCaretAtEnd(window, document.body);
  assert.equal(dispatchClipboard(window, "picture", "", ["text/plain", "Files"]), false);
  assert.equal(dispatchClipboard(window, "picture", "", ["text/plain", "image/png"]), false);
});

test("failed insertHTML does not suppress the editor's native paste", () => {
  const { window, document } = loadComposeEnv();
  setCaretAtEnd(window, document.body);
  document.execCommand = () => false;
  assert.equal(dispatchPaste(window, "**keep me**"), false);
  assert.equal(document.body.innerHTML, "");
});

test("failed insertHTML exception does not suppress native paste", () => {
  const { window, document } = loadComposeEnv();
  setCaretAtEnd(window, document.body);
  document.execCommand = () => { throw new Error("editor unavailable"); };
  assert.equal(dispatchPaste(window, "**keep me**"), false);
});
