/**
 * Exercises the real background.js by loading it into a small vm context
 * with a stubbed `messenger` API, verifying:
 *  - composeScripts.register() is called exactly once with the expected
 *    js/css file lists
 *  - the toolbar button (composeAction.onClicked) and the keyboard
 *    shortcut (commands.onCommand("toggle-markdown-render")) both relay a
 *    "toggle-markdown-render" message to the active compose tab
 *  - other commands are ignored
 *  - the runtime.onMessage relay answers "get-compose-mode" using the
 *    privileged compose.getComposeDetails() API, and ignores
 *    foreign/tab-less messages
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

/**
 * Builds a fresh stubbed `messenger` global and loads the real
 * background.js against it inside an isolated vm context (background.js
 * runs top-level code immediately on load, e.g. composeScripts.register()
 * and addListener() calls, exactly like Thunderbird loading it as the
 * extension's background script).
 */
function loadBackgroundEnv() {
  const composeScriptsRegisterCalls = [];
  const sentMessages = []; // { tabId, message }
  let composeActionListener = null;
  let commandListener = null;
  let runtimeMessageListener = null;

  const messenger = {
    composeScripts: {
      register: (options) => {
        composeScriptsRegisterCalls.push(options);
      },
    },
    composeAction: {
      onClicked: {
        addListener: (fn) => {
          composeActionListener = fn;
        },
      },
    },
    commands: {
      onCommand: {
        addListener: (fn) => {
          commandListener = fn;
        },
      },
    },
    tabs: {
      sendMessage: (tabId, message) => {
        sentMessages.push({ tabId, message });
        return Promise.resolve();
      },
      query: () => Promise.resolve([{ id: 42 }]),
    },
    runtime: {
      onMessage: {
        addListener: (fn) => {
          runtimeMessageListener = fn;
        },
      },
    },
    compose: {
      getComposeDetails: (tabId) =>
        Promise.resolve({ isPlainText: tabId === 999 }),
    },
  };

  const backgroundSrc = fs.readFileSync(path.join(ROOT, "background.js"), "utf8");
  // Run in the current V8 context/realm (not a separate vm.createContext
  // sandbox) so objects created inside background.js (e.g. the
  // `{ action: "toggle-markdown-render" }` literal) share the same
  // Object/Array prototypes as this test file - otherwise
  // assert.deepEqual would fail on cross-realm objects despite them being
  // structurally identical. `messenger` is left as a global for the
  // lifetime of this test file (each test overwrites it with its own
  // stub before loading background.js again) since background.js's
  // listener closures re-read the global `messenger` binding lazily, on
  // every call - not just at load time.
  global.messenger = messenger;
  vm.runInThisContext(backgroundSrc, { filename: "background.js" });

  return {
    composeScriptsRegisterCalls,
    sentMessages,
    triggerComposeActionClick(tab) {
      composeActionListener(tab);
    },
    triggerCommand(command) {
      return commandListener(command);
    },
    triggerRuntimeMessage(message, sender) {
      return runtimeMessageListener(message, sender);
    },
  };
}

test("background: composeScripts.register() is called exactly once", () => {
  const env = loadBackgroundEnv();
  assert.equal(env.composeScriptsRegisterCalls.length, 1);
});

test("background: composeScripts.register() js list matches the files actually shipped in the repo", () => {
  const env = loadBackgroundEnv();
  const { js } = env.composeScriptsRegisterCalls[0];
  const jsFiles = js.map((entry) => entry.file);
  assert.deepEqual(jsFiles, [
    "vendor/marked.min.js",
    "vendor/purify.min.js",
    "vendor/highlight.min.js",
    "composescript.js",
  ]);
  for (const relPath of jsFiles) {
    assert.ok(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`);
  }
});

test("background: composeScripts.register() css list matches the files actually shipped in the repo", () => {
  const env = loadBackgroundEnv();
  const { css } = env.composeScriptsRegisterCalls[0];
  const cssFiles = css.map((entry) => entry.file);
  assert.deepEqual(cssFiles, [
    "vendor/highlight-github.min.css",
    "composestyles.css",
  ]);
  for (const relPath of cssFiles) {
    assert.ok(fs.existsSync(path.join(ROOT, relPath)), `${relPath} must exist`);
  }
});

test("background: clicking the toolbar compose_action button sends a toggle message to that tab", () => {
  const env = loadBackgroundEnv();
  env.triggerComposeActionClick({ id: 7 });
  assert.deepEqual(env.sentMessages, [
    { tabId: 7, message: { action: "toggle-markdown-render" } },
  ]);
});

test("background: the toggle-markdown-render command sends a toggle message to the active tab", async () => {
  const env = loadBackgroundEnv();
  await env.triggerCommand("toggle-markdown-render");
  assert.deepEqual(env.sentMessages, [
    { tabId: 42, message: { action: "toggle-markdown-render" } },
  ]);
});

test("background: unrelated commands are ignored (no message sent)", async () => {
  const env = loadBackgroundEnv();
  await env.triggerCommand("some-other-command");
  assert.deepEqual(env.sentMessages, []);
});

test("background: runtime.onMessage relay answers get-compose-mode using compose.getComposeDetails()", async () => {
  const env = loadBackgroundEnv();
  const result = await env.triggerRuntimeMessage(
    { action: "get-compose-mode" },
    { tab: { id: 5 } }
  );
  assert.deepEqual(result, { isPlainText: false });
});

test("background: runtime.onMessage relay reports isPlainText: true for a plain-text compose tab", async () => {
  const env = loadBackgroundEnv();
  const result = await env.triggerRuntimeMessage(
    { action: "get-compose-mode" },
    { tab: { id: 999 } }
  );
  assert.deepEqual(result, { isPlainText: true });
});

test("background: runtime.onMessage relay ignores messages with no sender.tab", () => {
  const env = loadBackgroundEnv();
  const result = env.triggerRuntimeMessage({ action: "get-compose-mode" }, {});
  assert.equal(result, undefined);
});

test("background: runtime.onMessage relay ignores unknown message actions", () => {
  const env = loadBackgroundEnv();
  const result = env.triggerRuntimeMessage(
    { action: "something-else" },
    { tab: { id: 5 } }
  );
  assert.equal(result, undefined);
});

test.after(() => {
  delete global.messenger;
});
