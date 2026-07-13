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
    // A single line of plain prose (e.g. an email address, URL, or a
    // sentence with *bold*/`code`) tokenizes as one lone "paragraph"
    // token. marked.parse() would still wrap that in a block-level <p>,
    // which - once inserted at the caret inside existing inline text -
    // forces a line break before/after it, even though the user only
    // pasted an inline fragment. Detect that case and use
    // marked.parseInline() instead, which produces bare inline markup
    // (links, <strong>, <code>, etc.) with no surrounding <p>. Actual
    // block-level pastes (headings, lists, tables, code fences, multiple
    // paragraphs, ...) still go through the normal block parser, since
    // those inherently need their own line(s) anyway.
    const tokens = marked.lexer(markdownText).filter((t) => t.type !== "space");
    const isInlineOnly = tokens.length === 1 && tokens[0].type === "paragraph";

    const rawHtml = isInlineOnly
      ? marked.parseInline(markdownText)
      : marked.parser(tokens);
    const safeHtml = DOMPurify.sanitize(rawHtml, PURIFY_CONFIG);

    // Wrap every block of rendered Markdown in a marker element so that
    // (a) composestyles.css can scope its rules to content we actually
    // rendered, instead of applying to every <pre>/<table>/<h1> etc. in
    // the compose document (which would also restyle things like
    // Thunderbird's own fixed-width signature <pre> block), and
    // (b) the toggle button can find already-rendered blocks and restore
    // their *original* Markdown source, instead of trying to reconstruct
    // Markdown syntax from the rendered HTML's plain-text content (which
    // has already lost things like "##"/backticks/list markers).
    // An inline-only result is wrapped in a <span> (not <div>) so it
    // never introduces a block-level line break of its own either.
    const wrapperTag = isInlineOnly ? "span" : "div";
    const encodedSource = escapeHtml(markdownText);
    return `<${wrapperTag} class="markdown-paste-content" data-markdown-source="${encodedSource}">${safeHtml}</${wrapperTag}>`;
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

  // Thunderbird marks the signature it auto-inserts into new/reply drafts
  // with class="moz-signature" on its container (a <pre> for plain-text
  // signatures, a <div> for HTML signatures). The whole-draft toggle must
  // never treat that container as Markdown source - otherwise things like
  // "--", email addresses, or a line of dashes in a company disclaimer get
  // reinterpreted as GFM syntax (horizontal rules, autolinks, Setext
  // headings), visibly mangling the signature.
  function findSignatureElement() {
    return document.body.querySelector(".moz-signature");
  }

  // Converts a DOM subtree to plain text, inserting "\n" at line breaks and
  // block-level element boundaries. Deliberately does not rely on
  // `Node.innerText`, since that requires layout and returns "" for
  // detached fragments (needed below to read text from a cloned range that
  // excludes the signature).
  const BLOCK_TAGS = new Set([
    "DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6",
    "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "TABLE", "TR",
  ]);
  function domToPlainText(root) {
    let text = "";
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.nodeValue;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }
      if (node.tagName === "BR") {
        text += "\n";
        return;
      }
      node.childNodes.forEach(walk);
      if (BLOCK_TAGS.has(node.tagName)) {
        text += "\n";
      }
    }
    root.childNodes.forEach(walk);
    return text;
  }

  // A draft counts as "rendered" if it contains any block we previously
  // rendered - whether that came from a live paste or a prior whole-draft
  // render. This is checked directly against the DOM (rather than a single
  // whole-body flag) so that content rendered via live inline paste is
  // handled correctly too, not just content rendered via this toggle.
  function isDraftRendered() {
    return !!document.body.querySelector(".markdown-paste-content");
  }

  // Replace a node's content using Range.createContextualFragment +
  // replaceWith/replaceChildren, rather than assigning to `innerHTML`.
  // Thunderbird's add-on review policy disallows `.innerHTML` assignment
  // (see https://webextension-api.thunderbird.net/en/mv3/guides/innerHTML.html);
  // this achieves the same result while only ever inserting parsed DOM
  // nodes built from already-sanitized/escaped HTML strings.
  function setBodyHtml(html) {
    const range = document.createRange();
    range.selectNodeContents(document.body);
    const fragment = range.createContextualFragment(html);
    document.body.replaceChildren(fragment);
  }

  function renderWholeDraft() {
    // Only reached when the draft has no rendered blocks yet, so the
    // rest of the body (everything except Thunderbird's own signature)
    // is assumed to be plain Markdown source text.
    const signatureEl = findSignatureElement();

    if (!signatureEl) {
      const sourceText = domToPlainText(document.body);
      if (!sourceText.trim()) {
        return; // empty draft - nothing to render, avoid an empty wrapper
      }
      setBodyHtml(renderMarkdownToSafeHtml(sourceText));
      return;
    }

    // Render only the portion of the body before the signature; leave the
    // signature element itself completely untouched.
    const range = document.createRange();
    range.setStart(document.body, 0);
    range.setEndBefore(signatureEl);

    const sourceText = domToPlainText(range.cloneContents());
    if (!sourceText.trim()) {
      return; // nothing to render besides the signature itself
    }
    const renderedHtml = renderMarkdownToSafeHtml(sourceText);

    range.deleteContents();
    const fragment = range.createContextualFragment(renderedHtml);
    document.body.insertBefore(fragment, signatureEl);
  }

  function unrenderWholeDraft() {
    // Restore every previously-rendered block back to its *original*
    // Markdown source (stored on the block itself at render time), rather
    // than trying to reconstruct Markdown syntax from the rendered HTML's
    // plain-text content - by the time it's rendered, headings have lost
    // their "##", code blocks have lost their backticks/fencing, etc., so
    // re-parsing innerText would silently flatten everything into plain
    // paragraphs. Any plain (not-yet-rendered) text elsewhere in the
    // draft is left untouched.
    const renderedBlocks = Array.from(
      document.body.querySelectorAll(".markdown-paste-content")
    );
    renderedBlocks.forEach((block) => {
      const sourceText = block.dataset.markdownSource || "";
      const plainHtml = textToEditableHtml(sourceText);
      const range = document.createRange();
      range.selectNode(block);
      const fragment = range.createContextualFragment(plainHtml);
      block.replaceWith(fragment);
    });
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
