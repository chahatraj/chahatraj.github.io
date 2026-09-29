"use strict";

(() => {
  const dialog = document.querySelector("#breaking-dialog");
  const play = document.querySelector("#breaking-play");
  const game = dialog.querySelector(".breaking-game");
  const results = dialog.querySelector(".breaking-results");
  const optionBox = dialog.querySelector(".breaking-options");
  const conditions = ["base_prompt", "positive_contact", "negative_contact"];
  const labels = ["No contact context", "Positive contact", "Negative contact"];
  const actions = [
    "Collaborate", "Exclude", "Promote", "Demote", "Invite", "Exclude", "Involve", "Prevent participation", "Recommend", "Advise against",
    "Co-author the paper", "Avoid collaborating", "Partner", "Decline partnership", "Form the team", "Break up the team", "Organize the event", "Decline the event", "Start joint research", "Refrain from joint research",
    "Start the study group", "Avoid the study group", "Create the task force", "Avoid the task force", "Encourage joint training", "Discourage joint training", "Organize the cleanup", "Abstain from the cleanup", "Start the initiative", "Opt out",
    "Include", "Exclude", "Prioritize hiring", "Bypass hiring", "Select", "Deselect", "Support the center", "Resist the center", "Include the treatments", "Disregard the treatments",
    "Partner", "Avoid engaging", "Consider the partnership", "Avoid the partnership", "Consider the agreement", "Oppose the agreement", "Promote the program", "Resist the program", "Back the collaboration", "Bypass the collaboration",
    "Use the online modules", "Disregard the online modules", "Consider remote collaboration", "Oppose remote collaboration", "Promote the training material", "Demote the training material", "Encourage participation", "Discourage participation", "Promote the seminars", "Advise against the seminars",
  ];
  let rows = [];
  let round = [];
  let answers = [];
  let index = 0;
  let skipped = 0;
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  fetch("data/breaking-bias.json?v=1")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unavailable")))
    .then((data) => { rows = data.rows; play.disabled = false; })
    .catch(() => { const status = document.querySelector(".breaking-load-status"); status.textContent = "This game is unavailable right now."; status.hidden = false; });

  function secondPerson(text) {
    const converted = text.replace(/\bI['’]ve\b/g, "you've").replace(/\bI['’]m\b/g, "you're")
      .replace(/\bI was\b/g, "you were").replace(/\bI am\b/g, "you are")
      .replace(/\bmy\b/gi, "your").replace(/\bme\b/gi, "you").replace(/\bI\b/g, "you");
    return converted[0]?.toUpperCase() + converted.slice(1);
  }

  function makeRound() {
    const used = new Set();
    const scenarios = shuffle([...new Set(rows.map((row) => row.scenario))]);
    const trials = [];
    for (let condition = 0; condition < conditions.length; condition += 1) {
      for (let slot = 0; slot < 6; slot += 1) {
        const actionType = slot % 2 ? "negative" : "positive";
        const scenario = scenarios[(slot + condition) % scenarios.length];
        const pool = rows.filter((row) => row.action_type === actionType && row.scenario === scenario && !used.has(`${row.id}:${row.base_prompt}`));
        const row = shuffle(pool)[0];
        used.add(`${row.id}:${row.base_prompt}`);
        const full = row[conditions[condition]].trim();
        const boundary = full.toLowerCase().lastIndexOf("should i ");
        const context = boundary > 0 ? secondPerson(full.slice(0, boundary).trim()) : "";
        const question = boundary >= 0 ? full.slice(boundary).replace(/^should i /i, "Would you ") : full;
        const action = actions[Number(row.id) - 1];
        trials.push({condition, actionType, context, question: secondPerson(question).replace(/\?+$/, "?"),
          options: shuffle([{label: action, yes: true}, {label: `Don't ${action[0].toLowerCase()}${action.slice(1)}`, yes: false}])});
      }
    }
    return shuffle(trials);
  }

  function renderPrompt() {
    const trial = round[index];
    dialog.querySelector(".breaking-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".breaking-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    const context = dialog.querySelector(".breaking-context");
    context.textContent = trial.context;
    context.hidden = !trial.context;
    dialog.querySelector(".breaking-event").textContent = trial.question;
    optionBox.replaceChildren();
    for (const option of trial.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.label;
      button.addEventListener("click", () => {
        answers.push({condition: trial.condition, contact: option.yes === (trial.actionType === "positive")});
        advance();
      });
      optionBox.append(button);
    }
  }

  function renderResults() {
    game.hidden = true;
    results.hidden = false;
    dialog.querySelector(".breaking-result-summary").textContent = `${answers.length} answered · ${skipped} skipped`;
    const chart = dialog.querySelector(".breaking-result-chart");
    chart.replaceChildren();
    labels.forEach((label, condition) => {
      const responses = answers.filter((answer) => answer.condition === condition);
      const count = responses.filter((answer) => answer.contact).length;
      const percentage = responses.length ? Math.round(count / responses.length * 100) : 0;
      const row = document.createElement("section");
      row.className = "breaking-chart-row";
      const heading = document.createElement("h3");
      heading.textContent = label;
      const detail = document.createElement("span");
      detail.textContent = responses.length ? `${count} / ${responses.length} · ${percentage}%` : "No answers yet";
      const track = document.createElement("div");
      track.className = "breaking-chart-track";
      const bar = document.createElement("span");
      bar.style.width = `${percentage}%`;
      track.append(bar);
      row.append(heading, detail, track);
      chart.append(row);
    });
    const note = document.createElement("p");
    note.className = "breaking-chart-note";
    note.textContent = "Bars show the share of answered scenes where you chose contact, including declining an exclusion action.";
    chart.append(note);
  }

  function advance() { index += 1; if (index >= round.length) renderResults(); else renderPrompt(); }
  function start() {
    if (!rows.length) return;
    round = makeRound(); answers = []; index = 0; skipped = 0;
    results.hidden = true; game.hidden = false;
    if (!dialog.open) dialog.showModal();
    renderPrompt();
  }
  play.addEventListener("click", start);
  dialog.querySelector(".breaking-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".breaking-stop").addEventListener("click", renderResults);
  dialog.querySelector(".breaking-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".breaking-finish").addEventListener("click", () => dialog.close());
  dialog.querySelector(".breaking-again").addEventListener("click", start);
})();
