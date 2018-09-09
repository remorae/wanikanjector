// Page input element setup
const apiKeyInput = document.getElementById("apiKey");
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

    browser.storage.local.set(options).then(function(){
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