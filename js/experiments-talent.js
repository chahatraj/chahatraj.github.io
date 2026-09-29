"use strict";

(() => {
  const dialog = document.querySelector("#talent-dialog");
  const play = document.querySelector("#talent-play");
  const status = document.querySelector(".talent-load-status");
  const game = dialog.querySelector(".talent-game");
  const results = dialog.querySelector(".talent-results");
  const options = dialog.querySelector(".talent-options");
  let data;
  let round = [];
  let answers = [];
  let skipped = 0;
  let index = 0;

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function readableIdentity(dimension, label) {
    if (dimension === "nationality") {
      const adjective = label.replace(/^(a|an) /, "").replace("Russia", "Russian");
      return `${/^[aeiou]/i.test(adjective) ? "an" : "a"} ${adjective} person`;
    }
    if (dimension === "religion" && label === "a Jewish") return "a Jewish person";
    if (dimension === "race" && !label.endsWith("person")) return `${label} person`;
    return label;
  }

  fetch("js/experiments-talent.json?v=2")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unavailable")))
    .then((json) => { data = json; play.disabled = false; })
    .catch(() => { status.textContent = "This game is unavailable right now."; status.hidden = false; });

  function makeRound() {
    const dimensions = Object.keys(data.names);
    const domains = shuffle([...new Set(data.templates.map((item) => item.domain))]).slice(0, 8);
    const trials = [];
    for (const outcome of ["success", "failure"]) {
      domains.forEach((domain, slot) => {
        const gender = (slot + (outcome === "failure" ? 1 : 0)) % 2 ? "male" : "female";
        const templates = data.templates.filter((item) => item.outcome === outcome && item.domain === domain && item.gender === gender);
        const template = shuffle(templates)[0];
        const dimension = dimensions[(slot + (outcome === "failure" ? 1 : 0)) % dimensions.length];
        const groups = Object.entries(data.names[dimension]).filter(([, value]) => value[`${gender}_names`]?.length);
        const [identity, people] = shuffle(groups)[0];
        const name = shuffle(people[`${gender}_names`])[0];
        trials.push({
          outcome, domain, dimension, identity, name,
          prompt: template.prompt.replace("{X}", name).replace("{dimension}", readableIdentity(dimension, identity)),
          options: shuffle(template.options),
        });
      });
    }
    return shuffle(trials);
  }

  function renderPrompt() {
    const trial = round[index];
    dialog.querySelector(".talent-progress-count").textContent = `${index + 1} / ${round.length}`;
    dialog.querySelector(".talent-progress-bar").style.setProperty("--progress", `${index / round.length * 100}%`);
    dialog.querySelector(".talent-event").textContent = trial.prompt;
    options.replaceChildren();
    for (const option of trial.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option.text;
      button.addEventListener("click", () => {
        answers.push({outcome: trial.outcome, kind: option.kind,
          group: `${trial.dimension}:${trial.identity}`,
          groupLabel: readableIdentity(trial.dimension, trial.identity).replace(/^(a|an) /, "").replace(/ person$/, ""),
          identity: `${trial.name}, ${readableIdentity(trial.dimension, trial.identity)}`});
        advance();
      });
      options.append(button);
    }
  }

  const kinds = ["effort", "ability", "difficulty", "luck"];
  const kindLabel = (kind) => kind === "difficulty" ? "Task difficulty" : kind[0].toUpperCase() + kind.slice(1);

  function grouped(items) {
    const groups = new Map();
    for (const answer of items) {
      if (!groups.has(answer.group)) groups.set(answer.group, {label: answer.groupLabel, counts: Object.fromEntries(kinds.map((kind) => [kind, 0]))});
      groups.get(answer.group).counts[answer.kind] += 1;
    }
    return [...groups.values()];
  }

  function identityPlot(items, maximum) {
    const plot = document.createElement("div");
    plot.className = "talent-identity-plot";
    plot.style.setProperty("--plot-max", maximum);
    plot.setAttribute("role", "group");
    plot.setAttribute("aria-label", "Attribution counts by identity");
    const legend = document.createElement("div");
    legend.className = "talent-plot-legend";
    for (const [kind, text] of [["effort", "Internal · effort / ability"], ["difficulty", "External · task difficulty / luck"]]) {
      const label = document.createElement("span");
      label.dataset.kind = kind;
      label.textContent = text;
      legend.append(label);
    }
    plot.append(legend);
    for (const group of grouped(items)) {
      const row = document.createElement("div");
      row.className = "talent-plot-row";
      const label = document.createElement("span");
      label.className = "talent-plot-label";
      label.textContent = group.label;
      const track = document.createElement("div");
      track.className = "talent-plot-track";
      const description = kinds.map((kind) => `${kindLabel(kind)}: ${group.counts[kind]}`).join(", ");
      track.setAttribute("aria-label", `${group.label}. ${description}`);
      for (const kind of kinds) {
        const count = group.counts[kind];
        if (!count) continue;
        const segment = document.createElement("span");
        segment.className = "talent-plot-segment";
        segment.dataset.kind = kind;
        segment.style.width = `${count / maximum * 100}%`;
        segment.textContent = `${kind === "difficulty" ? "Difficulty" : kindLabel(kind)} ${count}`;
        segment.title = `${kindLabel(kind)}: ${count}`;
        segment.setAttribute("aria-hidden", "true");
        track.append(segment);
      }
      row.append(label, track);
      plot.append(row);
    }
    const axis = document.createElement("div");
    axis.className = "talent-plot-axis";
    const zero = document.createElement("span");
    zero.textContent = "0";
    const max = document.createElement("span");
    max.textContent = `${maximum} ${maximum === 1 ? "choice" : "choices"}`;
    axis.append(zero, max);
    plot.append(axis);
    return plot;
  }

  function renderResults() {
    game.hidden = true;
    results.hidden = false;
    dialog.querySelector(".talent-result-summary").textContent = `${answers.length} answered · ${skipped} skipped`;
    const chart = dialog.querySelector(".talent-result-chart");
    chart.replaceChildren();
    const maximum = Math.max(1, ...["success", "failure"].flatMap((outcome) => grouped(answers.filter((answer) => answer.outcome === outcome)).map((group) => Object.values(group.counts).reduce((sum, count) => sum + count, 0))));
    for (const outcome of ["success", "failure"]) {
      const subset = answers.filter((answer) => answer.outcome === outcome);
      const internal = subset.filter((answer) => answer.kind === "effort" || answer.kind === "ability").length;
      const section = document.createElement("section");
      section.className = "talent-result-group";
      const heading = document.createElement("h3");
      heading.textContent = outcome === "success" ? "When someone succeeded" : "When someone failed";
      const summary = document.createElement("p");
      summary.textContent = subset.length ? `${internal} of ${subset.length} explanations chose effort or ability; ${subset.length - internal} chose task difficulty or luck.` : "No answers yet.";
      section.append(heading, summary);
      const counts = document.createElement("p");
      counts.className = "talent-kind-counts";
      counts.textContent = ["effort", "ability", "difficulty", "luck"].map((kind) => `${kind} ${subset.filter((answer) => answer.kind === kind).length}`).join(" · ");
      section.append(counts);
      if (subset.length) {
        section.append(identityPlot(subset, maximum));
        const details = document.createElement("details");
        details.className = "talent-individual-choices";
        const toggle = document.createElement("summary");
        toggle.textContent = "Individual choices";
        details.append(toggle);
        const list = document.createElement("dl");
        list.className = "talent-identity-attributions";
        for (const answer of subset) {
          const identity = document.createElement("dt");
          identity.textContent = answer.identity;
          const attribution = document.createElement("dd");
          attribution.textContent = answer.kind === "difficulty" ? "Task difficulty" : answer.kind[0].toUpperCase() + answer.kind.slice(1);
          list.append(identity, attribution);
        }
        details.append(list);
        section.append(details);
      }
      chart.append(section);
    }
  }

  function advance() {
    index += 1;
    if (index >= round.length) renderResults();
    else renderPrompt();
  }

  function start() {
    if (!data) return;
    round = makeRound();
    answers = [];
    skipped = 0;
    index = 0;
    results.hidden = true;
    game.hidden = false;
    if (!dialog.open) dialog.showModal();
    renderPrompt();
  }

  play.addEventListener("click", start);
  dialog.querySelector(".talent-skip").addEventListener("click", () => { skipped += 1; advance(); });
  dialog.querySelector(".talent-stop").addEventListener("click", renderResults);
  dialog.querySelector(".talent-close").addEventListener("click", () => dialog.close());
  dialog.querySelector(".talent-finish").addEventListener("click", () => dialog.close());
  dialog.querySelector(".talent-again").addEventListener("click", start);
})();
