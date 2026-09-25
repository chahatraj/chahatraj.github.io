"use strict";

(() => {
  const dialog = document.querySelector("#biasdora-dialog");
  const dimensionSelect = document.querySelector("#biasdora-dimension");
  const playButton = document.querySelector("#biasdora-play");
  const game = dialog.querySelector(".biasdora-game");
  const results = dialog.querySelector(".biasdora-results");
  const form = dialog.querySelector(".biasdora-form");
  const input = dialog.querySelector("#biasdora-word");
  const error = dialog.querySelector(".biasdora-error");
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const partsOfSpeech = {3: "adjective", 4: "noun", 5: "action verb ending in -ing"};
  let prompts = [];
  let round = [];
  let answers = [];
  let skipped = 0;
  let index = 0;

  fetch("data/biasdora-t2t-prompts.json?v=20260924-biasdora1")
    .then((response) => {
      if (!response.ok) throw new Error("Could not load BiasDora prompts.");
      return response.json();
    })
    .then((data) => {
      prompts = data;
      playButton.disabled = false;
    })
    .catch(() => {
      const note = document.querySelector(".biasdora-content-note");
      note.textContent = "Prompts could not be loaded. Refresh to try again.";
      note.hidden = false;
    });

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function buildRound(dimension) {
    if (dimension !== "all") {
      return shuffle([1, 2, 3, 4, 5].flatMap((setting) =>
        shuffle(prompts.filter((prompt) => prompt.dimension === dimension && prompt.setting === setting)).slice(0, 3)
      ));
    }
    const dimensions = [...new Set(prompts.map((prompt) => prompt.dimension))];
    const settings = shuffle(Array.from({length: dimensions.length * 2}, (_, index) => index % 5 + 1));
    return shuffle(dimensions.flatMap((name, dimensionIndex) => [0, 1].map((slot) => {
      const setting = settings[dimensionIndex * 2 + slot];
      const candidates = prompts.filter((prompt) => prompt.dimension === name && prompt.setting === setting);
      return candidates[Math.floor(Math.random() * candidates.length)];
    })));
  }

  function renderPrompt() {
    const trial = round[index];
    input.value = "";
    error.textContent = "";
    dialog.querySelector(".biasdora-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".biasdora-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    dialog.querySelector(".biasdora-template").textContent = trial.template;
    dialog.querySelector(".biasdora-stub").textContent = `[${trial.letter}__]`;
    const kind = partsOfSpeech[trial.setting] || "word";
    dialog.querySelector(".biasdora-instruction").textContent = `Complete with one ${kind} beginning with “${trial.letter.toUpperCase()}”.`;
    input.focus();
  }

  function advance() {
    index += 1;
    if (index >= round.length) renderResults();
    else renderPrompt();
  }

  function renderResults() {
    game.hidden = true;
    results.hidden = false;
    const summary = dialog.querySelector(".biasdora-result-summary");
    const chart = dialog.querySelector(".biasdora-result-chart");
    chart.replaceChildren();
    summary.textContent = `${answers.length} completed · ${skipped} skipped · ${round.length} prompts in this round`;
    if (!answers.length) {
      const empty = document.createElement("p");
      empty.className = "empty-results";
      empty.textContent = "No words completed yet.";
      chart.append(empty);
      return;
    }
    for (const answer of answers) {
      const row = document.createElement("div");
      row.className = "biasdora-word-row";
      const sentence = document.createElement("span");
      sentence.textContent = answer.trial.template;
      const word = document.createElement("strong");
      word.textContent = answer.word;
      row.append(sentence, word);
      chart.append(row);
    }
  }

  function start() {
    if (!prompts.length) return;
    const selected = dimensionSelect.value;
    round = buildRound(selected)
      .map((prompt) => ({...prompt, letter: letters[Math.floor(Math.random() * letters.length)]}));
    answers = [];
    skipped = 0;
    index = 0;
    results.hidden = true;
    game.hidden = false;
    if (!dialog.open) dialog.showModal();
    renderPrompt();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const word = input.value.trim();
    if (!/^[a-z][a-z'-]*$/i.test(word)) {
      error.textContent = "Enter one word without spaces or numbers.";
      input.focus();
      return;
    }
    if (word[0].toLowerCase() !== round[index].letter) {
      error.textContent = `Your word must begin with “${round[index].letter.toUpperCase()}”.`;
      input.focus();
      return;
    }
    error.textContent = "";
    answers.push({word, trial: round[index]});
    advance();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === " ") event.preventDefault();
  });
  input.addEventListener("input", () => { error.textContent = ""; });

  dialog.querySelector(".biasdora-skip").addEventListener("click", () => {
    skipped += 1;
    advance();
  });
  dialog.querySelector(".biasdora-stop").addEventListener("click", renderResults);
  playButton.addEventListener("click", start);
  dialog.querySelector(".biasdora-again").addEventListener("click", start);
  dialog.querySelector(".biasdora-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".biasdora-finish").addEventListener("click", () => dialog.close());
})();
