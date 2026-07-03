/**
 * Compose script for the Markdown Paste extension.
 *
 * This file is injected (via messenger.composeScripts.register in
 * background.js) directly into the live DOM of the Thunderbird HTML
 * compose editor. It runs in the same document as the contenteditable
 * message body, so native DOM events (like "paste") work exactly as they
 * would on any web page.
 *
 * Compose scripts only have access to a restricted WebExtension API subset
 * (runtime.sendMessage/onMessage, storage, i18n) - anything requiring the
 * privileged `compose` API must be relayed through background.js.
 */

(() => {
  "use strict";

  const SOURCE_STORE_ID = "markdown-paste-source-store";
  let isPlainTextMode = false;

  // Ask the background script whether this compose window is in plain-text
  // mode. Markdown rendering only makes sense for the HTML editor.
  messenger.runtime
    .sendMessage({ action: "get-compose-mode" })
    .then((result) => {
      isPlainTextMode = !!(result && result.isPlainText);
    })
    .catch(() => {
      // If the query fails for any reason, fail safe and assume HTML mode
      // is available (most compose windows are HTML by default).
      isPlainTextMode = false;
    });

  // ---------------------------------------------------------------------
  // Markdown rendering (GitHub Flavored Markdown, matching github.com's
  // own rendering behavior as closely as practical with marked.js).
  // ---------------------------------------------------------------------

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Configure marked to match GitHub's own Markdown behavior:
  //  - gfm: true    -> tables, strikethrough, task lists, autolinks
  //  - breaks: true -> a single newline becomes <br>, like GitHub comments
  // Code blocks are highlighted with highlight.js using the "github" theme.
  marked.use({
    gfm: true,
    breaks: true,
    renderer: {
      code(token) {
        const lang = (token.lang || "").trim().split(/\s+/)[0];
        let highlighted;
        try {
          if (lang && typeof hljs !== "undefined" && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(token.text, { language: lang }).value;
          } else if (typeof hljs !== "undefined") {
            highlighted = hljs.highlightAuto(token.text).value;
          } else {
            highlighted = escapeHtml(token.text);
          }
        } catch (err) {
          highlighted = escapeHtml(token.text);
        }
        const langClass = lang ? ` language-${lang}` : "";
        return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>`;
      },
    },
  });

  // DOMPurify config: extend (not replace) the default safe list so GFM
  // task-list checkboxes (<input type="checkbox" disabled>) and
  // highlight.js's <span class="hljs-..."> wrappers survive sanitization.
  const PURIFY_CONFIG = {
    ADD_TAGS: ["input"],
    ADD_ATTR: ["type", "checked", "disabled", "class", "start", "align"],
  };

  function renderMarkdownToSafeHtml(markdownText) {
    const rawHtml = marked.parse(markdownText);
    return DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);
  }

  // ---------------------------------------------------------------------
  // Caret-preserving HTML insertion (modern Selection/Range API; the older
  // document.execCommand('insertHTML', ...) is deprecated per MDN).
  // ---------------------------------------------------------------------

  function insertHtmlAtCaret(html) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function isInsideEditableRegion(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el) {
      if (el.isContentEditable) {
        return true;
      }
      el = el.parentElement;
    }
    return document.designMode === "on";
  }

  // ---------------------------------------------------------------------
  // Live inline paste rendering
  // ---------------------------------------------------------------------

  document.addEventListener(
    "paste",
    (event) => {
      if (isPlainTextMode) {
        return; // let the default plain-text paste happen
      }
      if (!event.target || !isInsideEditableRegion(event.target)) {
        return;
      }
      const clipboardData = event.clipboardData || window.clipboardData;
      if (!clipboardData) {
        return;
      }
      const text = clipboardData.getData("text/plain");
      if (!text) {
        return; // e.g. a pasted image with no text representation
      }

      event.preventDefault();
      event.stopPropagation();

      const safeHtml = renderMarkdownToSafeHtml(text);
      insertHtmlAtCaret(safeHtml);
    },
    true
  );

  // ---------------------------------------------------------------------
  // Whole-draft toggle rendering (toolbar button / Ctrl+Alt+M)
  // ---------------------------------------------------------------------

  function textToEditableHtml(text) {
    return text
      .split(/\r\n|\r|\n/)
      .map((line) => escapeHtml(line))
      .join("<br>");
  }

  function isDraftRendered() {
    return document.body.dataset.markdownPasteRendered === "true";
  }

  // Replace the entire body content using Range.createContextualFragment +
  // Node.replaceChildren, rather than assigning to `innerHTML`. Thunderbird's
  // add-on review policy disallows `.innerHTML` assignment (see
  // https://webextension-api.thunderbird.net/en/mv3/guides/innerHTML.html);
  // this achieves the same result while only ever inserting parsed DOM
  // nodes built from already-sanitized/escaped HTML strings.
  function setBodyHtml(html) {
    const range = document.createRange();
    range.selectNodeContents(document.body);
    const fragment = range.createContextualFragment(html);
    document.body.replaceChildren(fragment);
  }

  function renderWholeDraft() {
    const sourceText = document.body.innerText || document.body.textContent || "";
    const renderedHtml = renderMarkdownToSafeHtml(sourceText);

    setBodyHtml(renderedHtml);

    const sourceStore = document.createElement("div");
    sourceStore.id = SOURCE_STORE_ID;
    sourceStore.style.display = "none";
    sourceStore.textContent = sourceText;
    document.body.appendChild(sourceStore);
    document.body.dataset.markdownPasteRendered = "true";
  }

  function unrenderWholeDraft() {
    const sourceStore = document.getElementById(SOURCE_STORE_ID);
    const sourceText = sourceStore ? sourceStore.textContent : "";
    setBodyHtml(textToEditableHtml(sourceText));
    delete document.body.dataset.markdownPasteRendered;
  }

  function toggleWholeDraft() {
    if (isPlainTextMode) {
      return;
    }
    if (isDraftRendered()) {
      unrenderWholeDraft();
    } else {
      renderWholeDraft();
    }
  }

  messenger.runtime.onMessage.addListener((message) => {
    if (message && message.action === "toggle-markdown-render") {
      toggleWholeDraft();
    }
  });
})();
