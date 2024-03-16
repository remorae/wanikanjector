const kanjiToggleButton = document.getElementById("kanjiToggleButton");
const generateVocabButton = document.getElementById("vocabButton");
const optionsButton = document.getElementById("optionsButton");
const blacklistInput = document.getElementById("blacklist");

async function inputChanged() {
  try {
    const storage = await browser.storage.local.get();
    const settings = storage[STORAGE_ROOT];
    if (!settings) {
      return;
    }
    settings.blacklist = blacklistInput.value.split('\n');
    await saveSettings(settings);
  }
  catch (e) {
    onError(e);
  }
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

async function initControls() {
  try {
    const storage = await browser.storage.local.get();
    setControlValues(storage);
  }
  catch (e) {
    onError(e);
  }

  optionsButton.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
  blacklistInput.addEventListener("input", inputChanged);
}

initControls();