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
  let dragging = null;

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

  function moveRow(row, direction) {
    const neighbor = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (!neighbor) return;
    if (direction < 0) list.insertBefore(row, neighbor);
    else list.insertBefore(neighbor, row);
    row.querySelector(".biasdora-rank-grip").focus();
  }

  function makeRow(word) {
    const row = document.createElement("li");
    row.className = "biasdora-rank-item";
    row.dataset.word = word;
    const grip = document.createElement("button");
    grip.className = "biasdora-rank-grip";
    grip.type = "button";
    grip.textContent = "⠿";
    grip.setAttribute("aria-label", `Move ${word}; use arrow keys or drag`);
    const label = document.createElement("span");
    label.textContent = word;
    row.append(grip, label);

    grip.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveRow(row, event.key === "ArrowUp" ? -1 : 1);
      }
    });
    grip.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      dragging = {row, startY: event.clientY, moved: false};
      list.setPointerCapture(event.pointerId);
    });
    return row;
  }

  list.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    if (Math.abs(event.clientY - dragging.startY) > 5) dragging.moved = true;
    if (!dragging.moved) return;
    const row = dragging.row;
    row.classList.add("is-dragging");
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".biasdora-rank-item");
    if (!target || target === row || target.parentElement !== list) return;
    const midpoint = target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
    list.insertBefore(row, event.clientY < midpoint ? target : target.nextSibling);
  });
  function finishDrag() {
    if (dragging) dragging.row.classList.remove("is-dragging");
    dragging = null;
  }
  list.addEventListener("pointerup", finishDrag);
  list.addEventListener("pointercancel", finishDrag);
  list.addEventListener("lostpointercapture", finishDrag);

  function renderPrompt() {
    const trial = round[index];
    dialog.querySelector(".biasdora-rank-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".biasdora-rank-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    image.hidden = mode !== "image";
    identity.hidden = mode !== "identity";
    if (mode === "image") image.src = trial.path;
    else identity.textContent = trial.identity;
    list.replaceChildren(...shuffle(trial.words).map(makeRow));
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
    answers.push({identity: mode === "identity" ? round[index].identity : null, path: mode === "image" ? round[index].path : null, words: [...list.children].map((row) => row.dataset.word)});
    advance();
  });
  dialog.querySelector(".biasdora-rank-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".biasdora-rank-stop").addEventListener("click", renderResults);
  dialog.querySelector(".biasdora-rank-again").addEventListener("click", () => start());
  dialog.querySelector(".biasdora-rank-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".biasdora-rank-finish").addEventListener("click", () => dialog.close());
})();
