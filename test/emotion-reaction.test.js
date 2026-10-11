"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert");

const {
  canPlayEmotion,
  resolveEmotionVisual,
  createEmotionReactionHandler,
} = require("../src/emotion-reaction");
const {
  mergeDefaults,
  collectRequiredAssetFiles,
  normalizeEmotionMap,
  normalizeEmotionDurationMs,
} = require("../src/theme-schema");
const { extractMoodFromText } = require("../hooks/clawd-hook");

function makeTheme(extra = {}) {
  return mergeDefaults({
    name: "Mood Theme",
    viewBox: { x: 0, y: 0, width: 32, height: 32 },
    states: { idle: ["idle.svg"], thinking: ["thinking.svg"], working: ["working.svg"], sleeping: ["sleeping.svg"] },
    emotions: { shy: "shy.svg", love: "../love.svg", "Bad Name": "bad.svg", sad: 3 },
    emotionDurationMs: 2500,
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

  it("clamps the duration and falls back to the default", () => {
    assert.strictEqual(normalizeEmotionDurationMs(undefined), 4000);
    assert.strictEqual(normalizeEmotionDurationMs(10), 500);
    assert.strictEqual(normalizeEmotionDurationMs(99999), 15000);
    assert.strictEqual(makeTheme().emotionDurationMs, 2500);
  });

  it("counts emotion files as required assets", () => {
    const files = collectRequiredAssetFiles(makeTheme());
    assert.ok(files.includes("shy.svg"));
    assert.ok(files.includes("love.svg"));
  });
});

describe("emotion reaction main-process gate", () => {
  it("resolves only names the theme declares", () => {
    const theme = makeTheme();
    assert.deepStrictEqual(resolveEmotionVisual(theme, "shy"), { file: "shy.svg", durationMs: 2500 });
    assert.strictEqual(resolveEmotionVisual(theme, "angry"), null);
    assert.strictEqual(resolveEmotionVisual(theme, "toString"), null);
    assert.strictEqual(resolveEmotionVisual(theme, "SHY"), null);
    assert.strictEqual(resolveEmotionVisual(mergeDefaults({ states: {} }, "plain", false), "shy"), null);
  });

  it("requires a visible regular pet and a non-headless source", () => {
    const base = {
      doNotDisturb: false,
      petHidden: false,
      miniMode: false,
      miniTransitioning: false,
      dragging: false,
      headless: false,
      hasPetWindow: true,
    };
    assert.strictEqual(canPlayEmotion(base), true);
    for (const key of ["doNotDisturb", "petHidden", "miniMode", "miniTransitioning", "dragging", "headless"]) {
      assert.strictEqual(canPlayEmotion({ ...base, [key]: true }), false, key);
    }
    assert.strictEqual(canPlayEmotion({ ...base, hasPetWindow: false }), false);
  });

  it("plays the mapped file for the theme duration", () => {
    const played = [];
    let dnd = false;
    const handle = createEmotionReactionHandler({
      getActiveTheme: () => makeTheme(),
      getDoNotDisturb: () => dnd,
      hasPetWindow: () => true,
      playVisual: (file, durationMs) => { played.push([file, durationMs]); return { file }; },
    });
    assert.strictEqual(handle("shy"), true);
    assert.strictEqual(handle("angry"), false);
    assert.strictEqual(handle("love", { headless: true }), false);
    dnd = true;
    assert.strictEqual(handle("love"), false);
    assert.deepStrictEqual(played, [["shy.svg", 2500]]);
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
