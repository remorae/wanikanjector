const kanjiToggleBtn = document.getElementById("kanjiToggleBtn");
const generateVocabBtn = document.getElementById("vocabBtn");
const optionsBtn = document.getElementById("optionsBtn");
const blacklistInput = document.getElementById("blacklist");

optionsBtn.addEventListener("click", el => {
    browser.runtime.openOptionsPage();
    window.close();
});

function inputChanged() {
  browser.storage.local.get().then(storage => {
    const settings = storage[STORAGE_ROOT];
    if (!settings) {
      return;
    }
    settings.blacklist = blacklistInput.value.split('\n')
    saveSettings(settings);
  }, onError);
}

function saveSettings(settings) {
  const toStore = {};
  toStore[STORAGE_ROOT] = settings;
  browser.storage.local.set(toStore);
}

function setControlValues(storage) {
    const settings = storage[STORAGE_ROOT];
    if (!settings) {
      return;
    }
    else {
      blacklistInput.value = settings.blacklist ? settings.blacklist.join('\n') : "";
    }
  }

function initControls() {
    browser.storage.local.get().then(setControlValues, onError);

    blacklistInput.addEventListener("input", inputChanged);
}

initControls();