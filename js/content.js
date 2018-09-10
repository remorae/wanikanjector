function cacheVocabList(vocab) {
  cache = {};
  cache[LOCAL_CACHE] = {
    inserted: (new Date()).toJSON(),
    vocabList: vocab
  };
  browser.storage.local.set(cache);
}

function tryWaniKani(apiKey, async) {
  if (!apiKey) {
    console.error(API_KEY_ERROR);
    return [];
  }

  let vocab;
  const request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (request.readyState === XMLHttpRequest.DONE) {
      if (request.status === 200) {
        vocab = JSON.parse(request.responseText).requested_information.general;
        cacheVocabList(vocab);
      } else {
        console.error("Could not retrieve WaniKani vocabulary.");
        console.error(response.status);
        vocab = [];
      }
    }
  };
  request.open("GET", `https://www.wanikani.com/api/v1.4/user/${apiKey}/vocabulary`, async);
  request.send();
  return vocab;
}

function tryCacheOrWaniKani(hit, apiKey) {
  function isExpired(date) {
    const then = new Date(date);
    const now = new Date();
    return (Math.abs(now - then) > (3600 * 1000)); // 1 hour
  }

  if (hit && hit.vocabList) {
    if (!hit.inserted || isExpired(hit.inserted)) {
      return tryWaniKani(apiKey, true);
    }
    console.log("Using cached vocabulary.");
    return hit.vocabList;
  }

  return tryWaniKani(apiKey, false);
}

function vocabFilter(word, includedSRS) {
  if (includedSRS) {
    const level = word.user_specific ? word.user_specific.srs : null;
    if (level) {
      const included = includedSRS[level];
      return included === null || included;
    }
  }
  return true;
}

function buildWaniKaniDictionary(vocab) {
  const results = new Map();
  for (let word of vocab.values()) {
    const meanings = word.meaning.split(", ");
    for (let meaning of meanings.values()) {
      results.set(meaning, word.character);
    }
    if (word.user_specific) {
      const synonyms = word.user_specific.user_synonyms || [];
      for (let synonym of synonyms.values()) {
        results.set(synonym, word.character);
      }
    }
  }
  return results;
}

function importWaniKaniVocab(vocabDict, apiKey, includedSRS, cache) {
  const vocab = tryCacheOrWaniKani(cache, apiKey);
  if (vocab && vocab.length > 0) {
    console.log(`WaniKani results: ${vocab.length}`);
    const filtered = vocab.filter(word => vocabFilter(word, includedSRS));
    console.log(`Filtered results: ${filtered.length}`);
    for (let [key, value] of buildWaniKaniDictionary(filtered).entries()) {
      vocabDict.set(key, value);
    }
  }
}

function getReading(wkVocab, customVocab, target) {
  //const ENTRY_DELIM = '\n';
  //const JAPANESE_DELIM = ';';
  //const ENGLISH_DELIM = ',';

  if (customVocab && customVocab.size > 0) {
    //TODO: Custom vocab
  }

  for (let word of wkVocab.values()) {
    if (word.character == target)
      return word.kana;
  }
  return target;
}

function buildReplaceFunc(vocabDict, wkVocab, settings) {
  return function (str) {
    const kanji = vocabDict.get(str.toLowerCase());
    if (!kanji)
      return str;
    //TODO: Custom vocab
    //TODO: Audio?
    //const reading = getReading(wkVocab, null, kanji);
    const onClick = "const title = this.attributes.get('title');\n"
      + "this.attributes.set('title', this.innerText);"
      + "this.innerText = title";
    return `<span class="wanikanjector" title="${str}" data-en="${str}" data-jp="${kanji}" onClick="${onClick}">${kanji}</span>`;
  };
}

function main() {
  browser.storage.local.get().then(function (storage) {
    console.log("Injecting kanji into your webpage...");
    const settings = storage[STORAGE_ROOT];

    let cache = null;
    const vocabDict = new Map();

    const apiKey = settings ? settings.apiKey : null;
    if (!apiKey) {
      console.error(API_KEY_ERROR);
    }
    else {
      browser.storage.local.get().then(function (localStorage) {
        cache = localStorage[LOCAL_CACHE];
        importWaniKaniVocab(vocabDict, apiKey, settings.includedSRS, cache);
        console.log("WaniKani entries: " + vocabDict.size);

        const replaceFunc = buildReplaceFunc(vocabDict, cache, settings);
        const elements = document.querySelectorAll("body :not(noscript):not(script):not(style)");
        elements.replaceText(/\b(\S+?)\b/g, replaceFunc);
        console.log("Finished!");
      });
    }
  });
}

main();