/**
 * Static regression guard for the "grey box signature" bug: a CSS rule in
 * composestyles.css was accidentally left unscoped (e.g. bare `pre` or
 * `table`), which then applied document-wide inside the compose editor -
 * including to Thunderbird's own signature `<pre>` element - since compose
 * scripts inject their CSS into the whole compose document, not just the
 * content this extension renders.
 *
 * This test parses composestyles.css (top-level rules only - it has no
 * @media/@supports blocks currently) and asserts every selector in every
 * comma-separated selector list is scoped under `.markdown-paste-content`.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const CSS_PATH = path.resolve(__dirname, "..", "composestyles.css");

/**
 * Strips /* ... *\/ comments and extracts each rule's selector list (the
 * text before each top-level `{`).
 */
function extractSelectorGroups(cssText) {
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectorGroups = [];
  const ruleRegex = /([^{}]+)\{[^{}]*\}/g;
  let match;
  while ((match = ruleRegex.exec(withoutComments)) !== null) {
    const selectorList = match[1].trim();
    if (selectorList) {
      selectorGroups.push(selectorList);
    }
  }
  return selectorGroups;
}

test("css-scoping: composestyles.css exists and is non-empty", () => {
  assert.ok(fs.existsSync(CSS_PATH), "composestyles.css must exist");
  const cssText = fs.readFileSync(CSS_PATH, "utf8");
  assert.ok(cssText.trim().length > 0);
});

test("css-scoping: every selector in every rule is scoped under .markdown-paste-content", () => {
  const cssText = fs.readFileSync(CSS_PATH, "utf8");
  const selectorGroups = extractSelectorGroups(cssText);
  assert.ok(selectorGroups.length > 0, "expected at least one CSS rule");

  const unscoped = [];
  for (const group of selectorGroups) {
    const individualSelectors = group.split(",").map((s) => s.trim());
    for (const selector of individualSelectors) {
      if (!selector.includes(".markdown-paste-content")) {
        unscoped.push(selector);
      }
    }
  }

  assert.deepEqual(
    unscoped,
    [],
    `Found unscoped CSS selector(s) that would apply document-wide inside ` +
      `the compose editor (e.g. to Thunderbird's own signature): ${JSON.stringify(unscoped)}`
  );
});

test("css-scoping: a deliberately unscoped rule is detected by extractSelectorGroups (sanity check of the test helper itself)", () => {
  const sample = "pre, .markdown-paste-content code { color: red; }";
  const groups = extractSelectorGroups(sample);
  assert.deepEqual(groups, ["pre, .markdown-paste-content code"]);
});
