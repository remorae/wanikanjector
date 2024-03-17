const executed = new Map();

// Clear cache (upon reload)
function clearStatus(tabId, changeInfo) {
  if (changeInfo.status === 'complete') {
    delete executed[tabId];
  }
}

// Occurs on load if runOnLoad is true
async function loadOnUpdated(tabId, changeInfo) {
  if (changeInfo.status === 'complete') {
    const havePermissions = await browser.permissions.contains(AUTO_RUN_PERMISSIONS);
    if (havePermissions) {
      executeContentScriptOnTabById(tabId, true);
    }
  }
}

function isBlacklistedUrl(tabInfo, storage) {
  if (tabInfo.url.startsWith(browser.extension.getURL(""))) {
    return true; // Make sure the options/popup pages are in English
  }
  const settings = storage[STORAGE_ROOT];
  if (!settings) {
    return false;
  }
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

function markTabAsExecuted(tabId) {
  executed[tabId] = "jp";
}

async function executeContentScriptOnTab(tabInfo, useBlacklist) {
  const storage = await browser.storage.local.get();

  if (!useBlacklist || !isBlacklistedUrl(tabInfo, storage)) {
    await browser.tabs.executeScript(tabInfo.id, {
      file: "/js/content.js"
    });
    markTabAsExecuted(tabInfo.id);
  }
}

async function executeContentScriptOnTabById(tabId, useBlacklist) {
  const tabInfo = await browser.tabs.get(tabId);
  await executeContentScriptOnTab(tabInfo, useBlacklist);
}

// Mark modified elements as English/Japanese
async function setLanguage(lang, tabId) {
  const inner = `data-${lang}`;
  const title = `data-${(lang === "jp") ? "en" : "jp"}`;
  await browser.tabs.executeScript(tabId, {
    code: "{"
      + "  const elements = document.getElementsByClassName('wanikanjector');"
      + "  for (const element of elements) {"
      + `    element.innerText = element.attributes.getNamedItem("${inner}").value;`
      + `    element.attributes.title.value = element.attributes.getNamedItem("${title}").value;`
      + "  }"
      + "}"
  });
};

// Switches the current tab between English and Japanese
async function toggleActiveTab(tabInfo) {
  let lang = executed[tabInfo.id];
  if (lang) {
    lang = (lang === "jp") ? "en" : "jp";
    executed[tabInfo.id] = lang;
    await setLanguage(lang, tabInfo.id);
  } else {
    await executeContentScriptOnTab(tabInfo, false);
  }
}

function loadSettings(storage) {
  const settings = storage[STORAGE_ROOT];
  if (!settings) {
    return;
  }
  const runOnLoad = settings.runOnLoad;
  if (runOnLoad) {
    browser.tabs.onUpdated.addListener(loadOnUpdated);
  }
}

// Update event listeners when the user changes the extension options (in case runOnLoad has changed)
function settingsChanged(changes, _store) {
  const changed = changes[STORAGE_ROOT];
  if (!changed) {
    return;
  }
  const settings = changed.newValue;
  if (settings) {
    if (settings.runOnLoad) {
      browser.tabs.onUpdated.addListener(loadOnUpdated);
    } else {
      browser.tabs.onUpdated.removeListener(loadOnUpdated);
    }
  }
}

function handleMessage(request, _sender, _sendResponse) {
  if (request.command === TOGGLE_ACTIVE_TAB_COMMAND) {
    return toggleActiveTab(request.tabId);
  }
  return false;
}

async function init() {
  browser.browserAction.onClicked.addListener(toggleActiveTab);
  browser.tabs.onUpdated.addListener(clearStatus);
  browser.storage.onChanged.addListener(settingsChanged);
  browser.runtime.onMessage.addListener(handleMessage);

  // Load initial settings
  const storage = await browser.storage.local.get();
  loadSettings(storage);
}

init();