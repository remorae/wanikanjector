const STORAGE_ROOT = "wanikanjector";
const LOCAL_CACHE = `${STORAGE_ROOT}_cache`;
const SRS_NAMES = ["apprentice", "guru", "master", "enlightened", "burned"];
const TOGGLE_ACTIVE_TAB_COMMAND = "toggleActiveTab";
const AUTO_RUN_PERMISSIONS = { permissions: ["tabs"] };

function onError(e) {
  console.error(e);
}

async function saveSettings(settings) {
  const toStore = {};
  toStore[STORAGE_ROOT] = settings;
  await browser.storage.local.set(toStore);
}

function fade(el, duration, fadeIn) {
  el.style.opacity = fadeIn ? Math.max(0, el.style.opacity) : Math.min(1, el.style.opacity);

  var last = +new Date();
  var tick = function () {
    let delta = (new Date() - last) / duration;
    el.style.opacity = fadeIn ? (+el.style.opacity + delta) : (+el.style.opacity - delta);
    last = +new Date();

    if (fadeIn ? (+el.style.opacity < 1) : (+el.style.opacity > 0)) {
      (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
    }
  };

  tick();
}
function fadeIn(el, duration) { fade(el, duration, true); }
function fadeOut(el, duration) { fade(el, duration, false); }
