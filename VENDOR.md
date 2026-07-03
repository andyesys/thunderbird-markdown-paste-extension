# Vendored Third-Party Libraries

This add-on bundles the following unmodified third-party libraries locally
(no CDN references, per WebExtension CSP requirements). Each file is the
exact, unmodified minified build published by the upstream project at the
version listed below, so its contents can be verified against the linked
source.

| File | Library | Version | Source |
|---|---|---|---|
| `vendor/marked.min.js` | [marked](https://github.com/markedjs/marked) | 15.0.12 | https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js |
| `vendor/purify.min.js` | [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.11 | https://cdn.jsdelivr.net/npm/dompurify@3.4.11/dist/purify.min.js |
| `vendor/highlight.min.js` | [highlight.js](https://github.com/highlightjs/highlight.js) | 11.10.0 | https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js |
| `vendor/highlight-github.min.css` | highlight.js "github" theme | 11.10.0 | https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github.min.css |

## Licenses

- marked: MIT License (Copyright (c) 2011-2025, Christopher Jeffrey)
- DOMPurify: Apache License 2.0 / Mozilla Public License 2.0 (dual-licensed, Cure53 and contributors)
- highlight.js: BSD-3-Clause License (Copyright (c) 2006, Ivan Sagalaev)

## Why these libraries

- **marked.js** was chosen over alternatives (markdown-it, showdown, remark/unified)
  for its small footprint (~13 kB gzipped), active maintenance, and a
  pre-built browser-ready UMD bundle with no `eval()`/`new Function()` use
  (CSP-compliant).
- **DOMPurify** sanitizes all HTML produced by marked.js before it is ever
  inserted into the compose editor DOM, to prevent any possibility of script
  injection via pasted or typed Markdown.
- **highlight.js** (with the bundled "github" theme) renders fenced code
  blocks with syntax highlighting that visually matches how GitHub itself
  renders code blocks, per this add-on's GitHub Flavored Markdown goal.

## Note on internal `innerHTML` usage in vendored code

Static analysis (`thunderbird/webext-linter`) flags an internal `innerHTML`
assignment inside `vendor/highlight.min.js`. This is part of highlight.js's
own internal implementation (unrelated to any DOM write performed by this
add-on's own code, which never calls the DOM-mutating
`hljs.highlightElement()` API — only the pure string-returning
`hljs.highlight()` / `hljs.highlightAuto()` functions are used). All of this
add-on's own first-party DOM insertion goes through
`Range.createContextualFragment()` + `Node.replaceChildren()` /
`Range.insertNode()`, never through `.innerHTML` assignment, and all HTML
passed to those APIs has already been sanitized with DOMPurify.
