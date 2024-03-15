const STORAGE_ROOT = "wanikanjector";
const LOCAL_CACHE = `${STORAGE_ROOT}_cache`;
const API_KEY_ERROR = "No API key provided! Please visit the options page to set it.";
const SRS_NAMES = ["apprentice", "guru", "master", "enlightened", "burned"];

const levelToSrsName = new Map();
levelToSrsName.set(1, SRS_NAMES[0]);
levelToSrsName.set(2, SRS_NAMES[0]);
levelToSrsName.set(3, SRS_NAMES[0]);
levelToSrsName.set(4, SRS_NAMES[0]);
levelToSrsName.set(5, SRS_NAMES[1]);
levelToSrsName.set(6, SRS_NAMES[1]);
levelToSrsName.set(7, SRS_NAMES[2]);
levelToSrsName.set(8, SRS_NAMES[3]);
levelToSrsName.set(9, SRS_NAMES[4]);

function parseHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.childNodes;
}

NodeList.prototype.replaceText = function (search, replaceFunc, textOnly = false) {
  let replaced = 0;
  const toRemove = [];
  for (const element of this) {
    let node = element.firstChild;
    if (node === null)
      continue;

    do {
      if (node.nodeType !== Node.TEXT_NODE)
        continue;
      const original = node.nodeValue;
      const replacement = original.replace(search, replaceFunc);
      if (replacement === original)
        continue;

      ++replaced;
      if (textOnly || !/</.test(replacement)) {
        node.nodeValue = replacement;
      }
      else {
        // HTML
        const nodes = parseHtml(replacement);
        while (nodes.length > 0) {
          node.parentNode.insertBefore(nodes[0], node); // This removes nodes[0] from nodes ;_;
        }
        toRemove.push(node);
      }
    } while (node = node.nextSibling);
  }
  for (const child of toRemove.values()) {
    child.parentNode.removeChild(child);
  }
  return replaced;
};

function isCacheExpired(date) {
  const then = new Date(date);
  const now = new Date();
  return (Math.abs(now - then) > (3600 * 1000)); // 1 hour
}

function getWanikaniAPIResponse(apiKey, url, type) {
  if (apiKey === null) {
    console.error(API_KEY_ERROR);
    return null;
  }

  let responseObject = null;
  const request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (request.readyState !== XMLHttpRequest.DONE) {
      return;
    }
    if (request.status === 200) {
      responseObject = JSON.parse(request.responseText);
    } else {
      console.error(`Request to WaniKani API failed: server returned status code ${request.status}.`);
      return;
    }
    if (responseObject === null || responseObject.object !== type) {
      console.error("Failed to parse WaniKani API response.");
      responseObject = null;
    }
  };
  request.open("GET", url, false);
  request.setRequestHeader("Authorization", `Bearer ${apiKey}`);
  request.send();
  return responseObject;
}

function getWanikaniUserInfo(apiKey) {
  return getWanikaniAPIResponse(apiKey, "https://api.wanikani.com/v2/user", "user");
}

function getWanikaniCollection(apiKey, url) {
  let collection = getWanikaniAPIResponse(apiKey, url, "collection");
  if (collection !== null) {
    while (collection.pages.next_url !== null) {
      const nextPage = getWanikaniAPIResponse(apiKey, collection.pages.next_url, "collection");
      if (nextPage === null) {
        return null;
      }
      collection.data = collection.data.concat(nextPage.data);
      collection.pages = nextPage.pages;
    }
  }
  return collection;
}

function makeLevelsParam(userInfo, respectCurrentLevel) {
  const maxLevel = (respectCurrentLevel) ? Math.min(userInfo.data.level, userInfo.data.subscription.max_level_granted) : userInfo.data.subscription.max_level_granted;
  let levelsParam = "";
  for (let i = 1; i <= maxLevel; ++i) {
    if (i > 1) {
      levelsParam += ",";
    }
    levelsParam += `${i}`;
  }
  return levelsParam;
}

function getWanikaniVocabAssignments(apiKey) {
  const userInfo = getWanikaniUserInfo(apiKey);
  if (userInfo === null) {
    console.error("Failed to get WaniKani user information.");
    return null;
  }

  const levelsParam = makeLevelsParam(userInfo, true);
  return getWanikaniCollection(apiKey, `https://api.wanikani.com/v2/assignments?levels=${levelsParam}&started&subject_types=vocabulary`);
}

function updateCachedWanikaniVocabAssignments(cache, apiKey) {
  if (!cache.vocabAssignments || !cache.insertedVocabAssignments || isCacheExpired(cache.insertedVocabAssignments)) {
    console.log("Fetching latest WaniKani vocab assignments...");
    const vocabAssignments = getWanikaniVocabAssignments(apiKey);
    if (vocabAssignments !== null) {
      cache.insertedVocabAssignments = (new Date()).toJSON();
      cache.vocabAssignments = vocabAssignments;
      browser.storage.local.set(cache);
    }
    else {
      console.error("Failed to get WaniKani vocab assignments.");
    }
  }
  else {
    console.log("Using cached vocab assignments.");
  }
  return cache.vocabAssignments;
}

function includeVocabAssignment(assignment, includedSRS) {
  if (assignment.data.subject_type !== "vocabulary") {
    return false;
  }
  if (includedSRS) {
    const srsName = levelToSrsName.get(assignment.data.srs_stage);
    const included = includedSRS[srsName];
    return included === null || included;
  }
  return true;
}

