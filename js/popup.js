const kanjiToggleBtn = document.getElementById("kanjiToggleBtn");
const generateVocabBtn = document.getElementById("vocabBtn");
const optionsBtn = document.getElementById("optionsBtn");

optionsBtn.addEventListener("click", el => browser.runtime.openOptionsPage());