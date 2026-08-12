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

function sexHeat(index, count) {
  const ratio = index / Math.max(1, count);
  if (ratio < 1 / 3) return 1;
  if (ratio < 2 / 3) return 2;
  return 3;
}

function sexChallengeText(text) {
  return String(text || '')
    .replace(/^Se ambos quiserem,\s*/i, '')
    .replace(/,\s*se ambos estiverem confortáveis/gi, '')
    .replace(/\s*Só vale se os dois estiverem confortáveis\.?/gi, '')
    .replace(/,\s*respeitando os limites combinados/gi, '')
    .replace(/,\s*sem obrigação de continuar depois/gi, '')
    .replace(/,\s*sempre de forma confortável/gi, '')
    .replace(/\s*O outro pode aceitar, adaptar ou recusar cada um\.?/gi, '')
    .replace(/\s*Só entram opções que ambos aceitariam fazer hoje\.?/gi, '')
    .replace(/,?\s*somente se ele\(a\) topar/gi, '')
    .replace(/,?\s*se ambos estiverem confortáveis/gi, '')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .trim();
}

function challengeSeconds(text) {
  const source = String(text || '').toLowerCase();
  if (/entre\s+\d+\s+e\s+\d+\s+segundos/.test(source)) return null;
  const seconds = source.match(/(\d+)\s*segundos?/);
  if (seconds) return Number(seconds[1]);
  const minuteWords = { um: 60, uma: 60, dois: 120, duas: 120, três: 180 };
  const minutes = source.match(/\b(um|uma|dois|duas|três)\s+minutos?/);
  if (minutes) return minuteWords[minutes[1]] || null;
  return null;
}

function challengeNeedsDice(text) {
  return /\bdado\b|sorteie|sortear|sorteiem/i.test(String(text || ''));
}

