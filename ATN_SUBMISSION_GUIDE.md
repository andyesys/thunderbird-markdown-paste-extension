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

Values used for the actual submission:

- **Name**: `Markdown Paste`
- **Summary** (short, ~250 chars, English):
  > Paste Markdown (GitHub Flavored) into a Thunderbird compose window and
  > see it rendered as formatted rich text instantly. Also includes a
  > toolbar button to render/un-render the whole draft.
- **Summary** (German / Deutsch):
  > Markdown (GitHub Flavored) in ein Thunderbird-Compose-Fenster einfügen
  > und sofort als formatierten Rich-Text sehen. Enthält zudem einen
  > Symbolleisten-Button zum Rendern/Zurückverwandeln des gesamten
  > Entwurfs.
- **Description** (long form, English):
  > Markdown Paste lets you write emails using familiar Markdown syntax
  > and see them converted to properly formatted rich text automatically.
  >
  > Features
  > - Paste Markdown text anywhere in a compose window (HTML/rich-text
  >   mode) and it is instantly rendered - headings, bold/italic, bullet
  >   & numbered lists, links, blockquotes, tables, strikethrough,
  >   task-list checkboxes, and fenced code blocks with syntax
  >   highlighting (GitHub-style theme).
  > - A toolbar button (and Ctrl+Alt+M shortcut) lets you render or
  >   un-render the entire draft at any time, so you can keep editing in
  >   Markdown and switch to a rendered preview whenever you like - your
  >   original Markdown source is preserved and restored exactly, not
  >   reconstructed.
  > - Uses the same GitHub Flavored Markdown (GFM) rules as GitHub.com,
  >   so anything that looks right in a GitHub comment will look right
  >   here.
  > - Your signature and any other existing content are never touched -
  >   only the Markdown you actually paste or the toggle applies to is
  >   rendered.
  > - All processing happens locally in your compose window - no network
  >   requests, no external services, no data collection.
  >
  > Privacy & permissions
  > This add-on only requests the "compose" permission, used to read and
  > modify the content of the message you are currently composing. It
  > does not access your mail, contacts, or any other Thunderbird data,
  > and does not send any data anywhere.
  >
  > Independent implementation
  > This add-on is a fresh, from-scratch implementation and is not
  > affiliated with or derived from any other "Markdown Here"-style
  > extension.
  >
  > Source code & support: https://github.com/andyesys/thunderbird-markdown-paste-extension
- **Description** (long form, German / Deutsch):
  > Markdown Paste ermöglicht es, E-Mails in der gewohnten
  > Markdown-Syntax zu schreiben - der Text wird automatisch in sauber
  > formatierten Rich-Text umgewandelt.
  >
  > Funktionen
  > - Markdown-Text irgendwo in ein Compose-Fenster (HTML-/Rich-Text-Modus)
  >   einfügen - er wird sofort gerendert: Überschriften, Fett/Kursiv,
  >   Aufzählungs- und nummerierte Listen, Links, Zitate, Tabellen,
  >   Durchstreichungen, Task-Listen-Checkboxen sowie Codeblöcke mit
  >   Syntax-Hervorhebung (im GitHub-Stil).
  > - Über einen Symbolleisten-Button (oder die Tastenkombination
  >   Strg+Alt+M) lässt sich der gesamte Entwurf jederzeit rendern oder
  >   wieder in Markdown zurückverwandeln - der ursprüngliche
  >   Markdown-Quelltext wird dabei exakt gespeichert und
  >   wiederhergestellt, nicht rekonstruiert.
  > - Verwendet dieselben GitHub Flavored Markdown (GFM)-Regeln wie
  >   GitHub.com - was in einem GitHub-Kommentar richtig aussieht, sieht
  >   auch hier richtig aus.
  > - Ihre Signatur und bereits vorhandener Inhalt werden nie verändert -
  >   nur der tatsächlich eingefügte Markdown-Text bzw. der per
  >   Button/Shortcut ausgewählte Bereich wird gerendert.
  > - Die gesamte Verarbeitung erfolgt lokal im Compose-Fenster - keine
  >   Netzwerkanfragen, keine externen Dienste, keine Datenerfassung.
  >
  > Datenschutz & Berechtigungen
  > Dieses Add-on benötigt ausschließlich die Berechtigung "compose", um
  > den Inhalt der aktuell verfassten Nachricht zu lesen und zu
  > bearbeiten. Es greift nicht auf E-Mails, Kontakte oder andere
  > Thunderbird-Daten zu und sendet keinerlei Daten irgendwohin.
  >
  > Eigenständige Implementierung
  > Dieses Add-on ist eine komplett neu entwickelte, eigenständige
  > Umsetzung und steht in keiner Verbindung zu und leitet sich nicht von
  > anderen "Markdown Here"-artigen Erweiterungen ab.
  >
  > Quellcode & Support: https://github.com/andyesys/thunderbird-markdown-paste-extension
- **Category**: "Nachrichten schreiben" (Compose), optionally also
  "Anzeige und Personalisierung".
- **License**: MIT (already declared in `manifest.json`'s repo and in the
  `LICENSE` file — select "MIT/X11-Lizenz" in the ATN license dropdown).
- **Support/homepage URL**: `https://github.com/andyesys/thunderbird-markdown-paste-extension`
- **Help page**: `https://github.com/andyesys/thunderbird-markdown-paste-extension/issues`
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
