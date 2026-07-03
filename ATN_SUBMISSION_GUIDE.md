# Submitting "Markdown Paste" to addons.thunderbird.net (ATN)

This add-on is fully built, locally tested, linted clean, and packaged as
`markdown-paste.xpi`. It does **not** need to be signed or listed on ATN to
work — see [Permanent installation without ATN](#permanent-installation-without-atn)
below if you just want to use it yourself. The steps below are for
publishing it publicly so other people can install and update it easily.

## 1. Prerequisites

- A free Mozilla account (the same account system used for addons.mozilla.org).
- The packaged file: `markdown-paste.xpi` (produced by `package.ps1`, ~80 KB).

## 2. Create a developer account / submit

1. Go to https://addons.thunderbird.net/developers/
2. Sign in (or create an account) with your Mozilla account.
3. Click **"Submit a New Add-on"**.
4. Choose **"On this site"** distribution (recommended — ATN hosts and
   signs the file, and users get automatic updates) rather than
   "Self-hosted".
5. Upload `markdown-paste.xpi`.
6. ATN will run its automated validator (the same class of checks as
   `web-ext lint` / `webext-linter`, which this add-on already passes with
   0 errors). If it reports anything new, fix it in the source and re-run
   `.\package.ps1` before re-uploading.

## 3. Listing metadata

Suggested values for the submission form:

- **Name**: `Markdown Paste`
- **Summary** (short, ~250 chars):
  > Paste Markdown and see it instantly rendered as rich formatted text in
  > your Thunderbird compose window. GitHub-Flavored Markdown, syntax
  > highlighting, tables, task lists — plus a toolbar toggle to
  > render/un-render the whole draft.
- **Description** (long form):
  > Markdown Paste lets you write emails using familiar Markdown syntax
  > and see them converted to properly formatted rich text automatically.
  >
  > **Features**
  > - Paste Markdown text anywhere in a compose window (HTML/rich-text
  >   mode) and it is instantly rendered — headings, bold/italic,
  >   bullet & numbered lists, links, blockquotes, tables, strikethrough,
  >   task-list checkboxes, and fenced code blocks with syntax
  >   highlighting (GitHub-style theme).
  > - A toolbar button (and `Ctrl+Alt+M` shortcut) lets you render or
  >   un-render the entire draft at any time, so you can keep editing in
  >   Markdown and switch to a rendered preview whenever you like.
  > - Uses the same GitHub Flavored Markdown (GFM) rules as GitHub.com,
  >   so anything that looks right in a GitHub comment will look right
  >   here.
  > - All processing happens locally in your compose window — no network
  >   requests, no external services, no data collection.
  >
  > **Privacy & permissions**
  > This add-on only requests the `compose` permission, used to read and
  > modify the content of the message you are currently composing. It
  > does not access your mail, contacts, or any other Thunderbird data,
  > and does not send any data anywhere.
  >
  > **Independent implementation** — this add-on is a fresh, from-scratch
  > implementation and is not affiliated with or derived from any other
  > "Markdown Here"-style extension; it uses its own paste-interception
  > and whole-draft toggle logic built specifically for the modern
  > Thunderbird WebExtension APIs (`compose` permission,
  > `messenger.composeScripts.register()`).
- **Category**: Compose / Productivity (or whichever closest category ATN
  offers at submission time).
- **License**: MIT (already declared in `manifest.json`'s repo and in the
  `LICENSE` file — select "MIT License" in the ATN license dropdown).
- **Support/homepage URL**: `https://github.com/andyesys/thunderbird-markdown-extension`
- **Source code**: since all bundled third-party libraries (`marked.js`,
  DOMPurify, highlight.js) are minified, ATN reviewers may request the
  original unminified sources or a link to them. Point reviewers to
  `VENDOR.md` in the package, which lists exact versions and upstream
  source URLs for every vendored library, and to the GitHub repository
  which contains the full unminified add-on source (`background.js`,
  `composescript.js`, `composestyles.css`).

## 4. Icon / trademark note

The bundled icon (a simple "M↓" glyph on a dark rounded square) is an
original, simple placeholder graphic. It does not use or resemble the
Thunderbird or Mozilla logo, satisfying ATN's trademark-imitation review
step. Feel free to replace `icons/icon-*.png` with a nicer custom design
before submitting if you'd like a more polished look — regenerate all four
sizes (16/32/48/64 px) and keep the same file names.

## 5. After submission

- ATN review is manual and can take anywhere from a few days to a couple
  of weeks depending on reviewer availability.
- If the reviewer requests changes, make them in the source files, bump
  `"version"` in `manifest.json`, re-run `.\package.ps1`, and upload the
  new `.xpi` as a new version of the same listing.
- Once approved, the add-on gets a permanent ATN listing URL and users can
  install/update it directly from Thunderbird's Add-ons Manager.

## Permanent installation without ATN

If you don't want to go through public listing/review, you can install
`markdown-paste.xpi` permanently right now:

1. In Thunderbird, go to **Menu → Add-ons and Themes** (`Ctrl+Shift+A`).
2. Click the gear icon → **"Install Add-on From File..."**.
3. Select `markdown-paste.xpi`.
4. Confirm the install prompt.

Thunderbird does not enforce add-on signature verification the way Firefox
does, so this works without any ATN account or review step, and the add-on
will persist across restarts and be included in normal Thunderbird
updates/backups.
