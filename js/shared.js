const STORAGE_ROOT = "wanikanjector";
const LOCAL_CACHE = `${STORAGE_ROOT}_cache`
const API_KEY_ERROR = "No API key provided! Please visit the options page to set it.";
const AUTO_RUN_PERMISSIONS = { permissions: ["tabs"] };

function parseHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.childNodes;
}

NodeList.prototype.replaceText = function (search, replaceFunc, textOnly = false) {
  const toRemove = [];
  for (let element of this) {
    let node = element.firstChild;
    if (!node)
      continue;

    do {
      if (node.nodeType !== Node.TEXT_NODE)
        continue;
      const original = node.nodeValue;
      const replacement = original.replace(search, replaceFunc);
      if (replacement === original)
        continue;

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
  for (let child of toRemove.values()) {
    child.parentNode.removeChild(child);
  }
}

function onError(e) {
  console.error(e);
}

function clearCache() {
  browser.storage.local.remove(LOCAL_CACHE).then(function () {
    clearCacheBtn.classList.remove("btn-warning");
    clearCacheBtn.classList.add("btn-success");
    fadeIn(cacheClearedLbl, 300);
    console.log("Cache cleared.");
  }, onError);
}

function fade(el, duration, fadeIn) {
  el.style.opacity = fadeIn ? Math.max(0, el.style.opacity) : Math.min(1, el.style.opacity);

  var last = +new Date();
  var tick = function () {
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