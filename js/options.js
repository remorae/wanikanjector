const apiKeyInput = document.getElementById("apiKey");
const clearCacheButton = document.getElementById("clearCache");
const cacheClearedLabel = document.getElementById("cacheClearedLabel");
const runOnLoadCheckbox = document.getElementById("runOnLoad");
const onlyReplaceLearnedVocabCheckbox = document.getElementById("onlyReplaceLearnedVocab");
const srsInputs = new Map();
for (const name of SRS_NAMES.values()) {
  srsInputs.set(name, document.getElementById(name));
}
const customVocabInput = document.getElementById("customVocab");
const blacklistInput = document.getElementById("blacklist");
const permissionsList = document.getElementById("permissions");
const clearPermissionsButton = document.getElementById("clearPermissions");
const permsClearedLabel = document.getElementById("permsClearedLabel");


async function inputChanged() {
  const settings = {
    apiKey: apiKeyInput.value,
    runOnLoad: runOnLoadCheckbox.checked,
    includedSRS: {},
    customVocab: customVocabInput.value.split('\n'),
    blacklist: blacklistInput.value.split('\n'),
    onlyReplaceLearnedVocab: onlyReplaceLearnedVocabCheckbox.checked,
  };
  if (settings.customVocab[0] === "") {
    settings.customVocab = [];
  }
  if (settings.blacklist[0] === "") {
    settings.blacklist = [];
  }
  for (const [key, element] of srsInputs.entries()) {
    settings.includedSRS[key] = element.checked;
  }

  if (settings.runOnLoad) {
    try {
      await browser.permissions.request(AUTO_RUN_PERMISSIONS);
      await validate(settings);
      if (settings.runOnLoad) {
        fadeOut(permsClearedLabel, 100);
        grantedOptionalPermissions();
        await refreshPermissions();
        await saveSettings(settings);
      }
    }
    catch (e) {
      onError(e);
      await validate(settings);
      await saveSettings(settings);
    }
  }
  else {
    await validate(settings);
    await saveSettings(settings);
  }
}

async function validate(settings) {
  try {
    const granted = await browser.permissions.contains(AUTO_RUN_PERMISSIONS);
    if (!granted) {
      if (settings) {
        settings.runOnLoad = false;
      }
      runOnLoadCheckbox.checked = false;
      noOptionalPermissions();
    }
  }
  catch (e) {
    onError(e);
  }
}

function noOptionalPermissions() {
  clearPermissionsButton.classList.remove("btn-warning");
  clearPermissionsButton.classList.add("btn-success");
  clearPermissionsButton.classList.add("disabled");
}

function grantedOptionalPermissions() {
  clearPermissionsButton.classList.add("btn-warning");
  clearPermissionsButton.classList.remove("btn-success");
  clearPermissionsButton.classList.remove("disabled");
}

async function resetPermissions() {
  if (clearPermissionsButton.classList.contains("disabled")) {
    return;
  }
  browser.permissions.remove(AUTO_RUN_PERMISSIONS);
  await validate();
  await refreshPermissions();
  noOptionalPermissions();
  fadeIn(permsClearedLabel, 300);
}

function getDescription(permission) {
  switch (permission) {
    case "tabs":
      return "Used to run tab URLs against the blacklist.";
    case "storage":
      return "Used to save your vocabulary list from WaniKani as well as these options.";
  }
}

async function refreshPermissions() {
  try {
    const result = await browser.permissions.getAll();
    while (permissionsList.children.length > 0) {
      permissionsList.removeChild(permissions.children[0]);
    }
    result.permissions.forEach(permission => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "input-group";

      const prependDiv = document.createElement("div");
      prependDiv.className = "input-group-prepend";

      const prependText = document.createElement("span");
      prependText.className = "input-group-text";
      prependText.innerText = permission;

      const description = document.createElement("span");
      description.className = "form-control";
      description.innerText = getDescription(permission);

      prependDiv.appendChild(prependText);
      groupDiv.appendChild(prependDiv);
      groupDiv.appendChild(description);
      permissionsList.appendChild(groupDiv);
    });
  }
  catch (e) {
    onError(e);
  }
}

function updateBlacklistControlValue(settings) {
  if (!settings) {
    return;
  }
  blacklistInput.value = settings.blacklist ? settings.blacklist.join('\n') : "";
}

function updateSettingsControlValues(settings) {
  if (!settings) {
    return;
  }
  apiKeyInput.value = settings.apiKey || "";
  runOnLoadCheckbox.checked = settings.runOnLoad ? settings.runOnLoad : false;
  onlyReplaceLearnedVocabCheckbox.checked = settings.onlyReplaceLearnedVocab ? settings.onlyReplaceLearnedVocab : true;
  customVocabInput.value = settings.customVocab ? settings.customVocab.join('\n') : "";
  updateBlacklistControlValue(settings);
  for (const [key, element] of srsInputs.entries()) {
    element.checked = settings.includedSRS ? settings.includedSRS[key] : true;
  }
}

async function setControlValues(storage) {
  const settings = storage[STORAGE_ROOT];
  await validate(settings);
  await refreshPermissions();
  updateSettingsControlValues(settings);
}

async function clearCache() {
  try {
    await browser.storage.local.remove(LOCAL_CACHE);
    clearCacheButton.classList.remove("btn-warning");
    clearCacheButton.classList.add("btn-success");
    fadeIn(cacheClearedLabel, 300);
  }
  catch (e) {
    onError(e);
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

  apiKeyInput.addEventListener("input", inputChanged);
  runOnLoadCheckbox.addEventListener("change", inputChanged);
  onlyReplaceLearnedVocabCheckbox.addEventListener("change", inputChanged);
  customVocabInput.addEventListener("input", inputChanged);
  blacklistInput.addEventListener("input", inputChanged);
  for (const element of srsInputs.values()) {
    element.addEventListener("change", inputChanged);
  }
  clearCacheButton.addEventListener("click", clearCache);
  clearPermissionsButton.addEventListener("click", resetPermissions);
  window.addEventListener("focus", async () => {
    try {
      const storage = await browser.storage.local.get();
      const settings = storage[STORAGE_ROOT];
      updateBlacklistControlValue(settings);
    }
    catch (e) {
      onError(e);
    }
  });
}

initControls();