function formatTime(total) {
  const seconds = Math.max(0, Number(total) || 0);
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

const SEX_HEAT_LABELS = Object.freeze({
  1: '🔥 Aquecendo',
  2: '❤️‍🔥 Provocando',
  3: '😈 Intenso'
});

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
  let countdownTimer = null;

  const intensityMeta = {
    leve: { label: '🌷 Romântico', hint: 'carinho, memórias e conexão' },
    profundo: { label: '🌙 Profundo', hint: 'sentimentos, vulnerabilidade e futuro' },
    quente: { label: '🔥 Quente 18+', hint: 'escolha o nível depois de entrar' }
  };

  function clearCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = null;
  }

  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2300);
  }

  function goHome() {
    clearCountdown();
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
    if (config.hotMode === 'sexo') return `sexo-${sexHeat(index, config.count)}`;
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

    const submodes = setupContent.querySelector('#hot-submode-field-v6');
    if (submodes) submodes.hidden = selectedIntensity !== 'quente';

    setupContent.querySelectorAll('[data-hot-mode]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.hotMode === selectedHotMode);
    });

    const count = setupContent.querySelector('#couple-count-v6');
    if (count) {
      const previous = Number(count.value) || 10;
      const allowed = allowedCounts();
      count.replaceChildren(...allowed.map((value) => {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = `${value} ${selectedHotMode === 'sexo' ? 'desafios' : 'cartas'}`;
        return option;
      }));
      count.value = String(allowed.includes(previous) ? previous : allowed[0]);
    }
  }

  function renderSetup() {
    clearCountdown();
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
      createElement('p', '', 'Romântico, profundo ou Quente 18+. As opções mais ousadas aparecem somente depois que vocês escolhem o Quente.')
    );
    setupContent.append(header);

    const form = createElement('div', 'form-grid');
    form.innerHTML = `
      <div class="field"><label for="couple-name-one-v6">Pessoa 1</label><input class="input" id="couple-name-one-v6" maxlength="28" placeholder="Seu nome"></div>
      <div class="field"><label for="couple-name-two-v6">Pessoa 2</label><input class="input" id="couple-name-two-v6" maxlength="28" placeholder="Nome do par"></div>
      <div class="field-full">
        <span class="form-label">Seção</span>
        <div class="segmented couple-intensity-grid couple-intensity-grid-v3">
          ${Object.entries(intensityMeta).map(([value, meta]) => `<button class="segment-button" type="button" data-couple-intensity="${value}"><span>${meta.label}</span><small>${meta.hint}</small></button>`).join('')}
        </div>
      </div>
      <div class="field-full hot-submode-field" id="hot-submode-field-v6" hidden>
        <div class="adult-mode-head">
          <div><span class="form-label">Quente 18+</span><p>Escolham a vibe da rodada.</p></div>
          <span class="adult-pill">18+</span>
        </div>
        <div class="hot-mode-grid">
          <button class="hot-mode-card" type="button" data-hot-mode="progressivo"><strong>⚡ Progressivo</strong><span>🔥 Picante → 😈 Fetiches → 🖤 Sem Tabu</span><small>A intensidade sobe sozinha durante a sessão.</small></button>
          <button class="hot-mode-card" type="button" data-hot-mode="picante"><strong>🔥 Picante</strong><span>${hotStageDescriptions.picante}</span><small>Desejo, química e provocação.</small></button>
          <button class="hot-mode-card" type="button" data-hot-mode="fetiches"><strong>😈 Fetiches</strong><span>${hotStageDescriptions.fetiches}</span><small>Fantasias, curiosidade e experimentação.</small></button>
          <button class="hot-mode-card" type="button" data-hot-mode="semtabu"><strong>🖤 Sem Tabu</strong><span>${hotStageDescriptions.semtabu}</span><small>Conversas adultas diretas.</small></button>
          <button class="hot-mode-card sex-mode-card" type="button" data-hot-mode="sexo"><strong>❤️‍🔥 Desafios</strong><span>Cartas viradas, papéis alternados, cronômetro, dado e prendas.</span><small>Começa provocante e termina no nível intenso.</small></button>
        </div>
      </div>
      <div class="field-full"><label for="couple-count-v6">Quantidade nesta sessão</label><select class="select" id="couple-count-v6"></select></div>
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
    start.addEventListener('click', () => {
      const config = {
        names: [
          cleanName(setupContent.querySelector('#couple-name-one-v6').value, 'Pessoa 1'),
          cleanName(setupContent.querySelector('#couple-name-two-v6').value, 'Pessoa 2')
        ],
        intensity: selectedIntensity,
        hotMode: selectedIntensity === 'quente' ? selectedHotMode : null,
        count: Number(setupContent.querySelector('#couple-count-v6').value)
      };
      if (config.intensity === 'quente' && config.hotMode === 'sexo') renderSexGate(config);
      else startSession(config);
    });
    actions.append(start);
    setupContent.append(actions);
    syncSetup();
    showView('setup-view');
  }

  function renderSexGate(config) {
    setupContent.replaceChildren();
    const confirmed = [false, false];

    const gate = createElement('div', 'sex-consent-gate');
    gate.append(
      createElement('div', 'result-icon', '❤️‍🔥'),
      createElement('p', 'kicker', 'ANTES DE ENTRAR'),
      createElement('h1', '', 'Os dois estão dentro?'),
      createElement('p', 'sex-consent-copy', 'Modo adulto 18+. Os dois confirmam que querem participar desta sessão e sabem que podem encerrar o jogo a qualquer momento. Depois desta tela, as cartas não repetem avisos e o jogo segue direto para a diversão.')
    );

    const confirmations = createElement('div', 'sex-confirm-grid');
    const enter = createElement('button', 'primary-button sex-enter-button', '🔥 Entrar no jogo');
    enter.type = 'button';
    enter.disabled = true;

    config.names.forEach((name, index) => {
      const button = createElement('button', 'sex-confirm-button', `${name}: EU TOPO 🔥`);
      button.type = 'button';
      button.addEventListener('click', () => {
        confirmed[index] = !confirmed[index];
        button.classList.toggle('is-confirmed', confirmed[index]);
        button.textContent = confirmed[index] ? `${name}: ✓ DENTRO` : `${name}: EU TOPO 🔥`;
        enter.disabled = !(confirmed[0] && confirmed[1]);
      });
      confirmations.append(button);
    });

    const penalty = createElement('label', 'sex-penalty-toggle');
    penalty.innerHTML = `
      <input id="sex-gate-penalty" type="checkbox" checked>
      <span><strong>😈 Prenda ligada</strong><small>Quem aceitar e perder escolhe: tirar uma peça própria ou beijo de língua.</small></span>
    `;

    enter.addEventListener('click', () => {
      if (!(confirmed[0] && confirmed[1])) return;
      startSession({ ...config, penaltyEnabled: Boolean(penalty.querySelector('input')?.checked) });
    });

    const back = createElement('button', 'ghost-button', '← Voltar aos modos');
    back.type = 'button';
    back.addEventListener('click', renderSetup);

    gate.append(confirmations, penalty, enter, back);
    setupContent.append(gate);
    showView('setup-view');
  }

  function poolKey(config, index) {
    if (config.intensity !== 'quente') return config.intensity;
    return sessionStage(config, index);
  }

  function getPool(config, index) {
    if (config.intensity !== 'quente') return coupleQuestions.filter((question) => question.intensity === config.intensity);
    if (config.hotMode === 'sexo') {
      const heat = sexHeat(index, config.count);
      return coupleQuestions.filter((question) => question.intensity === 'erotico' && question.type === 'challenge' && Number(question.heat) === heat);
    }
    const stage = config.hotMode === 'progressivo' ? progressiveStage(index, config.count) : config.hotMode;
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
    if (!question) throw new Error(`Nenhuma carta disponível para ${key}`);
    state.usedIds.add(question.id);
    return question;
  }

  function resetRoundUi() {
    clearCountdown();
    state.revealed = false;
    state.accepted = false;
  }

  function startSession(config) {
    clearCountdown();
    state = {
      config: structuredClone(config),
      index: 0,
      bags: new Map(),
      usedIds: new Set(),
      currentQuestion: null,
      revealed: false,
      accepted: false,
      turnOffset: secureRandomIndex(2)
    };
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

  function renderSexTrail(heat) {
    const trail = createElement('div', 'hot-stage-trail sex-heat-trail');
    [1, 2, 3].forEach((level) => {
      const step = createElement('div', 'hot-stage-step');
      if (level === heat) step.classList.add('is-active');
      if (level < heat) step.classList.add('is-done');
      step.append(createElement('strong', '', SEX_HEAT_LABELS[level]), createElement('small', '', `nível ${level}`));
      trail.append(step);
    });
    return trail;
  }

  function rolesForRound() {
    const challengerIndex = (state.index + state.turnOffset) % 2;
    return {
      challenger: state.config.names[challengerIndex],
      receiver: state.config.names[(challengerIndex + 1) % 2]
    };
  }

  function startCountdown(seconds, display, button) {
    clearCountdown();
    let remaining = seconds;
    display.textContent = `⏱ ${formatTime(remaining)}`;
    button.disabled = true;
    button.textContent = 'Cronômetro rodando…';
    countdownTimer = window.setInterval(() => {
      remaining -= 1;
      display.textContent = `⏱ ${formatTime(remaining)}`;
      if (remaining <= 0) {
        clearCountdown();
        display.textContent = '🔥 TEMPO!';
        button.textContent = '✓ Tempo concluído';
        showToast('Tempo! Próxima decisão é de vocês 😈');
      }
    }, 1000);
  }

  function advanceQuestion() {
    clearCountdown();
    if (state.index + 1 >= state.config.count) {
      finishSession();
      return;
    }
    const sexSession = state.config.intensity === 'quente' && state.config.hotMode === 'sexo';
    const previousHeat = sexSession ? sexHeat(state.index, state.config.count) : null;
    const previousStage = !sexSession ? sessionStage(state.config, state.index) : null;
    state.index += 1;
    const nextHeat = sexSession ? sexHeat(state.index, state.config.count) : null;
    const nextStage = !sexSession ? sessionStage(state.config, state.index) : null;
    state.currentQuestion = nextQuestion();
    resetRoundUi();
    renderQuestion();
    if (sexSession && previousHeat !== nextHeat) showToast(`Subiu o nível: ${SEX_HEAT_LABELS[nextHeat]} 🔥`);
    else if (!sexSession && state.config.hotMode === 'progressivo' && previousStage !== nextStage) showToast(`A intensidade subiu: ${hotStageLabels[nextStage]}`);
  }

  function replaceCurrentChallenge() {
    clearCountdown();
    state.currentQuestion = nextQuestion();
    resetRoundUi();
    renderQuestion();
    showToast('Novo desafio na mesa 🔥');
  }

  function renderPenalty() {
    clearCountdown();
    const { challenger, receiver } = rolesForRound();
    gameContent.replaceChildren();
    const card = createElement('article', 'question-card sex-penalty-card');
    card.append(
      createElement('div', 'result-icon', '😈'),
      createElement('p', 'kicker', 'PERDEU A RODADA'),
      createElement('h2', 'question-text', `${receiver}, escolha sua prenda.`),
      createElement('p', 'couple-names', `${challenger} venceu este desafio.`)
    );
    const row = createElement('div', 'sex-penalty-actions');
    const clothing = createElement('button', 'primary-button', '👕 Tirar uma peça');
    clothing.type = 'button';
    clothing.addEventListener('click', () => {
      showToast('Prenda escolhida 😈');
      advanceQuestion();
    });
    const kiss = createElement('button', 'secondary-button', '💋 Beijo de língua');
    kiss.type = 'button';
    kiss.addEventListener('click', () => {
      showToast('Prenda escolhida 🔥');
      advanceQuestion();
    });
    row.append(clothing, kiss);
    card.append(row, progressBar((state.index + 1) / state.config.count));
    gameContent.append(card);
  }

  function renderSexQuestion() {
    const { config, index, currentQuestion: question } = state;
    const heat = sexHeat(index, config.count);
    const roles = rolesForRound();
    const cleanText = sexChallengeText(question.text);
    const seconds = challengeSeconds(cleanText);
    const needsDice = challengeNeedsDice(cleanText);

    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    gameProgress.textContent = `Desafio ${index + 1} de ${config.count} · ${SEX_HEAT_LABELS[heat]}`;

    const card = createElement('article', 'question-card couple-question progressive-couple-card sex-question-card sex-challenge-card');
    card.append(renderSexTrail(heat));

    const rolesCard = createElement('div', 'sex-role-card');
    rolesCard.innerHTML = `<span class="sex-role challenger">🔥 ${roles.challenger}</span><strong>DESAFIA</strong><span class="sex-role receiver">❤️‍🔥 ${roles.receiver}</span>`;
    card.append(rolesCard);

    if (!state.revealed) {
      const secret = createElement('div', 'sex-secret-card');
      secret.append(
        createElement('span', 'sex-secret-icon', '🔒'),
        createElement('h2', 'sex-secret-title', 'DESAFIO SECRETO'),
        createElement('p', 'sex-secret-copy', 'Vocês só descobrem quando virarem a carta.')
      );
      const reveal = createElement('button', 'primary-button sex-reveal-button', '🔥 REVELAR DESAFIO');
      reveal.type = 'button';
      reveal.addEventListener('click', () => {
        state.revealed = true;
        renderSexQuestion();
      });
      secret.append(reveal);
      card.append(secret, progressBar((index + 1) / config.count));
      gameContent.append(card);
      return;
    }

    const meta = createElement('div', 'question-meta');
    meta.append(
      createElement('span', 'category-chip', `⚡ ${question.category || 'Desafio'}`),
      createElement('span', 'badge', `❤️‍🔥 Nível ${heat}`)
    );
    card.append(meta, createElement('h2', 'question-text', cleanText));

    if (!state.accepted) {
      const decision = createElement('div', 'sex-decision-actions');
      const accept = createElement('button', 'primary-button sex-accept-button', '🔥 ACEITAR DESAFIO');
      accept.type = 'button';
      accept.addEventListener('click', () => {
        state.accepted = true;
        renderSexQuestion();
      });
      const swap = createElement('button', 'ghost-button', '↻ Trocar desafio');
      swap.type = 'button';
      swap.addEventListener('click', replaceCurrentChallenge);
      decision.append(accept, swap);
      card.append(decision, progressBar((index + 1) / config.count));
      gameContent.append(card);
      return;
    }

    const interactive = createElement('div', 'sex-interactive-tools');

    if (seconds) {
      const timerBox = createElement('div', 'sex-tool-card');
      const timerDisplay = createElement('strong', 'sex-timer-display', `⏱ ${formatTime(seconds)}`);
      const timerButton = createElement('button', 'secondary-button', '▶ Iniciar cronômetro');
      timerButton.type = 'button';
      timerButton.addEventListener('click', () => startCountdown(seconds, timerDisplay, timerButton));
      timerBox.append(createElement('span', 'sex-tool-label', 'CRONÔMETRO'), timerDisplay, timerButton);
      interactive.append(timerBox);
    }

    if (needsDice) {
      const diceBox = createElement('div', 'sex-tool-card sex-dice-card');
      const diceResult = createElement('strong', 'sex-dice-result', '🎲 ?');
      const diceButton = createElement('button', 'secondary-button', '🎲 Rolar dado');
      diceButton.type = 'button';
      diceButton.addEventListener('click', () => {
        const result = secureRandomIndex(6) + 1;
        diceResult.textContent = `🎲 ${result}`;
        diceResult.classList.remove('is-rolling');
        void diceResult.offsetWidth;
        diceResult.classList.add('is-rolling');
      });
      diceBox.append(createElement('span', 'sex-tool-label', 'DADO DO CASAL'), diceResult, diceButton);
      interactive.append(diceBox);
    }

    if (interactive.childElementCount) card.append(interactive);

    const actions = createElement('div', 'sex-round-actions');
    const completed = createElement('button', 'primary-button', index + 1 >= config.count ? '🔥 CUMPRIDO · ENCERRAR' : '🔥 CUMPRIDO');
    completed.type = 'button';
    completed.addEventListener('click', advanceQuestion);

    if (config.penaltyEnabled) {
      const lost = createElement('button', 'secondary-button', '😈 PERDEU A RODADA');
      lost.type = 'button';
      lost.addEventListener('click', renderPenalty);
      actions.append(completed, lost);
    } else {
      actions.append(completed);
    }

    const swap = createElement('button', 'ghost-button', '↻ Trocar desafio');
    swap.type = 'button';
    swap.addEventListener('click', replaceCurrentChallenge);
    actions.append(swap);

    card.append(actions, progressBar((index + 1) / config.count));
    gameContent.append(card);
  }

  function renderRegularQuestion() {
    const { config, index, currentQuestion: question } = state;
    const stage = config.intensity === 'quente' ? (config.hotMode === 'progressivo' ? progressiveStage(index, config.count) : config.hotMode) : null;
    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    gameProgress.textContent = config.intensity === 'quente'
      ? `Carta ${index + 1} de ${config.count} · ${hotStageLabels[stage]}`
      : `Carta ${index + 1} de ${config.count} · ${modeLabel(config)}`;

    const card = createElement('article', 'question-card couple-question progressive-couple-card');
    if (config.intensity === 'quente') card.append(renderTrail(stage));
    const meta = createElement('div', 'question-meta');
    meta.append(createElement('span', 'category-chip', question.category), createElement('span', 'badge', modeLabel(config)));
    card.append(meta, createElement('p', 'couple-names', `${config.names[0]} + ${config.names[1]}`), createElement('h2', 'question-text', question.text));

    const footer = createElement('div', 'question-footer');
    const actions = createElement('div', 'question-actions');
    const skip = createElement('button', 'ghost-button', 'Trocar carta');
    skip.type = 'button';
    skip.addEventListener('click', () => {
      state.currentQuestion = nextQuestion();
      renderQuestion();
      showToast('Carta trocada.');
    });
    const next = createElement('button', 'primary-button', index + 1 >= config.count ? 'Encerrar sessão →' : 'Próxima carta →');
    next.type = 'button';
    next.addEventListener('click', advanceQuestion);
    actions.append(skip, next);
    footer.append(actions);
    card.append(footer, progressBar((index + 1) / config.count));
    gameContent.append(card);
  }

  function renderQuestion() {
    const sexSession = state.config.intensity === 'quente' && state.config.hotMode === 'sexo';
    if (sexSession) renderSexQuestion();
    else renderRegularQuestion();
  }

  function finishSession() {
    clearCountdown();
    const sexSession = state.config.intensity === 'quente' && state.config.hotMode === 'sexo';
    showView('result-view');
    resultContent.replaceChildren();
    resultContent.append(
      createElement('div', 'result-icon', sexSession ? '❤️‍🔥' : state.config.intensity === 'quente' ? '🔥' : '💗'),
      createElement('p', 'kicker', 'SESSÃO CONCLUÍDA'),
      createElement('h1', '', sexSession ? 'Vocês chegaram ao nível máximo.' : 'Boa conversa.'),
      createElement('p', '', `${state.config.names[0]} e ${state.config.names[1]} concluíram ${state.config.count} ${sexSession ? 'desafios' : 'cartas'} em ${modeLabel(state.config)}.`)
    );

    const row = createElement('div', 'button-row');
    row.style.marginTop = '28px';
    const replay = createElement('button', 'primary-button', 'Outra sessão →');
    replay.type = 'button';
    replay.addEventListener('click', () => {
      if (sexSession) renderSexGate(structuredClone(state.config));
      else startSession(structuredClone(state.config));
    });
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
