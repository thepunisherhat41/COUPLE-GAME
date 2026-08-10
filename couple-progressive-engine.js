import { HOT_STAGE_ORDER, hotStageLabels, hotStageDescriptions } from './questions/couple-hot-stages.js';

const STORAGE_KEY = 'couple-game:v1';

function secureRandomIndex(limit) {
  if (!Number.isInteger(limit) || limit <= 0) return 0;
  if (globalThis.crypto?.getRandomValues) {
    const range = 0x100000000;
    const ceiling = range - (range % limit);
    const value = new Uint32Array(1);
    do {
      crypto.getRandomValues(value);
    } while (value[0] >= ceiling);
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

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function showView(id) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('is-active', view.id === id);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function progressBar(ratio) {
  const track = createElement('div', 'progress-track');
  const fill = createElement('span');
  fill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  track.append(fill);
  return track;
}

function getProgressiveStage(index, count) {
  const ratio = index / Math.max(1, count);
  if (ratio < 1 / 3) return 'picante';
  if (ratio < 2 / 3) return 'fetiches';
  return 'semtabu';
}

function getSessionStage(config, index) {
  if (config.intensity !== 'quente') return null;
  return config.hotMode === 'progressivo'
    ? getProgressiveStage(index, config.count)
    : config.hotMode;
}

function modeLabel(config) {
  if (config.intensity === 'leve') return '🌷 Romântico';
  if (config.intensity === 'profundo') return '🌙 Profundo';
  if (config.hotMode === 'progressivo') return '⚡ Quente Progressivo 18+';
  return `${hotStageLabels[config.hotMode]} 18+`;
}

function updateLocalGameCount() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const next = {
      games: (Number(current.games) || 0) + 1,
      answers: Number(current.answers) || 0,
      correct: Number(current.correct) || 0
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const games = document.querySelector('#stat-games');
    if (games) games.textContent = String(next.games);
  } catch {
    // Estatística local é opcional; o jogo continua mesmo se o storage estiver bloqueado.
  }
}

export function installCoupleProgressiveEngine(coupleQuestions) {
  const setupContent = document.querySelector('#setup-content');
  const gameContent = document.querySelector('#game-content');
  const scoreboard = document.querySelector('#scoreboard');
  const gameProgress = document.querySelector('#game-progress');
  const resultContent = document.querySelector('#result-content');

  if (!setupContent || !gameContent || !scoreboard || !gameProgress || !resultContent) return;

  let engineActive = false;
  let selectedIntensity = 'leve';
  let selectedHotMode = 'progressivo';
  let state = null;

  const intensityMeta = {
    leve: { label: '🌷 Romântico', hint: 'carinho, memórias e conexão' },
    profundo: { label: '🌙 Profundo', hint: 'sentimentos, vulnerabilidade e futuro' },
    quente: { label: '🔥 Quente 18+', hint: 'sexo, fantasias, fetiches e limites' }
  };

  function goHome() {
    engineActive = false;
    state = null;
    setupContent.replaceChildren();
    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    resultContent.replaceChildren();
    showView('home-view');
  }

  function currentAllowedCounts() {
    if (selectedIntensity === 'quente' && selectedHotMode !== 'progressivo') {
      return [7, 10, 14, 20, 30];
    }
    return [7, 10, 14, 20, 30, 40];
  }

  function syncSetupControls() {
    setupContent.querySelectorAll('[data-couple-intensity]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.coupleIntensity === selectedIntensity);
    });

    const hotOptions = setupContent.querySelector('#hot-submode-field');
    if (hotOptions) hotOptions.hidden = selectedIntensity !== 'quente';

    setupContent.querySelectorAll('[data-hot-mode]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.hotMode === selectedHotMode);
    });

    const count = setupContent.querySelector('#couple-count-v2');
    if (count) {
      const previous = Number(count.value) || 10;
      const allowed = currentAllowedCounts();
      count.replaceChildren(...allowed.map((value) => {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = `${value} perguntas`;
        return option;
      }));
      count.value = String(allowed.includes(previous) ? previous : Math.max(...allowed));
    }
  }

  function renderSetup() {
    engineActive = true;
    state = null;
    setupContent.replaceChildren();
    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    resultContent.replaceChildren();

    const header = createElement('div', 'setup-header');
    header.append(
      createElement('span', 'room-icon', '💞'),
      createElement('p', 'kicker', 'SALA 01 · ENTRE NÓS'),
      createElement('h1', '', 'Escolham até onde querem ir.'),
      createElement('p', '', 'Do romance ao modo sem tabu. Qualquer pergunta pode ser trocada, sem explicação e sem perder a sessão.')
    );
    setupContent.append(header);

    const form = createElement('div', 'form-grid');
    form.innerHTML = `
      <div class="field">
        <label for="couple-name-one-v2">Pessoa 1</label>
        <input class="input" id="couple-name-one-v2" maxlength="28" placeholder="Seu nome">
      </div>
      <div class="field">
        <label for="couple-name-two-v2">Pessoa 2</label>
        <input class="input" id="couple-name-two-v2" maxlength="28" placeholder="Nome do par">
      </div>
      <div class="field-full">
        <span class="form-label">Intensidade</span>
        <div class="segmented couple-intensity-grid" id="couple-intensity-selector-v2">
          ${Object.entries(intensityMeta).map(([value, meta]) => `
            <button class="segment-button" type="button" data-couple-intensity="${value}">
              <span>${meta.label}</span><small>${meta.hint}</small>
            </button>`).join('')}
        </div>
      </div>
      <div class="field-full hot-submode-field" id="hot-submode-field" hidden>
        <div class="adult-mode-head">
          <div>
            <span class="form-label">Como jogar o Quente 18+</span>
            <p>Escolha um estágio fixo ou deixe o jogo aumentar a intensidade sozinho.</p>
          </div>
          <span class="adult-pill">18+</span>
        </div>
        <div class="hot-mode-grid">
          <button class="hot-mode-card" type="button" data-hot-mode="progressivo">
            <strong>⚡ Progressivo</strong>
            <span>🔥 Picante → 😈 Fetiches → 🖤 Sem Tabu</span>
            <small>O jogo sobe automaticamente a cada terço da sessão.</small>
          </button>
          <button class="hot-mode-card" type="button" data-hot-mode="picante">
            <strong>🔥 Picante</strong>
            <span>${hotStageDescriptions.picante}</span>
            <small>Provocante e sexual, sem começar pelo mais intenso.</small>
          </button>
          <button class="hot-mode-card" type="button" data-hot-mode="fetiches">
            <strong>😈 Fetiches</strong>
            <span>${hotStageDescriptions.fetiches}</span>
            <small>Mais experimentação, curiosidades e desejos fora da rotina.</small>
          </button>
          <button class="hot-mode-card" type="button" data-hot-mode="semtabu">
            <strong>🖤 Sem Tabu</strong>
            <span>${hotStageDescriptions.semtabu}</span>
            <small>As conversas adultas mais diretas do baralho.</small>
          </button>
        </div>
        <div class="adult-consent-note">🔞 Somente para adultos. Consentimento vale durante toda a sessão: qualquer pessoa pode trocar uma pergunta, mudar de assunto ou parar sem precisar justificar.</div>
      </div>
      <div class="field-full">
        <label for="couple-count-v2">Perguntas nesta sessão</label>
        <select class="select" id="couple-count-v2"></select>
      </div>
    `;
    setupContent.append(form);

    setupContent.querySelectorAll('[data-couple-intensity]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedIntensity = button.dataset.coupleIntensity;
        syncSetupControls();
      });
    });

    setupContent.querySelectorAll('[data-hot-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedHotMode = button.dataset.hotMode;
        syncSetupControls();
      });
    });

    const actions = createElement('div', 'setup-actions');
    const start = createElement('button', 'primary-button', 'Começar a sessão →');
    start.type = 'button';
    start.addEventListener('click', () => {
      const config = {
        names: [
          cleanName(setupContent.querySelector('#couple-name-one-v2').value, 'Pessoa 1'),
          cleanName(setupContent.querySelector('#couple-name-two-v2').value, 'Pessoa 2')
        ],
        intensity: selectedIntensity,
        hotMode: selectedIntensity === 'quente' ? selectedHotMode : null,
        count: Number(setupContent.querySelector('#couple-count-v2').value)
      };
      startSession(config);
    });
    actions.append(start);
    setupContent.append(actions);
    syncSetupControls();
  }

  function getPoolKey(config, index) {
    if (config.intensity !== 'quente') return config.intensity;
    return getSessionStage(config, index);
  }

  function getPool(config, index) {
    if (config.intensity !== 'quente') {
      return coupleQuestions.filter((question) => question.intensity === config.intensity);
    }
    const stage = getSessionStage(config, index);
    return coupleQuestions.filter((question) => question.intensity === 'quente' && question.hotStage === stage);
  }

  function refillBag(key) {
    const pool = getPool(state.config, state.index);
    const unused = pool.filter((question) => !state.usedIds.has(question.id));
    state.bags.set(key, shuffle(unused.length ? unused : pool));
  }

  function nextQuestion() {
    const key = getPoolKey(state.config, state.index);
    if (!state.bags.has(key) || !state.bags.get(key).length) refillBag(key);
    const bag = state.bags.get(key);
    const question = bag.pop();
    state.usedIds.add(question.id);
    return question;
  }

  function startSession(config) {
    state = {
      config: structuredClone(config),
      index: 0,
      bags: new Map(),
      usedIds: new Set(),
      currentQuestion: null,
      currentStage: getSessionStage(config, 0)
    };
    state.currentQuestion = nextQuestion();
    showView('game-view');
    renderQuestion();
  }

  function renderHotTrail(activeStage) {
    const trail = createElement('div', 'hot-stage-trail');
    const activeIndex = HOT_STAGE_ORDER.indexOf(activeStage);
    HOT_STAGE_ORDER.forEach((stage, index) => {
      const step = createElement('div', 'hot-stage-step');
      if (stage === activeStage) step.classList.add('is-active');
      if (state.config.hotMode === 'progressivo' && index < activeIndex) step.classList.add('is-done');
      step.append(
        createElement('strong', '', hotStageLabels[stage]),
        createElement('small', '', stage === 'picante' ? 'aquecer' : stage === 'fetiches' ? 'explorar' : 'sem filtro')
      );
      trail.append(step);
    });
    return trail;
  }

  function renderQuestion() {
    const { config, index, currentQuestion: question } = state;
    const stage = getSessionStage(config, index);
    state.currentStage = stage;
    scoreboard.replaceChildren();
    gameContent.replaceChildren();

    gameProgress.textContent = config.intensity === 'quente'
      ? `Pergunta ${index + 1} de ${config.count} · ${hotStageLabels[stage]}`
      : `Pergunta ${index + 1} de ${config.count}`;

    const card = createElement('article', 'question-card couple-question progressive-couple-card');
    if (config.intensity === 'quente') card.append(renderHotTrail(stage));

    const meta = createElement('div', 'question-meta');
    meta.append(
      createElement('span', 'category-chip', question.category),
      createElement('span', 'badge', config.intensity === 'quente' ? `${hotStageLabels[stage]} · 18+` : modeLabel(config))
    );
    card.append(meta);
    card.append(createElement('p', 'couple-names', `${config.names[0]} + ${config.names[1]}`));
    card.append(createElement('h2', 'question-text', question.text));

    const footer = createElement('div', 'question-footer');
    footer.append(createElement('div', 'feedback', config.intensity === 'quente'
      ? 'Respondam apenas o que quiserem. “Não sei”, “não quero” e “trocar” também são respostas válidas.'
      : 'Conversem no tempo de vocês.'));

    const actions = createElement('div', 'question-actions');
    const skip = createElement('button', 'ghost-button', 'Trocar pergunta');
    skip.type = 'button';
    skip.addEventListener('click', () => {
      state.currentQuestion = nextQuestion();
      renderQuestion();
      showToast('Pergunta trocada sem avançar a sessão.');
    });

    const next = createElement('button', 'primary-button', index + 1 >= config.count ? 'Encerrar sessão →' : 'Próxima →');
    next.type = 'button';
    next.addEventListener('click', () => {
      if (state.index + 1 >= state.config.count) {
        finishSession();
        return;
      }
      const previousStage = getSessionStage(state.config, state.index);
      state.index += 1;
      const newStage = getSessionStage(state.config, state.index);
      state.currentQuestion = nextQuestion();
      renderQuestion();
      if (state.config.hotMode === 'progressivo' && previousStage !== newStage) {
        showToast(`A intensidade subiu: ${hotStageLabels[newStage]}`);
      }
    });

    actions.append(skip, next);
    footer.append(actions);
    card.append(footer, progressBar((index + 1) / config.count));
    gameContent.append(card);
  }

  function finishSession() {
    updateLocalGameCount();
    showView('result-view');
    resultContent.replaceChildren();
    resultContent.append(
      createElement('div', 'result-icon', state.config.intensity === 'quente' ? '🔥' : '💗'),
      createElement('p', 'kicker', 'SESSÃO CONCLUÍDA'),
      createElement('h1', '', state.config.intensity === 'quente' ? 'Vocês chegaram até o fim.' : 'Boa conversa.'),
      createElement('p', '', `${state.config.names[0]} e ${state.config.names[1]} concluíram ${state.config.count} perguntas em ${modeLabel(state.config)}.`)
    );

    if (state.config.intensity === 'quente' && state.config.hotMode === 'progressivo') {
      const recap = createElement('div', 'progressive-recap');
      recap.append(
        createElement('span', '', '🔥 Picante'),
        createElement('span', '', '→'),
        createElement('span', '', '😈 Fetiches'),
        createElement('span', '', '→'),
        createElement('span', '', '🖤 Sem Tabu')
      );
      resultContent.append(recap);
    }

    const row = createElement('div', 'button-row');
    row.style.marginTop = '28px';
    const replay = createElement('button', 'primary-button', 'Outra sessão →');
    replay.type = 'button';
    replay.addEventListener('click', () => startSession(structuredClone(state.config)));
    const modes = createElement('button', 'secondary-button', 'Mudar intensidade');
    modes.type = 'button';
    modes.addEventListener('click', () => {
      renderSetup();
      showView('setup-view');
    });
    const home = createElement('button', 'ghost-button', 'Escolher outra sala');
    home.type = 'button';
    home.addEventListener('click', goHome);
    row.append(replay, modes, home);
    resultContent.append(row);
  }

  document.addEventListener('click', (event) => {
    const coupleButton = event.target.closest?.('[data-room="couple"]');
    if (coupleButton) {
      event.preventDefault();
      event.stopPropagation();
      renderSetup();
      showView('setup-view');
      return;
    }

    if (!engineActive) return;

    const homeAction = event.target.closest?.('[data-action="home"]');
    if (homeAction) {
      event.preventDefault();
      event.stopPropagation();
      goHome();
      return;
    }

    const leave = event.target.closest?.('[data-action="leave-game"]');
    if (leave && document.querySelector('#game-view')?.classList.contains('is-active')) {
      event.preventDefault();
      event.stopPropagation();
      if (window.confirm('Sair da sessão atual?')) goHome();
    }
  }, true);
}
