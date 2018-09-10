const STORAGE_ROOT = "wanikanjector";
const LOCAL_CACHE = `${STORAGE_ROOT}_cache`

// Page input element setup
const apiKeyInput = document.getElementById("apiKey");
const clearCacheBtn = document.getElementById("clearCache");
const cacheClearedLbl = document.getElementById("cacheClearedLbl");
const runOnLoadInput = document.getElementById("runOnLoad");
const srsNames = ["apprentice", "guru", "master", "enlightened", "burned"];
const srsInputs = new Map();
for (let name of srsNames.values()) {
    srsInputs.set(name, document.getElementById(name));
}
const customVocabInput = document.getElementById("customVocab");
const blacklistInput = document.getElementById("blacklist");
const permissionsList = document.getElementById("permissions");

// Store the current options
function saveSettings() {
    let settings = {};
    settings = {
        apiKey: apiKeyInput.value,
        runOnLoad: runOnLoadInput.checked,
        includedSRS: {},
        customVocab: customVocabInput.value.split('\n'),
        blacklist: blacklistInput.value.split('\n'),
    }
    if (settings.customVocab[0] === "")
        settings.customVocab = [];
    if (settings.blacklist[0] === "")
        settings.blacklist = [];
    for (let [key, element] of srsInputs.entries()) {
        settings.includedSRS[key] = element.checked;
    }

    ensurePermissions(settings);

    let toStore = {};
    toStore[STORAGE_ROOT] = settings;
    browser.storage.local.set(toStore).then(function () {
        console.log("Saved.");
    });
}

function ensurePermissions(settings) {
    const neededForAutoRun = { permissions: ["tabs"] };
    if (settings.runOnLoad) {
        browser.permissions.request(neededForAutoRun)
        .then(granted => {
            if (!granted) {
                settings.runOnLoad = false;
                runOnLoadInput.checked = false;
            }
        });
    }
    refreshPermissions();
}

function description(permission) {
    switch (permission) {
        case "tabs":
            return "Used to run tab URLs against the blacklist."
        case "storage":
            return "Used to save your vocabulary list from WaniKani and these options."
    }
}

function refreshPermissions() {
    browser.permissions.getAll()
    .then(result => {
        while (permissionsList.children.length > 0)
            permissionsList.removeChild(permissions.children[0]);
        result.permissions.forEach(permission => {
            const node = document.createElement("li");
            node.className = "list-group-item";
            node.innerText = `${permission}: ${description(permission)}`;
            permissionsList.appendChild(node);
        });
    });
}

// Load the stored options
function loadSettings(storage) {
    const settings = storage[STORAGE_ROOT];
    if (!settings) {
        return;
    }
    else {
        ensurePermissions(settings);

        apiKeyInput.value = settings.apiKey || "";
        runOnLoadInput.checked = settings.runOnLoad;
        if (runOnLoadInput.checked === null)
            runOnLoadInput.checked = false;
        customVocabInput.value = settings.customVocab ? settings.customVocab.join('\n') : "";
        blacklistInput.value = settings.blacklist ? settings.blacklist.join('\n') : "";
        for (let [key, element] of srsInputs.entries()) {
            element.checked = settings.includedSRS ? settings.includedSRS[key] : true;
        }
    }
    console.log("Loaded.");
}

function onError(e) {
    console.error(e);
}

function fade(el, duration, fadeIn) {
    el.style.opacity = fadeIn ? 0 : 1;

    var last = +new Date();
    var tick = function() {
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

function clearCache() {
    browser.storage.local.remove(LOCAL_CACHE).then(function () {
        clearCacheBtn.classList.remove("btn-warning");
        clearCacheBtn.classList.add("btn-success");
        fadeIn(cacheClearedLbl, 500);
        console.log("Cache cleared.");
    }, onError);

}

console.log("Hello there!");
// Retrieve stored options when the page is loaded.
browser.storage.local.get().then(loadSettings, onError);

// Setup listeners to save options when the user makes modifications
apiKeyInput.addEventListener("input", saveSettings);
runOnLoadInput.addEventListener("change", saveSettings);
customVocabInput.addEventListener("input", saveSettings);
blacklistInput.addEventListener("input", saveSettings);
for (let element of srsInputs.values()) {
    element.addEventListener("change", saveSettings);
}
clearCacheBtn.addEventListener("click", clearCache);