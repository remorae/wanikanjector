const AUTO_RUN_PERMISSIONS = { permissions: ["tabs"] };

const apiKeyInput = document.getElementById("apiKey");
const clearCacheBtn = document.getElementById("clearCache");
const cacheClearedLbl = document.getElementById("cacheClearedLbl");
const runOnLoadCheckbox = document.getElementById("runOnLoad");
const onlyReplaceLearnedVocabCheckbox = document.getElementById("onlyReplaceLearnedVocab");
const srsInputs = new Map();
for (const name of SRS_NAMES.values()) {
  srsInputs.set(name, document.getElementById(name));
}
const customVocabInput = document.getElementById("customVocab");
const blacklistInput = document.getElementById("blacklist");
const permissionsList = document.getElementById("permissions");
const clearPermissionsBtn = document.getElementById("clearPermissions");
const permsClearedLbl = document.getElementById("permsClearedLbl");

function inputChanged() {
  const settings = {
    apiKey: apiKeyInput.value,
    runOnLoad: runOnLoadCheckbox.checked,
    includedSRS: {},
    customVocab: customVocabInput.value.split('\n'),
    blacklist: blacklistInput.value.split('\n'),
    onlyReplaceLearnedVocab: onlyReplaceLearnedVocabCheckbox.checked,
  };
  if (settings.customVocab[0] === "")
    settings.customVocab = [];
  if (settings.blacklist[0] === "")
    settings.blacklist = [];
  for (const [key, element] of srsInputs.entries()) {
    settings.includedSRS[key] = element.checked;
  }

  if (settings.runOnLoad) {
    browser.permissions.request(AUTO_RUN_PERMISSIONS)
      .then(() => {
        validate(settings);
        fadeOut(permsClearedLbl, 100);
        grantedOptionalPermissions();
      }, onError)
      .finally(function () {
        refreshPermissions();
        saveSettings(settings);
      });
  }
  else {
    saveSettings(settings);
  }
}

function saveSettings(settings) {
  const toStore = {};
  toStore[STORAGE_ROOT] = settings;
  browser.storage.local.set(toStore);
}

function validate(settings) {
  browser.permissions.contains(AUTO_RUN_PERMISSIONS)
    .then(granted => {
      if (!granted) {
        if (settings)
          settings.runOnLoad = false;
        runOnLoadCheckbox.checked = false;
        noOptionalPermissions();
      }
    }, onError);
}

function noOptionalPermissions() {
  clearPermissionsBtn.classList.remove("btn-warning");
  clearPermissionsBtn.classList.add("btn-success");
  clearPermissionsBtn.classList.add("disabled");
}

function grantedOptionalPermissions() {
  clearPermissionsBtn.classList.add("btn-warning");
  clearPermissionsBtn.classList.remove("btn-success");
  clearPermissionsBtn.classList.remove("disabled");
}

function resetPermissions() {
  if (clearPermissionsBtn.classList.contains("disabled"))
    return;
  browser.permissions.remove(AUTO_RUN_PERMISSIONS);
  validate();
  refreshPermissions();
  noOptionalPermissions();
  fadeIn(permsClearedLbl, 300);
}

function getDescription(permission) {
  switch (permission) {
    case "tabs":
      return "Used to run tab URLs against the blacklist.";
    case "storage":
      return "Used to save your vocabulary list from WaniKani as well as these options.";
  }
}

function refreshPermissions() {
  browser.permissions.getAll()
    .then(result => {
      while (permissionsList.children.length > 0)
        permissionsList.removeChild(permissions.children[0]);
      result.permissions.forEach(permission => {
        // <div class="input-group">
        //   <div class="input-group-prepend">
        //     <span class="input-group-text">Blacklist</span>
        //   </div>
        //   <textarea class="form-control" id="blacklist" rows="3"></textarea>
        // </div>
        const groupDiv = document.createElement("div");
        groupDiv.className = "input-group mb-2";

        const prependDiv = document.createElement("div");
        prependDiv.className = "input-group-prepend";

        const prependText = document.createElement("span");
        prependText.className = "input-group-text";
        prependText.innerText = permission;

        const description = document.createElement("span");
        description.className = "form-control";
        description.innerText = getDescription(permission);
        description.setAttribute("style", "height: 100%");

        prependDiv.appendChild(prependText);
        groupDiv.appendChild(prependDiv);
        groupDiv.appendChild(description);
        permissionsList.appendChild(groupDiv);
      });
    }, onError);
}

function updateSettingsControlValues(settings) {
  if (!settings) {
    return;
  }
  apiKeyInput.value = settings.apiKey || "";
  runOnLoadCheckbox.checked = settings.runOnLoad ?? false;
  onlyReplaceLearnedVocabCheckbox.checked = settings.onlyReplaceLearnedVocab ?? true;
  customVocabInput.value = settings.customVocab ? settings.customVocab.join('\n') : "";
  blacklistInput.value = settings.blacklist ? settings.blacklist.join('\n') : "";
  for (const [key, element] of srsInputs.entries()) {
    element.checked = settings.includedSRS ? settings.includedSRS[key] : true;
  }
}

function setControlValues(storage) {
  validate();
  refreshPermissions();
  const settings = storage[STORAGE_ROOT];
  updateSettingsControlValues(settings);
}

function initControls() {
  browser.storage.local.get().then(setControlValues, onError);

  apiKeyInput.addEventListener("input", inputChanged);
  runOnLoadCheckbox.addEventListener("change", inputChanged);
  onlyReplaceLearnedVocabCheckbox.addEventListener("change", inputChanged);
  customVocabInput.addEventListener("input", inputChanged);
  blacklistInput.addEventListener("input", inputChanged);
  for (const element of srsInputs.values()) {
    element.addEventListener("change", inputChanged);
  }
  clearCacheBtn.addEventListener("click", clearCache);
  clearPermissionsBtn.addEventListener("click", resetPermissions);
  window.addEventListener("focus", () => {
    browser.storage.local.get().then(storage => {
      const settings = storage[STORAGE_ROOT];
      updateSettingsControlValues(settings);
    }, onError);
  });
}

initControls();