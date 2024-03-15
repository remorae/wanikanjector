const executed = new Map();

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
        executeContentScriptOnTabById(tabId);
      });
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