function getWanikaniVocabSubjects(apiKey, respectCurrentLevel) {
  const userInfo = getWanikaniUserInfo(apiKey);
  if (userInfo === null) {
    console.error("Failed to get WaniKani user information.");
    return null;
  }

  const levelsParam = makeLevelsParam(userInfo, respectCurrentLevel);
  return getWanikaniCollection(apiKey, `https://api.wanikani.com/v2/subjects?types=vocabulary&levels=${levelsParam}`);
}

function updateCachedWanikaniVocabSubjects(cache, apiKey, respectCurrentLevel) {
  if (!cache.vocabSubjects || !cache.insertedVocabSubjects || isCacheExpired(cache.insertedVocabSubjects)) {
    console.log("Fetching latest WaniKani vocab subjects...");
    const vocabSubjects = getWanikaniVocabSubjects(apiKey, respectCurrentLevel);
    if (vocabSubjects !== null) {
      cache.insertedVocabSubjects = (new Date()).toJSON();
      cache.vocabSubjects = vocabSubjects;
      browser.storage.local.set(cache);
    }
    else {
      console.error("Failed to get WaniKani vocab subjects.");
    }
  }
  else {
    console.log("Using cached vocab subjects.");
  }
  return cache.vocabSubjects;
}

function buildVocabDictionary(vocabDict, vocabAssignments, vocabSubjects, onlyReplaceLearnedVocab) {
  if (onlyReplaceLearnedVocab) {
    for (const assignment of vocabAssignments.values()) {
      const subject = vocabSubjects.data.find(subject => subject.id === assignment.data.subject_id);
      if (!subject || subject === null) {
        //console.error(`Missing subject for assignment with id ${assignment.id}`);
        continue;
      }
      const meanings = subject.data.meanings;
      for (const meaning of meanings.values()) {
        vocabDict.set(meaning.meaning.toLowerCase(), subject.data.characters);
      }
    }
  }
  else {
    for (const subject of vocabSubjects.data) {
      const meanings = subject.data.meanings;
      for (const meaning of meanings.values()) {
        vocabDict.set(meaning.meaning.toLowerCase(), subject.data.characters);
      }
    }
  }
}

function importWanikaniVocab(vocabDict, apiKey, includedSRS, onlyReplaceLearnedVocab, cache) {
  const vocabAssignments = updateCachedWanikaniVocabAssignments(cache, apiKey);
  if (vocabAssignments !== null) {
    console.log(`Found ${vocabAssignments.data.length} vocabulary assignments.`);
    const filteredAssignments = vocabAssignments.data.filter(assignment => includeVocabAssignment(assignment, includedSRS));
    console.log(`${filteredAssignments.length} vocabulary assignments remain after applying filters.`);
    const vocabSubjects = updateCachedWanikaniVocabSubjects(cache, apiKey, onlyReplaceLearnedVocab);
    if (vocabSubjects !== null) {
      console.log(`Found ${vocabSubjects.data.length} vocabulary subjects.`);
      buildVocabDictionary(vocabDict, filteredAssignments, vocabSubjects, onlyReplaceLearnedVocab);
    }
  }
}

function getReading(wkVocab, customVocab, target) {
  //const ENTRY_DELIM = '\n';
  //const JAPANESE_DELIM = ';';
  //const ENGLISH_DELIM = ',';

  if (customVocab !== null && customVocab.size > 0) {
    //TODO: Custom vocab
  }

  for (const word of wkVocab.values()) {
    if (word.character == target)
      return word.kana;
  }
  return target;
}

function buildReplaceFunc(vocabDict, wkVocab, settings) {
  return function (str) {
    const replacement = vocabDict.get(str.toLowerCase());
    if (!replacement || replacement === null)
      return str;
    //TODO: Custom vocab
    //TODO: Audio?
    //const reading = getReading(wkVocab, null, kanji);
    const onClick = "const title = this.attributes.get('title');\n"
      + "this.attributes.set('title', this.innerText);"
      + "this.innerText = title";
    return `<span class="wanikanjector" title="${str}" data-en="${str}" data-jp="${replacement}" onClick="${onClick}">${replacement}</span>`;
  };
}

function main() {
  browser.storage.local.get().then(function (storage) {
    console.log("Injecting kanji into your webpage...");
    const settings = storage[STORAGE_ROOT];

    let cache = null;
    const vocabDict = new Map();

    const apiKey = settings ? settings.apiKey : null;
    if (apiKey === null) {
      console.error(API_KEY_ERROR);
    }
    else {
      cache = localStorage[LOCAL_CACHE];
      if (!cache) {
        cache = {};
      }
      importWanikaniVocab(vocabDict, apiKey, settings.includedSRS, settings.onlyReplaceLearnedVocab, cache);
      console.log(`WaniKani vocab dictionary: ${vocabDict.size} entries`);
      const replaceFunc = buildReplaceFunc(vocabDict, cache, settings);
      const elements = document.querySelectorAll("body :not(noscript):not(script):not(style)");
      const replaced = elements.replaceText(/\b\S+\b/g, replaceFunc);
      console.log(`Replaced ${replaced} elements!`);
    }
  });
}

main();