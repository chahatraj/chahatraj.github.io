"use strict";

(() => {
  const dialog = document.querySelector("#biasdora-rank-dialog");
  const game = dialog.querySelector(".biasdora-rank-game");
  const results = dialog.querySelector(".biasdora-rank-results");
  const list = dialog.querySelector(".biasdora-rank-list");
  const image = dialog.querySelector(".biasdora-rank-image");
  const identity = dialog.querySelector(".biasdora-rank-identity");
  const selectors = {
    identity: document.querySelector("#biasdora-rank-identity-dimension"),
    image: document.querySelector("#biasdora-rank-image-dimension"),
  };
  const playButtons = {
    identity: document.querySelector("#biasdora-rank-identity-play"),
    image: document.querySelector("#biasdora-rank-image-play"),
  };
  let data = {identity: [], image: []};
  let mode = "identity";
  let round = [];
  let answers = [];
  let skipped = 0;
  let index = 0;
  let words = [];
  let selectedWords = [];

  fetch("data/explainable-reranking-rounds.json?v=20260925-reranking1")
    .then((response) => {
      if (!response.ok) throw new Error("Word rankings are not available yet.");
      return response.json();
    })
    .then((loaded) => {
      for (const kind of ["identity", "image"]) {
        data[kind] = (loaded[kind] || []).filter((item) => item.dimension && item.words?.length === 5 && new Set(item.words).size === 5);
        playButtons[kind].disabled = !data[kind].length;
      }
    })
    .catch(() => {
      const note = document.querySelector(".biasdora-rank-note");
      note.textContent = "Word rankings are not available yet.";
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

  function makeRow(word) {
    const row = document.createElement("li");
    row.className = "biasdora-rank-item";
    row.dataset.word = word;
    const button = document.createElement("button");
    button.className = "biasdora-rank-choice";
    button.type = "button";
    button.textContent = word;
    button.addEventListener("click", () => {
      const position = selectedWords.indexOf(word);
      if (position < 0) selectedWords.push(word);
      else selectedWords.splice(position, 1);
      updateOrder();
      button.focus();
    });
    row.append(button);
    return row;
  }

  function updateOrder() {
    const rows = [...list.children];
    rows.sort((a, b) => {
      const aRank = selectedWords.indexOf(a.dataset.word);
      const bRank = selectedWords.indexOf(b.dataset.word);
      if (aRank >= 0 && bRank >= 0) return aRank - bRank;
      if (aRank >= 0) return -1;
      if (bRank >= 0) return 1;
      return words.indexOf(a.dataset.word) - words.indexOf(b.dataset.word);
    });
    list.replaceChildren(...rows);
    rows.forEach((row) => {
      const rank = selectedWords.indexOf(row.dataset.word);
      const button = row.querySelector("button");
      button.dataset.rank = rank < 0 ? "" : String(rank + 1).padStart(2, "0");
      button.setAttribute("aria-pressed", String(rank >= 0));
      button.setAttribute("aria-label", rank < 0
        ? `Choose ${row.dataset.word} as number ${selectedWords.length + 1}`
        : `Remove ${row.dataset.word} from number ${rank + 1}`);
      row.classList.toggle("is-selected", rank >= 0);
    });
    dialog.querySelector(".biasdora-rank-next").disabled = selectedWords.length !== words.length;
  }

  function renderPrompt() {
    const trial = round[index];
    dialog.querySelector(".biasdora-rank-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".biasdora-rank-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    image.hidden = mode !== "image";
    identity.hidden = mode !== "identity";
    if (mode === "image") image.src = trial.path;
    else identity.textContent = trial.identity;
    words = shuffle(trial.words);
    selectedWords = [];
    list.replaceChildren(...words.map(makeRow));
    updateOrder();
    dialog.querySelector(".biasdora-rank-next").textContent = index === round.length - 1 ? "See results" : "Save order";
  }

  function renderResults() {
    game.hidden = true;
    results.hidden = false;
    dialog.querySelector(".biasdora-rank-result-summary").textContent = `${answers.length} ranked · ${skipped} skipped`;
    const container = dialog.querySelector(".biasdora-rank-result-list");
    container.replaceChildren();
    if (!answers.length) {
      const empty = document.createElement("p");
      empty.className = "empty-results";
      empty.textContent = "No words ranked yet.";
      container.append(empty);
      return;
    }
    for (const answer of answers) {
      const card = document.createElement("section");
      card.className = "biasdora-rank-result-card";
      if (answer.path) {
        const thumbnail = document.createElement("img");
        thumbnail.src = answer.path;
        thumbnail.alt = "Image shown for this ranking";
        card.append(thumbnail);
      } else {
        const heading = document.createElement("h3");
        heading.textContent = answer.identity;
        card.append(heading);
      }
      const ordered = document.createElement("ol");
      for (const word of answer.words) {
        const item = document.createElement("li");
        item.textContent = word;
        ordered.append(item);
      }
      card.append(ordered);
      container.append(card);
    }
  }

  function advance() {
    index += 1;
    if (index >= round.length) renderResults();
    else renderPrompt();
  }

  function start(kind = mode) {
    mode = kind;
    const selected = selectors[mode].value;
    round = shuffle(data[mode].filter((item) => selected === "all" || item.dimension === selected));
    if (!round.length) return;
    answers = [];
    skipped = 0;
    index = 0;
    results.hidden = true;
    game.hidden = false;
    if (!dialog.open) dialog.showModal();
    renderPrompt();
  }

  playButtons.identity.addEventListener("click", () => start("identity"));
  playButtons.image.addEventListener("click", () => start("image"));
  dialog.querySelector(".biasdora-rank-next").addEventListener("click", () => {
    if (selectedWords.length !== words.length) return;
    answers.push({identity: mode === "identity" ? round[index].identity : null, path: mode === "image" ? round[index].path : null, words: [...selectedWords]});
    advance();
  });
  dialog.querySelector(".biasdora-rank-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".biasdora-rank-stop").addEventListener("click", renderResults);
  dialog.querySelector(".biasdora-rank-again").addEventListener("click", () => start());
  dialog.querySelector(".biasdora-rank-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".biasdora-rank-finish").addEventListener("click", () => dialog.close());
})();
