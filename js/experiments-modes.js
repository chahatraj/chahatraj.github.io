"use strict";

(() => {
  const groups = [
    { row: ".paired-row:has(#biasdora-dimension)", modes: ["biasdora-play", "biasdora-i2t-play"] },
    { row: ".paired-row:has(#biasdora-rank-identity-dimension)", modes: ["biasdora-rank-identity-play", "biasdora-rank-image-play"] },
  ];

  for (const group of groups) {
    const row = document.querySelector(group.row);
    if (!row) continue;
    const choices = [...row.querySelectorAll(".game-mode")];
    const panels = [...row.querySelectorAll(".experiment-controls")];
    const play = row.querySelector(".grouped-play");
    let selected = 0;

    const update = () => {
      choices.forEach((choice, index) => {
        const active = index === selected;
        choice.classList.toggle("is-active", active);
        choice.setAttribute("aria-pressed", String(active));
        panels[index].hidden = !active;
      });
      play.disabled = document.getElementById(group.modes[selected]).disabled;
    };

    choices.forEach((choice, index) => choice.addEventListener("click", () => {
      selected = index;
      update();
    }));
    play.addEventListener("click", () => document.getElementById(group.modes[selected]).click());
    const observer = new MutationObserver(update);
    group.modes.forEach((id) => observer.observe(document.getElementById(id), { attributes: true, attributeFilter: ["disabled"] }));
    update();
  }
})();
