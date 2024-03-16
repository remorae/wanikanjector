const STORAGE_ROOT = "wanikanjector";
const LOCAL_CACHE = `${STORAGE_ROOT}_cache`;
const SRS_NAMES = ["apprentice", "guru", "master", "enlightened", "burned"];

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

// Replace content for the given tab if its url is not blacklisted.
async function executeContentScriptOnTab(tabInfo) {
  const storage = await browser.storage.local.get();
  const isBlacklisted = () => {
    if (tabInfo.url.startsWith(browser.extension.getURL("")))
      return true; // Make sure the options/popup pages are in English
    const settings = storage[STORAGE_ROOT];
    if (!settings)
      return false;
    const blacklist = settings.blacklist;
    if (blacklist && blacklist.length > 0) {
      const pattern = new RegExp(
        blacklist.map(function (entry) {
          // Allow both regex and exact URLs.
          return '(' + entry + ')';
        })
          .join('|'));
      return pattern.test(tabInfo.url);
    }
    return false;
  };

  const markAsExecuted = () => {
    executed[tabInfo] = "jp";
  };

  if (!isBlacklisted()) {
    await browser.tabs.executeScript(tabInfo.id, {
      file: "/js/content.js"
    });
    markAsExecuted();
  }
}

async function executeContentScriptOnTabById(tabId) {
  const tabInfo = await browser.tabs.get(tabId);
  await executeContentScriptOnTab(tabInfo);
}

// Switches the current tab between English and Japanese
async function toggleActiveTab(tab) {
  // Mark modified elements as English/Japanese
  const setLanguage = async (lang) => {
    const inner = "data-" + lang;
    const title = "data-" + (lang === "jp" ? "en" : "jp");
    await browser.tabs.executeScript({
      code: "let elements = document.getElementsByClassName(\".wanikanjector\");\n"
        + "Array.prototype.forEach.call(elements, function(element) {\n"
        + `element.innerText = element.attributes.get('${inner}');\n`
        + `element.title = element.attributes.get('${title}');\n`
        + "})"
    });
  };

  let lang = executed[tab.id];
  if (lang) {
    lang = (lang === "jp" ? "en" : "jp");
    executed[tab.id] = lang;
    await setLanguage(lang);
  } else {
    await executeContentScriptOnTabById(tab.id);
  }
}