"use strict";

(() => {
  const dialog = document.querySelector("#biasdora-i2t-dialog");
  const dimensionSelect = document.querySelector("#biasdora-i2t-dimension");
  const playButton = document.querySelector("#biasdora-i2t-play");
  const note = document.querySelector(".biasdora-i2t-note");
  const game = dialog.querySelector(".biasdora-i2t-game");
  const results = dialog.querySelector(".biasdora-i2t-results");
  const form = dialog.querySelector(".biasdora-i2t-form");
  const input = dialog.querySelector("#biasdora-i2t-word");
  const error = dialog.querySelector(".biasdora-i2t-error");
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let images = [];
  let round = [];
  let answers = [];
  let skipped = 0;
  let index = 0;

  fetch("data/biasdora-i2t-images.json?v=20260925-visual1")
    .then((response) => {
      if (!response.ok) throw new Error("Image sample is not available yet.");
      return response.json();
    })
    .then((data) => {
      images = data.filter((item) => item.path && item.dimension);
      if (!images.length) throw new Error("Image sample is not available yet.");
      for (const option of dimensionSelect.options) {
        if (option.value !== "all") option.disabled = !images.some((item) => item.dimension === option.value);
      }
      playButton.disabled = false;
    })
    .catch(() => {
      note.textContent = "Image sample is not available yet.";
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
    const pool = dimension === "all" ? images : images.filter((item) => item.dimension === dimension);
    const groups = [...new Set(pool.map((item) => item.dimension))];
    const selected = groups.flatMap((group) => {
      const items = shuffle(pool.filter((item) => item.dimension === group));
      return items.slice(0, dimension === "all" ? 2 : 12);
    });
    return shuffle(selected).map((item) => ({...item, letter: letters[Math.floor(Math.random() * letters.length)]}));
  }

  function renderPrompt() {
    const trial = round[index];
    input.value = "";
    error.textContent = "";
    dialog.querySelector(".biasdora-i2t-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".biasdora-i2t-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    const image = dialog.querySelector(".biasdora-i2t-image");
    image.src = trial.path;
    image.alt = "Generated image for this word-completion prompt";
    dialog.querySelector(".biasdora-i2t-instruction").textContent = `Complete with one word beginning with “${trial.letter.toUpperCase()}”.`;
    input.focus();
  }

  function renderResults() {
    game.hidden = true;
    results.hidden = false;
    dialog.querySelector(".biasdora-i2t-result-summary").textContent = `${answers.length} completed · ${skipped} skipped · ${round.length} images in this round`;
    const chart = dialog.querySelector(".biasdora-i2t-result-chart");
    chart.replaceChildren();
    if (!answers.length) {
      const empty = document.createElement("p");
      empty.className = "empty-results";
      empty.textContent = "No words completed yet.";
      chart.append(empty);
      return;
    }
    for (const answer of answers) {
      const row = document.createElement("div");
      row.className = "biasdora-word-row biasdora-i2t-word-row";
      const thumbnail = document.createElement("img");
      thumbnail.src = answer.trial.path;
      thumbnail.alt = "Image shown for this response";
      const word = document.createElement("strong");
      word.textContent = answer.word;
      row.append(thumbnail, word);
      chart.append(row);
    }
  }

  function advance() {
    index += 1;
    if (index >= round.length) renderResults();
    else renderPrompt();
  }

  function start() {
    round = buildRound(dimensionSelect.value);
    if (!round.length) return;
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
    answers.push({word, trial: round[index]});
    advance();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === " ") event.preventDefault();
  });
  input.addEventListener("input", () => { error.textContent = ""; });
  dialog.querySelector(".biasdora-i2t-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".biasdora-i2t-stop").addEventListener("click", renderResults);
  playButton.addEventListener("click", start);
  dialog.querySelector(".biasdora-i2t-again").addEventListener("click", start);
  dialog.querySelector(".biasdora-i2t-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".biasdora-i2t-finish").addEventListener("click", () => dialog.close());
})();
