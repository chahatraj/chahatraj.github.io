"use strict";

(() => {
  const dialog = document.querySelector("#purdah-dialog");
  const play = document.querySelector("#purdah-play");
  const languageSelect = document.querySelector("#purdah-language");
  const game = dialog.querySelector(".purdah-game");
  const results = dialog.querySelector(".purdah-results");
  const form = dialog.querySelector(".purdah-form");
  const input = dialog.querySelector("#purdah-entry");
  let data;
  let round = [];
  let answers = [];
  let entries = [];
  let index = 0;
  let skipped = 0;
  let language = "English";
  let composing = false;
  const languageTags = {English: "en", Hindi: "hi", Urdu: "ur", Bengali: "bn", Punjabi: "pa", Marathi: "mr", Gujarati: "gu", Malayalam: "ml", Tamil: "ta", Telugu: "te", Kannada: "kn"};
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function makeRound() {
    const genders = shuffle(["man", "woman"]);
    const religions = shuffle(["Hindu", "Muslim"]);
    const statuses = shuffle(["married", "divorced", "widowed", "single"]);
    const children = shuffle(["no children", "one child", "many children"]);
    const identities = statuses.flatMap((status, slot) => [0, 1].map((side) =>
      data.identities.find((identity) => identity.status === status && identity.gender === genders[side]
        && identity.religion === religions[(slot + side) % 2] && identity.children === children[(slot + side) % 3])
    ));
    const tasks = shuffle(["day", "day", "day", "day", "hobbies", "hobbies", "hobbies", "hobbies"]);
    return shuffle(identities).map((identity, slot) => ({identity, task: tasks[slot], count: tasks[slot] === "day" ? 3 : 2}));
  }

  function renderLines() {
    const written = dialog.querySelector(".purdah-written");
    written.replaceChildren();
    entries.forEach((text, slot) => {
      const line = document.createElement("div");
      line.className = "purdah-written-line";
      const number = document.createElement("span");
      number.textContent = String(slot + 1).padStart(2, "0");
      const value = document.createElement("span");
      value.textContent = text;
      value.lang = languageTags[language];
      value.dir = "auto";
      line.append(number, value);
      written.append(line);
    });
    dialog.querySelector(".purdah-entry-number").textContent = String(entries.length + 1).padStart(2, "0");
    input.enterKeyHint = entries.length === round[index].count - 1 ? "done" : "next";
    input.setAttribute("aria-label", `Entry ${entries.length + 1} of ${round[index].count}`);
    input.focus();
  }

  function renderPrompt() {
    const trial = round[index];
    entries = [];
    input.value = "";
    input.lang = languageTags[language];
    input.dir = "auto";
    dialog.querySelector(".purdah-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".purdah-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    dialog.querySelector(".purdah-task-label").textContent = trial.task === "day" ? "Imagine their day" : "Imagine their interests";
    dialog.querySelector(".purdah-identity").textContent = trial.identity.label;
    dialog.querySelector(".purdah-question").textContent = trial.task === "day"
      ? `What are three things on their everyday to-do list? Write in ${language}.`
      : `What are two hobbies they might enjoy? Write in ${language}.`;
    renderLines();
  }

  function advance() {
    index += 1;
    if (index >= round.length) renderResults();
    else renderPrompt();
  }

  function save(partial = false) {
    answers.push({...round[index], entries: [...entries], language, partial});
  }

  function renderResults() {
    game.hidden = true;
    results.hidden = false;
    const completed = answers.filter((answer) => !answer.partial).length;
    const partial = answers.length - completed;
    dialog.querySelector(".purdah-result-summary").textContent = `${completed} completed${partial ? ` · ${partial} started` : ""} · ${skipped} skipped`;
    const list = dialog.querySelector(".purdah-result-list");
    list.replaceChildren();
    if (!answers.length) {
      const empty = document.createElement("p");
      empty.textContent = "No entries yet. Try a round to see them here.";
      list.append(empty);
    }
    answers.forEach((answer) => {
      const card = document.createElement("section");
      card.className = "purdah-result-card";
      const heading = document.createElement("h3");
      heading.textContent = answer.identity.label;
      const task = document.createElement("p");
      task.className = "purdah-result-task";
      task.textContent = `${answer.task === "day" ? "Their to-do list" : "Their hobbies"}${answer.partial ? " · unfinished" : ""}`;
      const items = document.createElement("ol");
      items.lang = languageTags[answer.language];
      items.dir = answer.language === "Urdu" ? "rtl" : "ltr";
      answer.entries.forEach((entry) => {
        const item = document.createElement("li");
        item.textContent = entry;
        items.append(item);
      });
      card.append(heading, task, items);
      list.append(card);
    });
  }

  function start() {
    if (!data) return;
    language = languageSelect.value;
    round = makeRound();
    index = 0;
    skipped = 0;
    answers = [];
    game.hidden = false;
    results.hidden = true;
    if (!dialog.open) dialog.showModal();
    renderPrompt();
  }

  input.addEventListener("compositionstart", () => { composing = true; });
  input.addEventListener("compositionend", () => { composing = false; });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (composing || game.hidden) return;
    const value = input.value.trim();
    if (!value) return;
    entries.push(value);
    input.value = "";
    if (entries.length === round[index].count) { save(); advance(); }
    else renderLines();
  });
  dialog.querySelector(".purdah-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".purdah-stop").addEventListener("click", () => {
    if (input.value.trim()) entries.push(input.value.trim());
    if (entries.length) save(entries.length < round[index].count);
    renderResults();
  });
  play.addEventListener("click", start);
  dialog.querySelector(".purdah-again").addEventListener("click", start);
  [".purdah-close", ".purdah-finish"].forEach((selector) => dialog.querySelector(selector).addEventListener("click", () => dialog.close()));
  const preview = document.querySelector(".purdah-preview-input");
  preview.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); preview.blur(); } });
  fetch("js/experiments-purdah.json?v=1")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unavailable")))
    .then((manifest) => {
      data = manifest;
      manifest.languages.forEach((language) => {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        languageSelect.append(option);
      });
      play.disabled = false;
    })
    .catch(() => {
      const status = document.querySelector(".purdah-load-status");
      status.textContent = "This game is unavailable right now.";
      status.hidden = false;
    });
})();
