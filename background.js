/**
 * Background script for the Markdown Paste extension.
 *
 * Responsibilities:
 *  - Register a compose script that runs inside the live DOM of every
 *    compose window (paste interception + whole-draft toggle rendering).
 *  - Relay the compose_action toolbar button and the Ctrl+Alt+M command to
 *    the active compose tab as a "toggle-markdown-render" message.
 *  - Answer small relay requests from the compose script that require the
 *    privileged `compose` API (e.g. checking plain-text vs. HTML mode),
 *    since compose scripts only have access to a restricted API subset.
 *
 * The compose script is registered at runtime via
 * `messenger.composeScripts.register()` rather than the declarative
 * `compose_scripts` manifest key. The manifest key requires Thunderbird 151+
 * and, at the time of writing, causes Thunderbird's own add-on review
 * tooling (thunderbird/webext-linter) to falsely flag composescript.js and
 * composestyles.css as "unused files" - a known tooling gap, not an actual
 * bug in this add-on. The runtime registration approach avoids that issue
 * entirely and is supported since Thunderbird 82.
 */

// Register the compose script programmatically (see comment above for why
// this is used instead of the declarative `compose_scripts` manifest key).
messenger.composeScripts.register({
  js: [
    { file: "vendor/marked.min.js" },
    { file: "vendor/purify.min.js" },
    { file: "vendor/highlight.min.js" },
    { file: "composescript.js" },
  ],
  css: [
    { file: "vendor/highlight-github.min.css" },
    { file: "composestyles.css" },
  ],
});

/**
 * Send a "toggle-markdown-render" message to the compose script running in
 * the given tab.
 * @param {number} tabId
 */
async function toggleMarkdownRender(tabId) {
  try {
    await messenger.tabs.sendMessage(tabId, { action: "toggle-markdown-render" });
  } catch (err) {
    console.error("Markdown Paste: failed to toggle rendering", err);
  }
}

// Toolbar button in the compose window.
messenger.composeAction.onClicked.addListener((tab) => {
  toggleMarkdownRender(tab.id);
});

// Keyboard shortcut (Ctrl+Alt+M), works regardless of focus within the
// compose window, but needs the id of the currently active compose tab.
messenger.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-markdown-render") {
    return;
  }
  const tabs = await messenger.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    toggleMarkdownRender(tabs[0].id);
  }
});

// Relay requests from the compose script that need the privileged `compose`
// API (compose scripts cannot call `messenger.compose.*` directly).
messenger.runtime.onMessage.addListener((message, sender) => {
  if (!message || !sender.tab) {
    return undefined;
  }

  if (message.action === "get-compose-mode") {
    return messenger.compose
      .getComposeDetails(sender.tab.id)
      .then((details) => ({ isPlainText: !!details.isPlainText }));
  }

  return undefined;
});
