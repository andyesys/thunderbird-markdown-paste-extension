/**
 * Verifies that the whole-draft toggle never touches Thunderbird's
 * auto-inserted signature (class="moz-signature"), regardless of whether
 * it's a <pre> (plain-text signature) or <div> (HTML signature), and
 * regardless of spacing/content around it. Regression coverage for the
 * "toggle mangles the signature" bug (renderWholeDraft() previously
 * treated the entire body, signature included, as Markdown source).
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadComposeEnv } = require("./helpers/compose-env");

test("signature: plain-text <pre class=\"moz-signature\"> is left byte-for-byte untouched by render", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const signatureHtml =
    '<pre class="moz-signature" cols="72">-- \nAndreas Schönebeck\ninfo@esys.de\nwww.esys.de</pre>';
  document.body.innerHTML = "Some *markdown* text" + signatureHtml;

  triggerToggle();

  assert.match(document.body.innerHTML, /<strong>|<em>markdown<\/em>|markdown/);
  assert.equal(
    document.body.querySelector(".moz-signature").outerHTML,
    signatureHtml
  );
});

test("signature: HTML <div class=\"moz-signature\"> is left untouched, including its own markup", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const signatureHtml =
    '<div class="moz-signature"><b>Andreas Schönebeck</b><br>info@esys.de</div>';
  document.body.innerHTML = "# Draft heading" + signatureHtml;

  triggerToggle();

  assert.match(document.body.innerHTML, /<h1>Draft heading<\/h1>/);
  assert.equal(
    document.body.querySelector(".moz-signature").outerHTML,
    signatureHtml
  );
});

test("signature: dashed separator line and email/URL inside the signature are NOT reinterpreted as Markdown", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const signatureHtml =
    '<pre class="moz-signature">--\nDisclaimer: confidential\n---\nabc@test.org / https://esys.eu</pre>';
  document.body.innerHTML = "Hello there" + signatureHtml;

  triggerToggle();

  // If the signature had been misinterpreted, "---" would have become an
  // <hr> and abc@test.org / https://esys.eu would have become <a> links.
  const sigOuterHtml = document.body.querySelector(".moz-signature").outerHTML;
  assert.equal(sigOuterHtml, signatureHtml);
  assert.ok(!sigOuterHtml.includes("<hr>"));
  assert.ok(!sigOuterHtml.includes("<a href"));
});

test("signature: extra blank lines/whitespace between the draft text and the signature don't leak into the signature", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const signatureHtml = '<pre class="moz-signature">-- \nAndreas</pre>';
  document.body.innerHTML =
    "Some text here" + "<br><br><br>" + signatureHtml;

  triggerToggle();

  assert.match(document.body.innerHTML, /Some text here/);
  assert.equal(
    document.body.querySelector(".moz-signature").outerHTML,
    signatureHtml
  );
});

test("signature: toggling on a fresh compose window with ONLY the auto-signature (empty body) does not insert a stray empty wrapper", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const signatureHtml = '<pre class="moz-signature">-- \nAndreas</pre>';
  document.body.innerHTML = signatureHtml;

  triggerToggle();

  assert.equal(document.body.querySelector(".markdown-paste-content"), null);
  assert.equal(
    document.body.querySelector(".moz-signature").outerHTML,
    signatureHtml
  );
});

test("signature: unrendering after a render with a signature present still restores original text and leaves signature untouched", () => {
  const { document, triggerToggle } = loadComposeEnv();
  const signatureHtml = '<pre class="moz-signature">-- \nAndreas</pre>';
  document.body.innerHTML = "Hello **World**" + signatureHtml;

  triggerToggle(); // render
  assert.match(document.body.innerHTML, /<strong>World<\/strong>/);

  triggerToggle(); // unrender
  assert.match(document.body.textContent, /Hello \*\*World\*\*/);
  assert.equal(
    document.body.querySelector(".moz-signature").outerHTML,
    signatureHtml
  );
});
