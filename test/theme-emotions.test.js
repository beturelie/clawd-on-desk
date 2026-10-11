"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");

const {
  mergeDefaults,
  collectRequiredAssetFiles,
  normalizeEmotionMap,
} = require("../src/theme-schema");
const { extractMoodFromText } = require("../hooks/clawd-hook");

function makeTheme(extra = {}) {
  return mergeDefaults({
    name: "Mood Theme",
    viewBox: { x: 0, y: 0, width: 32, height: 32 },
    states: { idle: ["idle.svg"], thinking: ["thinking.svg"], working: ["working.svg"], sleeping: ["sleeping.svg"] },
    emotions: { shy: "shy.svg", love: "../love.svg", "Bad Name": "bad.svg", sad: 3 },
    ...extra,
  }, "mood-theme", false);
}

describe("theme chat emotions", () => {
  it("keeps only valid names and basenames their files", () => {
    assert.deepStrictEqual(normalizeEmotionMap({ shy: "a/shy.svg", "Bad Name": "x.svg", sad: 1 }), { shy: "shy.svg" });
    assert.strictEqual(normalizeEmotionMap({}), null);
    assert.strictEqual(normalizeEmotionMap("shy.svg"), null);
    assert.deepStrictEqual(makeTheme().emotions, { shy: "shy.svg", love: "love.svg" });
  });

  it("counts emotion files as required assets", () => {
    const files = collectRequiredAssetFiles(makeTheme());
    assert.ok(files.includes("shy.svg"));
    assert.ok(files.includes("love.svg"));
  });
});

describe("Claude hook mood marker", () => {
  it("reads the last marker in either form", () => {
    assert.strictEqual(extractMoodFromText("好的\n\n<!-- mood: shy -->"), "shy");
    assert.strictEqual(extractMoodFromText("[mood: thumbsup] ok"), "thumbsup");
    assert.strictEqual(extractMoodFromText("<!-- mood：love --> then <!-- mood: fork -->"), "fork");
    assert.strictEqual(extractMoodFromText("<!-- MOOD: Shy -->"), "shy");
  });

  it("ignores text without a valid marker", () => {
    assert.strictEqual(extractMoodFromText("no marker"), null);
    assert.strictEqual(extractMoodFromText("<!-- mood: two words -->"), null);
    assert.strictEqual(extractMoodFromText(null), null);
  });
});
