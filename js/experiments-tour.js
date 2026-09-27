"use strict";

(() => {
  const choices = [...document.querySelectorAll(".paper-choice")];
  const panels = [...document.querySelectorAll(".paper-panel")];

  function showPaper(name) {
    for (const choice of choices) {
      const active = choice.dataset.paper === name;
      choice.classList.toggle("is-active", active);
      choice.setAttribute("aria-pressed", String(active));
    }
    for (const panel of panels) panel.hidden = panel.dataset.paper !== name;
  }

  choices.forEach((choice) => choice.addEventListener("click", () => showPaper(choice.dataset.paper)));
  const biasdora = document.querySelector('.paper-panel[data-paper="biasdora"]');
  const previewTypes = [...document.querySelectorAll("[data-preview-kind]")];
  function updatePreviews() {
    const biasMode = biasdora.querySelector(".game-mode.is-active")?.dataset.gameMode;
    const rankMode = document.querySelector('[data-paper="reranking"] .game-mode.is-active')?.dataset.gameMode;
    const visible = new Set([
      `completion-${biasMode || "text"}`,
      `rank-${rankMode || "text"}`,
    ]);
    previewTypes.forEach((preview) => { preview.hidden = !visible.has(preview.dataset.previewKind); });
  }
  document.addEventListener("click", (event) => {
    if (event.target.closest(".game-mode")) updatePreviews();
  });
  updatePreviews();

  const previewOrders = new WeakMap();
  document.querySelectorAll(".paper-preview .preview-option").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.parentElement;
      if (group.classList.contains("preview-ranking")) {
        const previous = previewOrders.get(group) || [];
        const order = previous.includes(button) ? previous.filter((item) => item !== button) : [...previous, button];
        previewOrders.set(group, order);
        group.querySelectorAll(".preview-option").forEach((option) => {
          const rank = order.indexOf(option);
          option.setAttribute("aria-pressed", String(rank >= 0));
          option.dataset.rank = rank < 0 ? "" : String(rank + 1).padStart(2, "0");
        });
        return;
      }
      group.querySelectorAll(".preview-option").forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
    });
  });
  document.querySelectorAll(".preview-completion").forEach((input) => {
    input.addEventListener("input", () => { input.value = input.value.replace(/\s+/g, ""); });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); input.blur(); }
    });
  });

  const associationPreview = document.querySelector(".association-preview");
  const language = document.querySelector("#language-select");
  const test = document.querySelector("#test-select");
  fetch(associationPreview.dataset.previewSource)
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Preview unavailable")))
    .then((data) => {
      const tests = data.tests || [];
      const updateAssociation = () => {
        const selected = test.value === "all"
          ? tests.find((item) => item.language === language.value)
          : tests[Number(test.value)];
        if (!selected || selected.language !== language.value) return;
        const term = (terms, index) => terms[Math.min(index, terms.length - 1)] || "";
        associationPreview.querySelector('[data-preview="weat-target"]').textContent = term(selected.targets[0].terms, 9);
        associationPreview.querySelector('[data-preview="weat-left"]').textContent = term(selected.attributes[0].terms, 3);
        associationPreview.querySelector('[data-preview="weat-right"]').textContent = term(selected.attributes[1].terms, 8);
        associationPreview.querySelectorAll(".preview-option").forEach((option) => option.setAttribute("aria-pressed", "false"));
      };
      language.addEventListener("change", updateAssociation);
      test.addEventListener("change", updateAssociation);
      updateAssociation();
    })
    .catch(() => {});
})();
