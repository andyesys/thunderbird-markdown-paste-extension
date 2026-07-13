/**
 * "Completeness" checks that aren't specific to Markdown parsing:
 *  - every vendor file documented in VENDOR.md actually exists in vendor/
 *  - manifest.json's composeScripts registration (in background.js) and
 *    VENDOR.md/manifest agree on which vendor files are shipped
 *  - a lightweight regression guard that none of this add-on's own files
 *    use eval()/new Function() (required for CSP compliance - documented
 *    as a one-time manual check previously; now automated).
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function extractVendorFilesFromVendorMd() {
  const text = fs.readFileSync(path.join(ROOT, "VENDOR.md"), "utf8");
  const matches = [...text.matchAll(/`(vendor\/[^`]+)`/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

test("vendor-integrity: every file documented in VENDOR.md exists in vendor/", () => {
  const files = extractVendorFilesFromVendorMd();
  assert.ok(files.length > 0, "expected VENDOR.md to document at least one vendor file");
  for (const relPath of files) {
    assert.ok(
      fs.existsSync(path.join(ROOT, relPath)),
      `VENDOR.md documents ${relPath} but it is missing from vendor/`
    );
  }
});

test("vendor-integrity: background.js's composeScripts.register() file list only references files that exist", () => {
  const backgroundSrc = fs.readFileSync(path.join(ROOT, "background.js"), "utf8");
  const fileRefs = [...backgroundSrc.matchAll(/file:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(fileRefs.length > 0, "expected at least one { file: \"...\" } entry");
  for (const relPath of fileRefs) {
    assert.ok(
      fs.existsSync(path.join(ROOT, relPath)),
      `background.js registers "${relPath}" as a compose script/style file but it does not exist`
    );
  }
});

test("vendor-integrity: every vendor/*.js and vendor/*.css file present on disk is referenced from background.js", () => {
  const vendorDir = path.join(ROOT, "vendor");
  const actualFiles = fs
    .readdirSync(vendorDir)
    .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
    .map((f) => `vendor/${f}`);
  const backgroundSrc = fs.readFileSync(path.join(ROOT, "background.js"), "utf8");
  for (const relPath of actualFiles) {
    assert.ok(
      backgroundSrc.includes(relPath),
      `vendor/ contains ${relPath} but background.js never registers it - stale/unused file?`
    );
  }
});

test("vendor-integrity: no first-party source file uses eval() or new Function() (CSP compliance)", () => {
  const firstPartyFiles = ["background.js", "composescript.js"];
  const dangerousPattern = /\beval\s*\(|new\s+Function\s*\(/;
  for (const relPath of firstPartyFiles) {
    const src = fs.readFileSync(path.join(ROOT, relPath), "utf8");
    assert.ok(
      !dangerousPattern.test(src),
      `${relPath} appears to use eval()/new Function(), which is not CSP-compliant`
    );
  }
});
