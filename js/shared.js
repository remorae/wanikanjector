const STORAGE_ROOT = "wanikanjector";
const LOCAL_CACHE = `${STORAGE_ROOT}_cache`
const SRS_NAMES = ["apprentice", "guru", "master", "enlightened", "burned"];

function onError(e) {
  console.error(e);
}

function clearCache() {
  browser.storage.local.remove(LOCAL_CACHE).then(function () {
    clearCacheBtn.classList.remove("btn-warning");
    clearCacheBtn.classList.add("btn-success");
    fadeIn(cacheClearedLbl, 300);
    console.log("Cache cleared.");
  }, onError);
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
function executeContentScriptOnTab(tabInfo) {
  browser.storage.local.get()
    .then(function (storage) {
      function isBlacklisted() {
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
      }

      function markAsExecuted() {
        executed[tabInfo] = "jp";
      }

      if (!isBlacklisted()) {
        browser.tabs.executeScript(tabInfo.id, {
          file: "/js/content.js"
        })
          .then(markAsExecuted);
      }
    });
}

function executeContentScriptOnTabById(tabId) {
  browser.tabs.get(tabId)
    .then(executeContentScriptOnTab);
}

// Switches the current tab between English and Japanese
function toggleActiveTab(tab) {
  // Mark modified elements as English/Japanese
  function setLanguage(lang) {
    const inner = "data-" + lang;
    const title = "data-" + (lang === "jp" ? "en" : "jp");
    browser.tabs.executeScript({
      code: "let elements = document.getElementsByClassName(\".wanikanjector\");\n"
        + "Array.prototype.forEach.call(elements, function(element) {\n"
        + `element.innerText = element.attributes.get('${inner}');\n`
        + `element.title = element.attributes.get('${title}');\n`
        + "})"
    });
  }

  let lang = executed[tab.id];
  if (lang) {
    lang = (lang === "jp" ? "en" : "jp");
    executed[tab.id] = lang;
    setLanguage(lang);
  } else {
    executeContentScriptOnTabById(tab.id);
  }
}