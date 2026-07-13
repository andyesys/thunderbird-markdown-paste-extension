/**
 * Validates manifest.json structure/required fields and that every file
 * referenced from it (icons, background scripts) actually exists on disk -
 * catches typos/renames that `web-ext lint` might not always flag, and
 * documents the expected shape so a future accidental edit is caught here
 * first, before a real ATN submission attempt.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "manifest.json");

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

test("manifest: manifest.json exists and is valid JSON", () => {
  assert.ok(fs.existsSync(MANIFEST_PATH));
  assert.doesNotThrow(() => readManifest());
});

test("manifest: required top-level fields are present", () => {
  const manifest = readManifest();
  assert.equal(manifest.manifest_version, 2);
  assert.equal(typeof manifest.name, "string");
  assert.equal(typeof manifest.version, "string");
  assert.equal(typeof manifest.description, "string");
});

test("manifest: version string is a valid dotted-numeric version", () => {
  const manifest = readManifest();
  assert.match(manifest.version, /^\d+(\.\d+){1,3}$/);
});

test("manifest: description is within ATN's summary length limits", () => {
  const manifest = readManifest();
  assert.ok(manifest.description.length <= 250, "AMO/ATN summary max is 250 chars");
});

test("manifest: gecko id and strict_min_version are set for Thunderbird compatibility", () => {
  const manifest = readManifest();
  const gecko = manifest.browser_specific_settings && manifest.browser_specific_settings.gecko;
  assert.ok(gecko, "browser_specific_settings.gecko must be set");
  assert.match(gecko.id, /^markdown-paste@andyesys\.dev$/);
  assert.equal(typeof gecko.strict_min_version, "string");
});

test("manifest: declares the compose permission required for composeScripts/composeAction/commands", () => {
  const manifest = readManifest();
  assert.ok(Array.isArray(manifest.permissions));
  assert.ok(manifest.permissions.includes("compose"));
});

test("manifest: background.scripts includes background.js and the file exists", () => {
  const manifest = readManifest();
  assert.ok(manifest.background && Array.isArray(manifest.background.scripts));
  assert.ok(manifest.background.scripts.includes("background.js"));
  assert.ok(fs.existsSync(path.join(ROOT, "background.js")));
});

test("manifest: compose_action and commands.toggle-markdown-render are configured", () => {
  const manifest = readManifest();
  assert.ok(manifest.compose_action, "compose_action (toolbar button) must be declared");
  assert.ok(
    manifest.commands && manifest.commands["toggle-markdown-render"],
    "the toggle-markdown-render command must be declared"
  );
});

test("manifest: every icon file referenced (top-level and compose_action) exists on disk", () => {
  const manifest = readManifest();
  const iconPaths = new Set();
  for (const p of Object.values(manifest.icons || {})) {
    iconPaths.add(p);
  }
  const actionIcons = (manifest.compose_action && manifest.compose_action.default_icon) || {};
  for (const p of Object.values(actionIcons)) {
    iconPaths.add(p);
  }
  assert.ok(iconPaths.size > 0, "expected at least one icon reference");
  for (const relPath of iconPaths) {
    assert.ok(
      fs.existsSync(path.join(ROOT, relPath)),
      `icon file referenced in manifest.json is missing: ${relPath}`
    );
  }
});
