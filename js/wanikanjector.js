const executed = new Map();

// Convert a normal string into a regexp one.
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Replace content for the given tab if its url is not blacklisted.
function execute(tabInfo) {
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

function executeByID(tabId) {
  browser.tabs.get(tabId)
    .then(execute);
}

// Clear cache (upon reload)
function clearStatus(tabId, changeInfo) {
  if (changeInfo.status === 'complete') {
    delete executed[tabId];
  }
}

// Occurs on load if runOnLoad is true
function loadOnUpdated(tabId, changeInfo) {
  if (changeInfo.status === 'complete') {
    const needed = { permissions: ["tabs"] };
    browser.permissions.contains(needed)
      .then(havePermissions => {
        if (havePermissions)
          executeByID(tabId);
      });
  }
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
    executeByID(tab.id);
  }
}

function init() {
  function loadSettings(storage) {
    const settings = storage[STORAGE_ROOT];
    if (!settings)
      return;
    const runOnLoad = settings.runOnLoad;
    if (runOnLoad) {
      browser.tabs.onUpdated.addListener(loadOnUpdated);
    }
  }

  // Update event listeners when the user changes the extension options (in case runOnLoad has changed)
  function settingsChanged(changes, store) {
    const changed = changes[STORAGE_ROOT];
    if (!changed)
      return;
    const settings = changed.newValue;
    if (settings) {
      if (settings.runOnLoad) {
        browser.tabs.onUpdated.addListener(loadOnUpdated);
      } else {
        browser.tabs.onUpdated.removeListener(loadOnUpdated);
      }
    }
  }

  browser.browserAction.onClicked.addListener(toggleActiveTab);
  browser.tabs.onUpdated.addListener(clearStatus);
  browser.storage.onChanged.addListener(settingsChanged);

  // Load initial settings
  browser.storage.local.get().then(loadSettings);
}

init();