"use strict";

(() => {
  const dialog = document.querySelector("#biasdora-visual-dialog");
  const play = document.querySelector("#biasdora-visual-play");
  const dimensionSelect = document.querySelector("#biasdora-visual-dimension");
  const note = document.querySelector(".biasdora-visual-note");
  const game = dialog.querySelector(".biasdora-visual-game");
  const results = dialog.querySelector(".biasdora-visual-results");
  const buttons = [...dialog.querySelectorAll(".biasdora-visual-options button")];
  let pairs = [];
  let round = [];
  let answers = [];
  let skipped = 0;
  let index = 0;

  fetch("data/biasdora-visual-pairs.json?v=20260925-visual1")
    .then((response) => {
      if (!response.ok) throw new Error("Visual associations are not available yet.");
      return response.json();
    })
    .then((data) => {
      pairs = data.filter((item) => item.path && item.modelWord && item.otherWord);
      if (!pairs.length) throw new Error("Visual associations are not available yet.");
      play.disabled = false;
    })
    .catch(() => {
      note.textContent = "Visual associations are not available yet.";
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

  function renderPrompt() {
    const trial = round[index];
    dialog.querySelector(".biasdora-visual-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".biasdora-visual-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    dialog.querySelector(".biasdora-visual-image").src = trial.path;
    buttons.forEach((button, option) => { button.textContent = trial.options[option]; });
  }

  function renderResults() {
    game.hidden = true;
    results.hidden = false;
    const matches = answers.filter((answer) => answer.matched).length;
    dialog.querySelector(".biasdora-visual-result-summary").textContent = answers.length
      ? `${matches} of ${answers.length} choices matched a word in the model’s description · ${skipped} skipped`
      : `No choices made · ${skipped} skipped`;
    const chart = dialog.querySelector(".biasdora-visual-result-chart");
    chart.replaceChildren();
    for (const answer of answers) {
      const row = document.createElement("div");
      row.className = "biasdora-word-row biasdora-i2t-word-row";
      const image = document.createElement("img");
      image.src = answer.path;
      image.alt = "Image shown for this choice";
      const word = document.createElement("strong");
      word.textContent = answer.word;
      const detail = document.createElement("span");
      detail.textContent = answer.matched ? "In model description" : `Model description: ${answer.modelWord}`;
      row.append(image, word, detail);
      chart.append(row);
    }
  }

  function advance() {
    index += 1;
    if (index >= round.length) renderResults();
    else renderPrompt();
  }

  function start() {
    const pool = dimensionSelect.value === "all" ? pairs : pairs.filter((item) => item.dimension === dimensionSelect.value);
    round = shuffle(pool).map((item) => ({...item, options: shuffle([item.modelWord, item.otherWord])}));
    answers = [];
    skipped = 0;
    index = 0;
    results.hidden = true;
    game.hidden = false;
    if (!dialog.open) dialog.showModal();
    renderPrompt();
  }

  buttons.forEach((button, option) => button.addEventListener("click", () => {
    const trial = round[index];
    const word = trial.options[option];
    answers.push({path: trial.path, word, modelWord: trial.modelWord, matched: word === trial.modelWord});
    advance();
  }));
  dialog.querySelector(".biasdora-visual-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".biasdora-visual-stop").addEventListener("click", renderResults);
  dialog.querySelector(".biasdora-visual-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".biasdora-visual-finish").addEventListener("click", () => dialog.close());
  dialog.querySelector(".biasdora-visual-again").addEventListener("click", start);
  play.addEventListener("click", start);
})();
