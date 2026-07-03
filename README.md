# Markdown Paste for Thunderbird

Paste GitHub-Flavored Markdown into a Thunderbird HTML compose window and see
it rendered instantly as formatted rich text — tables, code blocks with
syntax highlighting, task lists, strikethrough, and more, styled to closely
match how GitHub renders Markdown.

## Features

- **Live inline paste rendering** — paste Markdown text anywhere in the
  compose editor and it is immediately converted to formatted HTML in place.
- **Toggle button** — a toolbar button (and `Ctrl+Alt+M`) renders or
  un-renders the *entire* draft on demand, for drafts typed directly as
  Markdown rather than pasted.
- **GitHub Flavored Markdown (GFM)**: headings, bold/italic, lists, links,
  blockquotes, tables, `~~strikethrough~~`, task lists (`- [ ]` / `- [x]`),
  autolinked URLs, and fenced code blocks with syntax highlighting
  (via highlight.js, GitHub theme).
- **Safe by design** — all rendered HTML is sanitized with
  [DOMPurify](https://github.com/cure53/DOMPurify) before insertion; no
  `eval()`, no remote code, fully CSP-compliant, no network access needed.

## How it works

- A background script registers a **compose script**
  (`messenger.composeScripts.register()`) that runs inside the live DOM of
  every compose window.
- The compose script listens for native `paste` events. Pasted plain text is
  converted to HTML with [marked.js](https://github.com/markedjs/marked)
  (configured with `{ gfm: true, breaks: true }` to match GitHub's own
  rendering behavior), sanitized, and inserted at the cursor using the
  `Selection`/`Range` API (cursor position is preserved after insertion).
- The compose toolbar button (`compose_action`) sends a message to the
  active compose tab to toggle full-draft rendering. The original Markdown
  source is preserved in a hidden attribute so the draft can be converted
  back to source text.

This add-on targets recent Thunderbird versions only (140+) and does not
attempt to support older releases.

No Experiment APIs, no legacy XPCOM access, and no `clipboardRead`
permission are required — clipboard text is read synchronously from the
native paste event, and the rest is standard modern WebExtension APIs.

## Installation (local / manual)

1. Download or clone this repository.
2. In Thunderbird: **Menu → Add-ons and Themes → gear icon → Debug Add-ons**.
3. Click **Load Temporary Add-on…** and select `manifest.json` from this
   folder.
4. Open a new compose window, paste some Markdown, and it should render
   immediately. Use the toolbar button or `Ctrl+Alt+M` to toggle rendering
   of the whole draft.

   > Temporary add-ons are removed when Thunderbird restarts. To install
   > permanently, package it as an `.xpi` (see below) and use
   > **Install Add-on From File…** instead — Thunderbird does not require
   > extensions to be signed, so this works out of the box.

## Packaging as a permanent `.xpi`

Run `package.ps1` (Windows PowerShell) from the project root:

```powershell
./package.ps1
```

This produces `markdown-paste.xpi` in the project root, ready for
**Install Add-on From File…**, or for submission to
[addons.thunderbird.net](https://addons.thunderbird.net) (see
`ATN_SUBMISSION_GUIDE.md`).

## Development

- Lint with [`web-ext`](https://github.com/mozilla/web-ext):
  ```powershell
  npx web-ext lint --source-dir . --ignore-files vendor/** icons/**
  ```
- Compose script console: while the add-on is loaded temporarily, click the
  **Inspect** link next to it in Debug Add-ons, open a compose window, and
  use the DevTools console attached to that window to see logs/errors from
  `composescript.js`.

## Project structure

```
manifest.json          Extension manifest (MV2, MailExtension)
background.js          Registers the compose script, handles the toolbar button & command
composescript.js       Runs inside the compose editor DOM: paste interception + toggle render
composestyles.css      GitHub-like styling for rendered Markdown output
vendor/                 Bundled third-party libraries (marked.js, DOMPurify, highlight.js)
icons/                  Toolbar/listing icons
package.ps1             Helper script to zip the extension into an .xpi
ATN_SUBMISSION_GUIDE.md  Steps + listing text for submitting to addons.thunderbird.net
```

## License

MIT — see `LICENSE`.
