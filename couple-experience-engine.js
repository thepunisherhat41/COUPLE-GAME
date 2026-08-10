import { HOT_STAGE_ORDER, hotStageLabels, hotStageDescriptions } from './questions/couple-hot-stages.js';

function secureRandomIndex(limit) {
  if (!Number.isInteger(limit) || limit <= 0) return 0;
  if (globalThis.crypto?.getRandomValues) {
    const range = 0x100000000;
    const ceiling = range - (range % limit);
    const value = new Uint32Array(1);
    do crypto.getRandomValues(value); while (value[0] >= ceiling);
    return value[0] % limit;
  }
  return Math.floor(Math.random() * limit);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = secureRandomIndex(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cleanName(value, fallback) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  return normalized.slice(0, 28) || fallback;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showView(id) {
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('is-active', view.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function progressBar(ratio) {
  const track = createElement('div', 'progress-track');
  const fill = createElement('span');
  fill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  track.append(fill);
  return track;
}

function progressiveStage(index, count) {
  const ratio = index / Math.max(1, count);
  if (ratio < 1 / 3) return 'picante';
  if (ratio < 2 / 3) return 'fetiches';
  return 'semtabu';
}

export function installCoupleExperienceEngine(coupleQuestions) {
  const setupContent = document.querySelector('#setup-content');
  const gameContent = document.querySelector('#game-content');
  const scoreboard = document.querySelector('#scoreboard');
  const gameProgress = document.querySelector('#game-progress');
  const resultContent = document.querySelector('#result-content');
  const toast = document.querySelector('#toast');
  if (!setupContent || !gameContent || !scoreboard || !gameProgress || !resultContent) return;

  let active = false;
  let selectedIntensity = 'leve';
  let selectedHotMode = 'progressivo';
  let state = null;
  let toastTimer = null;

  const intensityMeta = {
    leve: { label: '🌷 Romântico', hint: 'carinho, memórias e conexão' },
    profundo: { label: '🌙 Profundo', hint: 'sentimentos, vulnerabilidade e futuro' },
    quente: { label: '🔥 Quente 18+', hint: 'do picante ao sexo sem rodeios' }
  };

  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
  }

  function goHome() {
    active = false;
    state = null;
    setupContent.replaceChildren();
    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    resultContent.replaceChildren();
    showView('home-view');
  }

  function modeLabel(config) {
    if (config.intensity === 'leve') return '🌷 Romântico';
    if (config.intensity === 'profundo') return '🌙 Profundo';
    if (config.hotMode === 'sexo') return '❤️‍🔥 Sexo 18+';
    if (config.hotMode === 'progressivo') return '⚡ Quente Progressivo 18+';
    return `${hotStageLabels[config.hotMode]} 18+`;
  }

  function sessionStage(config, index) {
    if (config.intensity !== 'quente') return null;
    if (config.hotMode === 'sexo') return 'sexo';
    return config.hotMode === 'progressivo' ? progressiveStage(index, config.count) : config.hotMode;
  }

  function allowedCounts() {
    if (selectedIntensity === 'quente' && selectedHotMode === 'sexo') return [10, 20, 30, 40, 50, 60];
    if (selectedIntensity === 'quente' && selectedHotMode !== 'progressivo') return [7, 10, 14, 20, 30];
    return [7, 10, 14, 20, 30, 40];
  }

  function syncSetup() {
    setupContent.querySelectorAll('[data-couple-intensity]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.coupleIntensity === selectedIntensity);
    });

    const submodes = setupContent.querySelector('#hot-submode-field-v4');
    if (submodes) submodes.hidden = selectedIntensity !== 'quente';

    setupContent.querySelectorAll('[data-hot-mode]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.hotMode === selectedHotMode);
    });

    const sexNote = setupContent.querySelector('#sex-session-note');
    if (sexNote) sexNote.hidden = !(selectedIntensity === 'quente' && selectedHotMode === 'sexo');

    const count = setupContent.querySelector('#couple-count-v4');
    if (count) {
      const previous = Number(count.value) || 10;
      const allowed = allowedCounts();
      count.replaceChildren(...allowed.map((value) => {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = `${value} cartas`;
        return option;
      }));
      count.value = String(allowed.includes(previous) ? previous : allowed[0]);
    }
  }

  function renderSetup() {
    active = true;
    state = null;
    setupContent.replaceChildren();
    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    resultContent.replaceChildren();

    const header = createElement('div', 'setup-header');
    header.append(
      createElement('span', 'room-icon', '💞'),
      createElement('p', 'kicker', 'SALA 01 · ENTRE NÓS'),
      createElement('h1', '', 'Escolham a intensidade da noite.'),
      createElement('p', '', 'Romântico, profundo ou Quente 18+. Dentro do Quente, vocês escolhem até onde querem ir.')
    );
    setupContent.append(header);

    const form = createElement('div', 'form-grid');
    form.innerHTML = `
      <div class="field"><label for="couple-name-one-v4">Pessoa 1</label><input class="input" id="couple-name-one-v4" maxlength="28" placeholder="Seu nome"></div>
      <div class="field"><label for="couple-name-two-v4">Pessoa 2</label><input class="input" id="couple-name-two-v4" maxlength="28" placeholder="Nome do par"></div>
      <div class="field-full">
        <span class="form-label">Seção</span>
        <div class="segmented couple-intensity-grid couple-intensity-grid-v3">
          ${Object.entries(intensityMeta).map(([value, meta]) => `<button class="segment-button" type="button" data-couple-intensity="${value}"><span>${meta.label}</span><small>${meta.hint}</small></button>`).join('')}
        </div>
      </div>
      <div class="field-full hot-submode-field" id="hot-submode-field-v4" hidden>
        <div class="adult-mode-head">
          <div><span class="form-label">Quente 18+</span><p>Escolha o ritmo. A sessão Sexo mistura perguntas diretas e desafios íntimos para o casal.</p></div>
          <span class="adult-pill">18+</span>
        </div>
        <div class="hot-mode-grid">
          <button class="hot-mode-card" type="button" data-hot-mode="progressivo"><strong>⚡ Progressivo</strong><span>🔥 Picante → 😈 Fetiches → 🖤 Sem Tabu</span><small>A intensidade sobe sozinha durante a sessão.</small></button>
          <button class="hot-mode-card" type="button" data-hot-mode="picante"><strong>🔥 Picante</strong><span>${hotStageDescriptions.picante}</span><small>Desejo, química e provocação.</small></button>
          <button class="hot-mode-card" type="button" data-hot-mode="fetiches"><strong>😈 Fetiches</strong><span>${hotStageDescriptions.fetiches}</span><small>Fantasias, curiosidade e experimentação.</small></button>
          <button class="hot-mode-card" type="button" data-hot-mode="semtabu"><strong>🖤 Sem Tabu</strong><span>${hotStageDescriptions.semtabu}</span><small>Conversas adultas diretas e sem constrangimento.</small></button>
          <button class="hot-mode-card sex-mode-card" type="button" data-hot-mode="sexo"><strong>❤️‍🔥 Sexo</strong><span>Perguntas diretas + desafios íntimos.</span><small>Para o casal que quer uma sessão adulta sem rodeios.</small></button>
        </div>
        <div class="adult-consent-note" id="sex-session-note" hidden>🔞 <strong>Sexo 18+</strong>: qualquer carta ou desafio pode ser trocado, recusado ou interrompido a qualquer momento. Consentimento vale durante toda a sessão.</div>
      </div>
      <div class="field-full"><label for="couple-count-v4">Cartas nesta sessão</label><select class="select" id="couple-count-v4"></select></div>
    `;
    setupContent.append(form);

    setupContent.querySelectorAll('[data-couple-intensity]').forEach((button) => button.addEventListener('click', () => {
      selectedIntensity = button.dataset.coupleIntensity;
      syncSetup();
    }));

    setupContent.querySelectorAll('[data-hot-mode]').forEach((button) => button.addEventListener('click', () => {
      selectedHotMode = button.dataset.hotMode;
      syncSetup();
    }));

    const actions = createElement('div', 'setup-actions');
    const start = createElement('button', 'primary-button', 'Começar a sessão →');
    start.type = 'button';
    start.addEventListener('click', () => startSession({
      names: [
        cleanName(setupContent.querySelector('#couple-name-one-v4').value, 'Pessoa 1'),
        cleanName(setupContent.querySelector('#couple-name-two-v4').value, 'Pessoa 2')
      ],
      intensity: selectedIntensity,
      hotMode: selectedIntensity === 'quente' ? selectedHotMode : null,
      count: Number(setupContent.querySelector('#couple-count-v4').value)
    }));
    actions.append(start);
    setupContent.append(actions);
    syncSetup();
    showView('setup-view');
  }

  function poolKey(config, index) {
    if (config.intensity !== 'quente') return config.intensity;
    return sessionStage(config, index);
  }

  function getPool(config, index) {
    if (config.intensity !== 'quente') return coupleQuestions.filter((question) => question.intensity === config.intensity);
    if (config.hotMode === 'sexo') return coupleQuestions.filter((question) => question.intensity === 'erotico');
    const stage = sessionStage(config, index);
    return coupleQuestions.filter((question) => question.intensity === 'quente' && question.hotStage === stage);
  }

  function refillBag(key) {
    const pool = getPool(state.config, state.index);
    const unused = pool.filter((question) => !state.usedIds.has(question.id));
    state.bags.set(key, shuffle(unused.length ? unused : pool));
  }

  function nextQuestion() {
    const key = poolKey(state.config, state.index);
    if (!state.bags.has(key) || !state.bags.get(key).length) refillBag(key);
    const question = state.bags.get(key).pop();
    state.usedIds.add(question.id);
    return question;
  }

  function startSession(config) {
    state = { config: structuredClone(config), index: 0, bags: new Map(), usedIds: new Set(), currentQuestion: null };
    state.currentQuestion = nextQuestion();
    showView('game-view');
    renderQuestion();
  }

  function renderTrail(stage) {
    const trail = createElement('div', 'hot-stage-trail');
    const activeIndex = HOT_STAGE_ORDER.indexOf(stage);
    HOT_STAGE_ORDER.forEach((item, index) => {
      const step = createElement('div', 'hot-stage-step');
      if (item === stage) step.classList.add('is-active');
      if (state.config.hotMode === 'progressivo' && index < activeIndex) step.classList.add('is-done');
      step.append(createElement('strong', '', hotStageLabels[item]), createElement('small', '', item === 'picante' ? 'aquecer' : item === 'fetiches' ? 'explorar' : 'sem filtro'));
      trail.append(step);
    });
    return trail;
  }

  function renderQuestion() {
    const { config, index, currentQuestion: question } = state;
    const stage = sessionStage(config, index);
    const sexSession = config.intensity === 'quente' && config.hotMode === 'sexo';
    const challenge = question.type === 'challenge';

    scoreboard.replaceChildren();
    gameContent.replaceChildren();

    if (sexSession) {
      gameProgress.textContent = `${challenge ? 'Desafio' : 'Carta'} ${index + 1} de ${config.count} · ❤️‍🔥 Sexo 18+`;
    } else if (config.intensity === 'quente') {
      gameProgress.textContent = `Carta ${index + 1} de ${config.count} · ${hotStageLabels[stage]}`;
    } else {
      gameProgress.textContent = `Carta ${index + 1} de ${config.count} · ${modeLabel(config)}`;
    }

    const card = createElement('article', `question-card couple-question progressive-couple-card${sexSession ? ' sex-question-card' : ''}${challenge ? ' sex-challenge-card' : ''}`);
    if (config.intensity === 'quente' && !sexSession) card.append(renderTrail(stage));

    const meta = createElement('div', 'question-meta');
    meta.append(
      createElement('span', 'category-chip', challenge ? '⚡ Desafio' : question.category),
      createElement('span', 'badge', modeLabel(config))
    );

    card.append(
      meta,
      createElement('p', 'couple-names', `${config.names[0]} + ${config.names[1]}`),
      createElement('h2', 'question-text', question.text)
    );

    const footer = createElement('div', 'question-footer');
    footer.append(createElement('div', 'feedback', sexSession
      ? challenge
        ? 'Façam somente se os dois quiserem. Recusar, adaptar ou trocar o desafio não encerra a sessão.'
        : 'Respondam sem transformar desejo em obrigação. Qualquer carta pode ser trocada.'
      : config.intensity === 'quente'
        ? 'Respondam apenas o que quiserem. “Não quero” e “trocar” continuam válidos.'
        : 'Conversem no tempo de vocês.'));

    const actions = createElement('div', 'question-actions');
    const skip = createElement('button', 'ghost-button', challenge ? 'Pular desafio' : 'Trocar carta');
    skip.type = 'button';
    skip.addEventListener('click', () => {
      state.currentQuestion = nextQuestion();
      renderQuestion();
      showToast(challenge ? 'Desafio pulado sem avançar a sessão.' : 'Carta trocada sem avançar a sessão.');
    });

    const nextLabel = index + 1 >= config.count
      ? 'Encerrar sessão →'
      : challenge
        ? 'Desafio concluído →'
        : 'Próxima carta →';
    const next = createElement('button', 'primary-button', nextLabel);
    next.type = 'button';
    next.addEventListener('click', () => {
      if (state.index + 1 >= state.config.count) {
        finishSession();
        return;
      }
      const previousStage = sessionStage(state.config, state.index);
      state.index += 1;
      const nextStage = sessionStage(state.config, state.index);
      state.currentQuestion = nextQuestion();
      renderQuestion();
      if (state.config.intensity === 'quente' && state.config.hotMode === 'progressivo' && previousStage !== nextStage) {
        showToast(`A intensidade subiu: ${hotStageLabels[nextStage]}`);
      }
    });

    actions.append(skip, next);
    footer.append(actions);
    card.append(footer, progressBar((index + 1) / config.count));
    gameContent.append(card);
  }

  function finishSession() {
    const sexSession = state.config.intensity === 'quente' && state.config.hotMode === 'sexo';
    showView('result-view');
    resultContent.replaceChildren();
    resultContent.append(
      createElement('div', 'result-icon', sexSession ? '❤️‍🔥' : state.config.intensity === 'quente' ? '🔥' : '💗'),
      createElement('p', 'kicker', 'SESSÃO CONCLUÍDA'),
      createElement('h1', '', sexSession ? 'Vocês chegaram até o fim.' : 'Boa conversa.'),
      createElement('p', '', `${state.config.names[0]} e ${state.config.names[1]} concluíram ${state.config.count} cartas em ${modeLabel(state.config)}.`)
    );

    const row = createElement('div', 'button-row');
    row.style.marginTop = '28px';
    const replay = createElement('button', 'primary-button', 'Outra sessão →');
    replay.type = 'button';
    replay.addEventListener('click', () => startSession(structuredClone(state.config)));
    const modes = createElement('button', 'secondary-button', 'Mudar modo');
    modes.type = 'button';
    modes.addEventListener('click', renderSetup);
    const home = createElement('button', 'ghost-button', 'Escolher outra sala');
    home.type = 'button';
    home.addEventListener('click', goHome);
    row.append(replay, modes, home);
    resultContent.append(row);
  }

  document.addEventListener('click', (event) => {
    const couple = event.target.closest?.('[data-room="couple"]');
    if (couple) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderSetup();
      return;
    }

    if (!active) return;

    const homeAction = event.target.closest?.('[data-action="home"]');
    if (homeAction) {
      event.preventDefault();
      event.stopImmediatePropagation();
      goHome();
      return;
    }

    const leave = event.target.closest?.('[data-action="leave-game"]');
    if (leave && document.querySelector('#game-view')?.classList.contains('is-active')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.confirm('Sair da sessão atual?')) goHome();
    }
  }, true);
}
