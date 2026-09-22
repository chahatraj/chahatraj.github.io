(function () {
  'use strict';

  var experiments = {
    'caliskan-weat6-en': {
      id: 'caliskan-weat6-en', language: 'en',
      targets: {
        targetA: { label: 'Male name', plural: 'Male names', words: ['John', 'Paul', 'Mike', 'Kevin', 'Steve', 'Greg', 'Jeff', 'Bill'] },
        targetB: { label: 'Female name', plural: 'Female names', words: ['Amy', 'Joan', 'Lisa', 'Sarah', 'Diana', 'Kate', 'Ann', 'Donna'] }
      },
      attributes: { attributeA: { label: 'Career' }, attributeB: { label: 'Family' } }
    },
    'global-voices-weat6-hi': {
      id: 'global-voices-weat6-hi', language: 'hi',
      targets: {
        targetA: { label: 'पुरुष नाम', plural: 'पुरुष नाम', words: ['अर्जुन', 'विकास', 'सुरेश', 'मोहन', 'अजय', 'संदीप', 'अमित', 'अभिषेक'] },
        targetB: { label: 'महिला नाम', plural: 'महिला नाम', words: ['सानिया', 'रिया', 'अदिति', 'तनिषा', 'श्रेया', 'मानसी', 'पूजा', 'नेहा'] }
      },
      attributes: { attributeA: { label: 'पेशा' }, attributeB: { label: 'परिवार' } }
    }
  };

  var state = { experiment: null, items: [], index: 0, trials: [], shownAt: 0, startedAt: null, sessionId: null, attributeOrder: [], acceptingInput: false };
  var dialog = document.getElementById('experiment-dialog');
  var screens = Array.prototype.slice.call(dialog.querySelectorAll('.experiment-screen'));
  var consent = document.getElementById('experiment-consent');
  var consentButton = dialog.querySelector('.experiment-consent-button');
  var familiarity = dialog.querySelector('.experiment-familiarity');
  var familiaritySelect = document.getElementById('experiment-language-familiarity');

  function uuid() { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2); }
  function cleanId(value) { return value.replace(/-/g, '_'); }
  function participantId() {
    var key = 'research-played-participant-v2';
    var value = localStorage.getItem(key);
    if (!value) { value = cleanId(uuid()); localStorage.setItem(key, value); }
    return value;
  }
  function shuffle(values) {
    var result = values.slice();
    for (var index = result.length - 1; index > 0; index -= 1) {
      var other = Math.floor(Math.random() * (index + 1));
      var hold = result[index]; result[index] = result[other]; result[other] = hold;
    }
    return result;
  }
  function showScreen(className) { screens.forEach(function (screen) { screen.hidden = !screen.classList.contains(className); }); }
  function openExperiment(id) {
    state.experiment = experiments[id]; state.index = 0; state.trials = []; state.startedAt = null; state.sessionId = cleanId(uuid()); state.acceptingInput = false;
    consent.checked = false; consentButton.disabled = true; familiarity.hidden = state.experiment.language !== 'hi';
    showScreen('experiment-consent-screen');
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
  function closeExperiment() { state.acceptingInput = false; dialog.close(); document.body.style.overflow = ''; }
  function buildItems() {
    var items = [];
    Object.keys(state.experiment.targets).forEach(function (targetGroup) {
      state.experiment.targets[targetGroup].words.forEach(function (word) { items.push({ word: word, targetGroup: targetGroup }); });
    });
    state.items = shuffle(items);
    state.attributeOrder = Math.random() < .5 ? ['attributeA', 'attributeB'] : ['attributeB', 'attributeA'];
  }
  function startGame() { buildItems(); state.startedAt = new Date().toISOString(); showScreen('experiment-game'); renderItem(); }
  function renderItem() {
    var item = state.items[state.index];
    var target = state.experiment.targets[item.targetGroup];
    var left = state.attributeOrder[0]; var right = state.attributeOrder[1];
    dialog.querySelector('.experiment-progress-count').textContent = (state.index + 1) + ' / ' + state.items.length;
    dialog.querySelector('.experiment-progress').style.setProperty('--progress', ((state.index / state.items.length) * 100) + '%');
    dialog.querySelector('.experiment-target-label').textContent = target.label;
    var word = dialog.querySelector('.experiment-target-word'); word.textContent = item.word; word.lang = state.experiment.language;
    var leftButton = dialog.querySelector('.experiment-options button:first-child');
    var rightButton = dialog.querySelector('.experiment-options button:last-child');
    leftButton.dataset.attribute = left; rightButton.dataset.attribute = right;
    leftButton.querySelector('span').textContent = state.experiment.attributes[left].label;
    rightButton.querySelector('span').textContent = state.experiment.attributes[right].label;
    state.shownAt = performance.now(); state.acceptingInput = true;
  }
  function chooseAttribute(attribute, inputMethod) {
    if (!state.acceptingInput) return;
    state.acceptingInput = false;
    var item = state.items[state.index];
    state.trials.push({ trial_index: state.index, stimulus: item.word, target_group: item.targetGroup, chosen_attribute: attribute, chosen_side: state.attributeOrder[0] === attribute ? 'left' : 'right', latency_ms: Math.round(performance.now() - state.shownAt), input_method: inputMethod });
    state.index += 1;
    if (state.index === state.items.length) finishGame(); else window.setTimeout(renderItem, 120);
  }
  function percent(part, total) { return total ? Math.round((part / total) * 100) : 0; }
  function calculateResults() {
    var byTarget = {};
    Object.keys(state.experiment.targets).forEach(function (group) {
      var trials = state.trials.filter(function (trial) { return trial.target_group === group; });
      var countA = trials.filter(function (trial) { return trial.chosen_attribute === 'attributeA'; }).length;
      byTarget[group] = { total: trials.length, attribute_a_percent: percent(countA, trials.length), attribute_b_percent: percent(trials.length - countA, trials.length) };
    });
    var allA = state.trials.filter(function (trial) { return trial.chosen_attribute === 'attributeA'; }).length;
    var mean = state.trials.reduce(function (sum, trial) { return sum + trial.latency_ms; }, 0) / state.trials.length;
    return { by_target: byTarget, target_a_attribute_a_percent: byTarget.targetA.attribute_a_percent, target_b_attribute_a_percent: byTarget.targetB.attribute_a_percent, overall_attribute_a_percent: percent(allA, state.trials.length), mean_latency_ms: Number(mean.toFixed(1)), total_trial_count: state.trials.length };
  }
  function renderResults(results) {
    var container = dialog.querySelector('.experiment-results');
    var labelA = state.experiment.attributes.attributeA.label; var labelB = state.experiment.attributes.attributeB.label;
    container.replaceChildren();
    Object.keys(state.experiment.targets).forEach(function (group) {
      var target = state.experiment.targets[group]; var result = results.by_target[group]; var row = document.createElement('div');
      row.className = 'experiment-result-group';
      row.innerHTML = '<div class="experiment-result-heading"><strong></strong><span>' + result.total + ' choices</span></div><div class="experiment-result-bar"><span class="experiment-result-bar-a"></span><span class="experiment-result-bar-b"></span></div><div class="experiment-result-labels"><span></span><span></span></div>';
      row.querySelector('strong').textContent = target.plural;
      row.querySelector('.experiment-result-bar-a').style.width = result.attribute_a_percent + '%';
      row.querySelector('.experiment-result-bar-b').style.width = result.attribute_b_percent + '%';
      var labels = row.querySelectorAll('.experiment-result-labels span'); labels[0].textContent = labelA + ' ' + result.attribute_a_percent + '%'; labels[1].textContent = labelB + ' ' + result.attribute_b_percent + '%';
      container.appendChild(row);
    });
    showScreen('experiment-results-screen');
  }
  function payload(results) {
    return { session_id: state.sessionId, participant_id: participantId(), experiment_id: state.experiment.id, consented: true, consent_version: 'prototype-v2', started_at: state.startedAt, completed_at: new Date().toISOString(), counterbalance: state.attributeOrder[0] + '-left', language_familiarity: state.experiment.language === 'hi' ? familiaritySelect.value : 'not-applicable', summary: results, trials: state.trials };
  }
  function saveResults(results) {
    var status = dialog.querySelector('.experiment-storage');
    if (location.hostname === 'chahatraj.github.io' || location.protocol === 'file:') {
      status.textContent = 'Result complete. Public data upload is not connected yet.';
      return;
    }
    status.textContent = 'Saving…';
    fetch('/api/responses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload(results)) })
      .then(function (response) { if (!response.ok) throw new Error(); status.textContent = 'Anonymous responses saved.'; })
      .catch(function () { status.textContent = 'Result complete. Public data upload is not connected yet.'; });
  }
  function finishGame() { var results = calculateResults(); renderResults(results); saveResults(results); }

  document.querySelectorAll('.experiment-play').forEach(function (button) { button.addEventListener('click', function () { openExperiment(button.dataset.experiment); }); });
  dialog.querySelector('.experiment-close').addEventListener('click', closeExperiment);
  dialog.querySelector('.experiment-finish').addEventListener('click', closeExperiment);
  consent.addEventListener('change', function () { consentButton.disabled = !consent.checked; });
  consentButton.addEventListener('click', function () { showScreen('experiment-instructions'); });
  dialog.querySelector('.experiment-begin').addEventListener('click', startGame);
  dialog.querySelector('.experiment-play-again').addEventListener('click', function () { openExperiment(state.experiment.id); });
  dialog.querySelectorAll('.experiment-options button').forEach(function (button) { button.addEventListener('click', function () { chooseAttribute(button.dataset.attribute, 'click'); }); });
  document.addEventListener('keydown', function (event) {
    if (!dialog.open || dialog.querySelector('.experiment-game').hidden) return;
    if (event.key.toLowerCase() === 'e') chooseAttribute(state.attributeOrder[0], 'keyboard');
    if (event.key.toLowerCase() === 'i') chooseAttribute(state.attributeOrder[1], 'keyboard');
  });
  dialog.addEventListener('cancel', function (event) { event.preventDefault(); closeExperiment(); });
}());
