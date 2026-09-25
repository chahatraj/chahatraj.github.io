"use strict";

const LANGUAGE_NAMES = {ar:"Arabic",bn:"Bengali",ckb:"Sorani Kurdish",da:"Danish",de:"German",el:"Greek",en:"English",es:"Spanish",fa:"Persian",fr:"French",hi:"Hindi",it:"Italian",ja:"Japanese",ko:"Korean",ku:"Kurmanji Kurdish",mr:"Marathi",pa:"Punjabi",ru:"Russian",te:"Telugu",th:"Thai",tl:"Tagalog",tr:"Turkish",ur:"Urdu",vi:"Vietnamese",zh:"Chinese"};
const SPLIT_NAMES = {original_weat:"Original WEAT",new_human_biases:"New human biases",india_specific_biases:"India-specific biases"};
const state = {tests:[],test:null,items:[],index:0,choices:[],current:null,accepting:false,roundTests:[]};
const dialog = document.querySelector("#experiment-dialog");
const languageSelect = document.querySelector("#language-select");
const testSelect = document.querySelector("#test-select");
const playButton = document.querySelector("#play-button");
const siteNav = document.querySelector(".site-nav");
const menuToggle = document.querySelector(".menu-toggle");

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function option(value, label) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function populateLanguages() {
  const codes = [...new Set(state.tests.map((test) => test.language))];
  codes.sort((a,b) => LANGUAGE_NAMES[a].localeCompare(LANGUAGE_NAMES[b]));
  languageSelect.replaceChildren(...codes.map((code) => option(code, LANGUAGE_NAMES[code])));
  languageSelect.value = "en";
  populateTests();
}

function populateTests() {
  testSelect.replaceChildren();
  const tests = state.tests.filter((test) => test.language === languageSelect.value);
  if (tests.length) testSelect.append(option("all", `All association tests (${tests.length})`));
  Object.entries(SPLIT_NAMES).forEach(([split,label]) => {
    const group = document.createElement("optgroup");
    group.label = label;
    tests.filter((test) => test.split === split).forEach((test) => {
      group.append(option(String(state.tests.indexOf(test)), `${test.weat} · ${test.targets[0].label} / ${test.targets[1].label} · ${test.attributes[0].label} / ${test.attributes[1].label}`));
    });
    if (group.children.length) testSelect.append(group);
  });
  playButton.disabled = !testSelect.options.length;
}

function buildItems(test) {
  const testIndex = state.tests.indexOf(test);
  return shuffle(test.targets.flatMap((group,targetGroup) => [...new Set(group.terms)].map((word) => ({word,targetGroup,testIndex}))));
}

function nextAttributePair() {
  const aTerms = shuffle([...new Set(state.test.attributes[0].terms)]);
  const bTerms = shuffle([...new Set(state.test.attributes[1].terms)]);
  for (const a of aTerms) {
    const b = bTerms.find((term) => term !== a);
    if (b !== undefined) return shuffle([{word:a,group:0},{word:b,group:1}]);
  }
  throw new Error("This test has no distinct attribute words");
}

function showScreen(name) {
  dialog.querySelectorAll(".screen").forEach((screen) => { screen.hidden = !screen.classList.contains(name); });
}

function renderItem() {
  const item = state.items[state.index];
  state.test = state.tests[item.testIndex];
  state.current = nextAttributePair();
  document.querySelector(".progress-count").textContent = `${state.index + 1} / ${state.items.length}`;
  document.querySelector(".game-progress").style.setProperty("--progress", `${100 * state.index / state.items.length}%`);
  const target = document.querySelector(".target-word");
  target.textContent = item.word;
  target.lang = state.test.language;
  dialog.querySelectorAll(".attribute-options button").forEach((button,index) => {
    button.dataset.attribute = String(state.current[index].group);
    button.querySelector("span").textContent = state.current[index].word;
    button.lang = state.test.language;
  });
  state.accepting = true;
}

