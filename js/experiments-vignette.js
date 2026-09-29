"use strict";

(() => {
  const dialog = document.querySelector("#vignette-dialog");
  const play = document.querySelector("#vignette-play");
  const game = dialog.querySelector(".vignette-game");
  const results = dialog.querySelector(".vignette-results");
  const pairBox = dialog.querySelector(".vignette-game-pair");
  let data;
  let round = [];
  let answers = [];
  let index = 0;
  let skipped = 0;
  let generation = 0;
  let advancing = false;
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Both choices show an unaltered half of the same source pair. Swapping
  // their screen positions does not mirror or change either person's image.
  function imageChoice(pair, person, position) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "vignette-person";
    button.setAttribute("aria-label", `Choose person on the ${position ? "right" : "left"}`);
    const crop = document.createElement("span");
    crop.className = `vignette-crop vignette-half-${person}`;
    const image = document.createElement("img");
    image.src = pair.image;
    image.alt = `Person on the ${position ? "right" : "left"}, ${pair.activity}`;
    crop.append(image);
    const label = document.createElement("span");
    label.className = "vignette-person-label";
    label.textContent = position ? "Right" : "Left";
    button.append(crop, label);
    return {button, image};
  }

  function makeRound() {
    const pairs = shuffle(data.pairs).slice(0, 18);
    const traits = shuffle(data.traits.filter((trait) => trait.direction === "high")).slice(0, 3)
      .concat(shuffle(data.traits.filter((trait) => trait.direction === "low")).slice(0, 3));
    const perceptions = shuffle([
      (a) => `Who is facing difficulty in ${a}?`,
      (a) => `Who is better at ${a}?`,
      (a) => `Who enjoys ${a}?`,
      (a) => `Who hates ${a}?`,
      (a) => `Who is better at ${a}?`,
      (a) => `Who enjoys ${a}?`,
    ]);
    return shuffle(pairs.map((pair, slot) => {
      let question;
      let task;
      if (slot < 6) {
        task = "perception";
        question = perceptions[slot](pair.activity);
      } else if (slot < 12) {
        task = "trait";
        question = `Who seems ${traits[slot - 6].term}?`;
      } else {
        task = "decision";
        question = pair.decisions[(slot - 12) % pair.decisions.length];
      }
      return {pair, question, task, order: shuffle([0, 1])};
    }));
  }

  function renderPrompt() {
    advancing = false;
    const token = ++generation;
    const trial = round[index];
    dialog.querySelector(".vignette-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".vignette-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    dialog.querySelector(".vignette-question").textContent = trial.question;
    const status = dialog.querySelector(".vignette-image-status");
    status.textContent = "Loading images…";
    status.hidden = false;
    pairBox.replaceChildren();
    let loaded = 0;
    trial.order.forEach((person, position) => {
      const {button, image} = imageChoice(trial.pair, person, position);
      button.disabled = true;
      image.onload = () => {
        if (token !== generation) return;
        loaded += 1;
        if (loaded === 2) {
          status.hidden = true;
          pairBox.querySelectorAll("button").forEach((choice) => { choice.disabled = false; });
        }
      };
      image.onerror = () => {
        if (token !== generation) return;
        status.textContent = "Image unavailable. You can skip this round.";
      };
      button.addEventListener("click", () => {
        if (advancing || button.disabled) return;
        advancing = true;
        answers.push({...trial, selected: person});
        advance();
      });
      pairBox.append(button);
    });
    // Preload the next pair without sending any player responses.
    if (round[index + 1]) new Image().src = round[index + 1].pair.image;
  }

  function advance() {
    index += 1;
    if (index >= round.length) renderResults();
    else renderPrompt();
  }

  function renderResults() {
    generation += 1;
    game.hidden = true;
    results.hidden = false;
    dialog.querySelector(".vignette-result-summary").textContent = `${answers.length} answered · ${skipped} skipped`;
    const list = dialog.querySelector(".vignette-result-list");
    list.replaceChildren();
    if (!answers.length) {
      const empty = document.createElement("p");
      empty.textContent = "No choices yet. Play a round to see them here.";
      list.append(empty);
    }
    for (const answer of answers) {
      const row = document.createElement("section");
      row.className = "vignette-result-row";
      const heading = document.createElement("h3");
      heading.textContent = answer.question;
      const pair = document.createElement("div");
      pair.className = "vignette-pair";
      answer.order.forEach((person, position) => {
        const {button} = imageChoice(answer.pair, person, position);
        const image = button.querySelector("img");
        image.loading = "lazy";
        const display = document.createElement("div");
        display.className = button.className;
        display.classList.toggle("is-selected", person === answer.selected);
        display.append(...button.childNodes);
        display.querySelector(".vignette-person-label").textContent = person === answer.selected ? "Your choice" : "";
        pair.append(display);
      });
      row.append(heading, pair);
      list.append(row);
    }
    // Only repeated identities justify a frequency summary; denominator is
    // appearances in answered trials, not all questions in the session.
    const counts = new Map();
    for (const answer of answers) {
      answer.pair.identities.forEach((identity, person) => {
        const item = counts.get(identity) || {shown: 0, selected: 0};
        item.shown += 1;
        item.selected += Number(person === answer.selected);
        counts.set(identity, item);
      });
    }
    const repeated = [...counts].filter(([, item]) => item.shown > 1);
    if (repeated.length) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Repeated identities · dataset labels";
      details.append(summary);
      const note = document.createElement("p");
      note.textContent = "Labels come from image-generation prompts, not verified identities. Counts mix different questions and contexts.";
      details.append(note);
      repeated.forEach(([identity, item]) => {
        const line = document.createElement("p");
        line.textContent = `${identity}: chosen ${item.selected} of ${item.shown} appearances (${Math.round(item.selected / item.shown * 100)}%)`;
        details.append(line);
      });
      list.prepend(details);
    }
  }

  function start() {
    round = makeRound();
    answers = [];
    skipped = 0;
    index = 0;
    game.hidden = false;
    results.hidden = true;
    if (!dialog.open) dialog.showModal();
    renderPrompt();
  }
  play.addEventListener("click", start);
  dialog.querySelector(".vignette-again").addEventListener("click", start);
  dialog.querySelector(".vignette-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".vignette-stop").addEventListener("click", renderResults);
  [".vignette-close", ".vignette-finish"].forEach((selector) => dialog.querySelector(selector).addEventListener("click", () => dialog.close()));
  dialog.addEventListener("close", () => { generation += 1; });
  fetch("js/experiments-vignette.json?v=1")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unavailable")))
    .then((manifest) => {
      if (manifest.pairs.length < 18 || manifest.traits.length < 6) throw new Error("Incomplete data");
      data = manifest;
      play.disabled = false;
      const preview = document.querySelector(".vignette-preview-pair");
      [0, 1].forEach((person, position) => {
        const {button} = imageChoice(data.pairs[0], person, position);
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => preview.querySelectorAll("button").forEach((option) => {
          option.setAttribute("aria-pressed", String(option === button));
        }));
        preview.append(button);
      });
    })
    .catch(() => {
      const status = document.querySelector(".vignette-load-status");
      status.textContent = "This game is unavailable right now.";
      status.hidden = false;
    });
})();
