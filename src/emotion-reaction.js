"use strict";

const { isEmotionName, DEFAULT_EMOTION_DURATION_MS } = require("./theme-schema");

// Chat emotions are short one-off visuals: an agent reply names a mood and the
// active theme maps that name to a file. Like test reactions they are
// decorative only, so the same visibility / interaction gate applies, and a
// theme without an `emotions` map simply ignores them.
function canPlayEmotion(options = {}) {
  return options.doNotDisturb !== true
    && options.petHidden !== true
    && options.miniMode !== true
    && options.miniTransitioning !== true
    && options.dragging !== true
    && options.headless !== true
    && options.hasPetWindow === true;
}

function resolveEmotionVisual(theme, name) {
  if (!isEmotionName(name)) return null;
  const emotions = theme && theme.emotions;
  if (!emotions || !Object.prototype.hasOwnProperty.call(emotions, name)) return null;
  const file = emotions[name];
  if (typeof file !== "string" || !file) return null;
  const durationMs = Number.isFinite(theme.emotionDurationMs)
    ? theme.emotionDurationMs
    : DEFAULT_EMOTION_DURATION_MS;
  return { file, durationMs };
}

function createEmotionReactionHandler(options = {}) {
  const getActiveTheme = options.getActiveTheme || (() => null);
  const getDoNotDisturb = options.getDoNotDisturb || (() => false);
  const isPetHidden = options.isPetHidden || (() => false);
  const getMiniMode = options.getMiniMode || (() => false);
  const getMiniTransitioning = options.getMiniTransitioning || (() => false);
  const isDragging = options.isDragging || (() => false);
  const hasPetWindow = options.hasPetWindow || (() => false);
  const playVisual = options.playVisual || (() => null);

  return function handleEmotion(name, context = {}) {
    const visual = resolveEmotionVisual(getActiveTheme(), name);
    if (!visual) return false;
    if (!canPlayEmotion({
      doNotDisturb: getDoNotDisturb(),
      petHidden: isPetHidden(),
      miniMode: getMiniMode(),
      miniTransitioning: getMiniTransitioning(),
      dragging: isDragging(),
      headless: context.headless === true,
      hasPetWindow: hasPetWindow(),
    })) return false;
    return !!playVisual(visual.file, visual.durationMs);
  };
}

module.exports = {
  canPlayEmotion,
  resolveEmotionVisual,
  createEmotionReactionHandler,
};