function startGame() {
  const selected = testSelect.value;
  state.roundTests = selected === "all"
    ? shuffle(state.tests.filter((test) => test.language === languageSelect.value))
    : [state.tests[Number(selected)]];
  state.items = state.roundTests.flatMap(buildItems);
  state.index = 0;
  state.choices = [];
  showScreen("game-screen");
  dialog.showModal();
  document.body.style.overflow = "hidden";
  renderItem();
}

function closeGame() {
  state.accepting = false;
  dialog.close();
  document.body.style.overflow = "";
}

function choose(group) {
  if (!state.accepting) return;
  state.accepting = false;
  state.choices.push({testIndex:state.items[state.index].testIndex,targetGroup:state.items[state.index].targetGroup,attributeGroup:group});
  state.index += 1;
  if (state.index === state.items.length) renderResults();
  else renderItem();
}

function renderResults() {
  const container = document.querySelector(".result-groups");
  container.replaceChildren();
  const answered = state.choices.length;
  document.querySelector(".result-summary").textContent = answered === 0
    ? "No choices yet. You can start again whenever you like."
    : `${answered} of ${state.items.length} choices answered${answered < state.items.length ? " · partial result" : ""}`;
  state.roundTests.forEach((test) => {
    const testIndex = state.tests.indexOf(test);
    const testChoices = state.choices.filter((choice) => choice.testIndex === testIndex);
    if (!testChoices.length) return;
    if (state.roundTests.length > 1) {
      const heading = document.createElement("h3");
      heading.className = "result-test-heading";
      heading.textContent = `${test.weat} · ${test.targets[0].label} / ${test.targets[1].label} · ${test.attributes[0].label} / ${test.attributes[1].label}`;
      container.append(heading);
    }
    test.targets.forEach((target,targetGroup) => {
      const choices = testChoices.filter((choice) => choice.targetGroup === targetGroup);
      if (!choices.length) {
        const empty = document.createElement("p");
        empty.className = "empty-results";
        empty.textContent = `${target.label}: no choices yet`;
        container.append(empty);
        return;
      }
      const aCount = choices.filter((choice) => choice.attributeGroup === 0).length;
      const aPercent = Math.round(100 * aCount / choices.length);
      const row = document.createElement("div");
      row.className = "result-group";
      row.innerHTML = '<div class="result-heading"><strong></strong><span></span></div><div class="result-bar"><span class="result-bar-a"></span><span class="result-bar-b"></span></div><div class="result-labels"><span></span><span></span></div>';
      row.querySelector("strong").textContent = target.label;
      row.querySelector(".result-heading span").textContent = `${choices.length} choices`;
      row.querySelector(".result-bar-a").style.width = `${aPercent}%`;
      row.querySelector(".result-bar-b").style.width = `${100-aPercent}%`;
      const labels = row.querySelectorAll(".result-labels span");
      labels[0].textContent = `${test.attributes[0].label} ${aPercent}%`;
      labels[1].textContent = `${test.attributes[1].label} ${100-aPercent}%`;
      container.append(row);
    });
  });
  showScreen("results-screen");
}

async function initialize() {
  try {
    const response = await fetch("data/weathub-tests.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.tests = (await response.json()).tests;
    populateLanguages();
  } catch (error) {
    const status = document.querySelector(".load-status");
    status.hidden = false;
    status.textContent = "The tests could not be loaded. Please refresh the page.";
  }
}

languageSelect.addEventListener("change", populateTests);
playButton.addEventListener("click", startGame);
dialog.querySelectorAll(".attribute-options button").forEach((button) => button.addEventListener("click", () => choose(Number(button.dataset.attribute))));
document.querySelector(".stop-button").addEventListener("click", () => {
  state.accepting = false;
  renderResults();
});
document.querySelector(".close-button").addEventListener("click", closeGame);
document.querySelector(".finish-button").addEventListener("click", closeGame);
document.querySelector(".play-again-button").addEventListener("click", () => {closeGame();startGame();});
dialog.addEventListener("cancel", (event) => {event.preventDefault();closeGame();});
menuToggle.addEventListener("click", () => {
  const open = siteNav.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("#primary-menu a").forEach((link) => link.addEventListener("click", () => {
  siteNav.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
initialize();
