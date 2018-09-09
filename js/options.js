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

// Store the current options
function storeOptions() {
    let options = {
        wanikanjector: {
            apiKey: apiKeyInput.value,
            runOnLoad: runOnLoadInput.checked,
            includedSRS: {},
            customVocab: customVocabInput.value.split('\n'),
            blacklist: blacklistInput.value.split('\n'),
        }
    }
    for (let [key, element] of srsInputs.entries()) {
        options.wanikanjector.includedSRS[key] = element.checked;
    }

    browser.storage.local.set(options).then(function () {
        console.log("Saved.");
    });
}

// Load the stored options
function loadOptions(restored) {
    apiKeyInput.value = restored.wanikanjector.apiKey || "";
    runOnLoadInput.checked = restored.wanikanjector.runOnLoad;
    if (runOnLoadInput.checked == null)
        runOnLoadInput.checked = true;
    customVocabInput.value = restored.wanikanjector.customVocab.join('\n') || "";
    blacklistInput.value = restored.wanikanjector.blacklist.join('\n') || "";
    for (let [key, element] of srsInputs.entries()) {
        element.checked = restored.wanikanjector.includedSRS[key];
    }
    console.log("Loaded.");
}

function onError(e) {
    console.error(e);
}

function fade(el, duration, fadeIn) {
    console.log(fadeIn);
    el.style.opacity = fadeIn ? 0 : 1;

    var last = +new Date();
    var tick = function() {
        let delta = (new Date() - last) / duration;
        console.log(delta);
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
    browser.storage.local.remove("wanikanjector.vocabCache").then(function () {
        clearCacheBtn.classList.remove("btn-warning");
        clearCacheBtn.classList.add("btn-success");
        fadeIn(cacheClearedLbl, 500);
        console.log("Cache cleared.");
    }, onError);

}

console.log("Hello there!");
// Retrieve stored options when the page is loaded.
browser.storage.local.get().then(loadOptions, onError);

// Setup listeners to save options when the user makes modifications
apiKeyInput.addEventListener("input", storeOptions);
runOnLoadInput.addEventListener("change", storeOptions);
customVocabInput.addEventListener("input", storeOptions);
blacklistInput.addEventListener("input", storeOptions);
for (let element of srsInputs.values()) {
    element.addEventListener("change", storeOptions);
}
clearCacheBtn.addEventListener("click", clearCache);