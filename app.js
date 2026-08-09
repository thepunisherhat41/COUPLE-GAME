import {
  coupleQuestions,
  triviaQuestions,
  dares,
  difficultyLabels,
  intensityLabels
} from './data.js';

const STORAGE_KEY = 'couple-game:v1';
const views = [...document.querySelectorAll('.view')];
const setupContent = document.querySelector('#setup-content');
const gameContent = document.querySelector('#game-content');
const scoreboard = document.querySelector('#scoreboard');
const gameProgress = document.querySelector('#game-progress');
const resultContent = document.querySelector('#result-content');
const toast = document.querySelector('#toast');

let state = null;
let selectedIntensity = 'leve';
let partyDraftNames = ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4'];
let toastTimer = null;

const stats = loadStats();

function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      games: Number(saved?.games) || 0,
      answers: Number(saved?.answers) || 0,
      correct: Number(saved?.correct) || 0
    };
  } catch {
    return { games: 0, answers: 0, correct: 0 };
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  renderHomeStats();
}

function renderHomeStats() {
  document.querySelector('#stat-games').textContent = String(stats.games);
  document.querySelector('#stat-correct').textContent = String(stats.correct);
  document.querySelector('#stat-accuracy').textContent = stats.answers
    ? `${Math.round((stats.correct / stats.answers) * 100)}%`
    : '—';
}

function showView(id) {
  views.forEach((view) => view.classList.toggle('is-active', view.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function cleanName(value, fallback) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  return normalized.slice(0, 28) || fallback;
}

function renderSetupHeader(icon, kicker, title, description) {
  const header = createElement('div', 'setup-header');
  header.append(
    createElement('span', 'room-icon', icon),
    createElement('p', 'kicker', kicker),
    createElement('h1', '', title),
    createElement('p', '', description)
  );
  return header;
}

function openRoom(room) {
  state = null;
  scoreboard.replaceChildren();
  gameContent.replaceChildren();
  resultContent.replaceChildren();

  if (room === 'couple') renderCoupleSetup();
  if (room === 'duel') renderDuelSetup();
  if (room === 'party') renderPartySetup();
  showView('setup-view');
}

function renderCoupleSetup() {
  setupContent.replaceChildren();
  setupContent.append(renderSetupHeader(
    '💞',
    'SALA 01 · ENTRE NÓS',
    'Uma conversa que vale a noite.',
    'Escolham a intensidade e respondam sem pressa. Aqui não existe resposta certa — existe espaço para descobrir algo novo.'
  ));

  const form = createElement('div', 'form-grid');
  form.innerHTML = `
    <div class="field">
      <label for="couple-name-one">Pessoa 1</label>
      <input class="input" id="couple-name-one" maxlength="28" placeholder="Seu nome">
    </div>
    <div class="field">
      <label for="couple-name-two">Pessoa 2</label>
      <input class="input" id="couple-name-two" maxlength="28" placeholder="Nome do par">
    </div>
    <div class="field-full">
      <span class="form-label">Intensidade</span>
      <div class="segmented" id="intensity-selector">
        <button class="segment-button" type="button" data-intensity="leve"><span>🌷 Leve</span><small>carinho e memórias</small></button>
        <button class="segment-button" type="button" data-intensity="profundo"><span>🌙 Profundo</span><small>sentimentos e futuro</small></button>
        <button class="segment-button" type="button" data-intensity="quente"><span>🔥 Quente</span><small>intimidade e química</small></button>
      </div>
    </div>
    <div class="field-full">
      <label for="couple-count">Perguntas nesta sessão</label>
      <select class="select" id="couple-count">
        <option value="7">7 perguntas</option>
        <option value="10" selected>10 perguntas</option>
        <option value="14">Todas as 14</option>
      </select>
    </div>
  `;

  setupContent.append(form);
  const actions = createElement('div', 'setup-actions');
  const start = createElement('button', 'primary-button', 'Começar a conversa →');
  start.type = 'button';
  start.addEventListener('click', () => {
    const config = {
      names: [
        cleanName(document.querySelector('#couple-name-one').value, 'Pessoa 1'),
        cleanName(document.querySelector('#couple-name-two').value, 'Pessoa 2')
      ],
      intensity: selectedIntensity,
      count: Number(document.querySelector('#couple-count').value)
    };
    startCoupleGame(config);
  });
  actions.append(start);
  setupContent.append(actions);

  const intensityButtons = [...setupContent.querySelectorAll('[data-intensity]')];
  intensityButtons.forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.intensity === selectedIntensity);
    button.addEventListener('click', () => {
      selectedIntensity = button.dataset.intensity;
      intensityButtons.forEach((item) => item.classList.toggle('is-selected', item === button));
    });
  });
}

function renderDuelSetup() {
  setupContent.replaceChildren();
  setupContent.append(renderSetupHeader(
    '🥂',
    'SALA 02 · DUELO DE CASAIS',
    'Dois casais entram. Um mico sai.',
    'Cada casal responde uma pergunta por rodada. O placar é automático e o casal com menos pontos recebe um mico aleatório.'
  ));

  const form = createElement('div', 'form-grid');
  form.innerHTML = `
    <div class="field">
      <label for="team-one">Casal 1</label>
      <input class="input" id="team-one" maxlength="28" placeholder="Ex.: Ana & Leo">
    </div>
    <div class="field">
      <label for="team-two">Casal 2</label>
      <input class="input" id="team-two" maxlength="28" placeholder="Ex.: Bia & Rafa">
    </div>
    <div class="field">
      <label for="duel-rounds">Rodadas por casal</label>
      <select class="select" id="duel-rounds">
        <option value="5">5 rodadas</option>
        <option value="10" selected>10 rodadas</option>
        <option value="15">15 rodadas</option>
      </select>
    </div>
    <div class="field">
      <label for="duel-difficulty">Dificuldade</label>
      <select class="select" id="duel-difficulty">
        <option value="mixed" selected>Mista</option>
        <option value="easy">Fácil</option>
        <option value="medium">Média</option>
        <option value="hard">Difícil</option>
      </select>
    </div>
  `;

  setupContent.append(form);
  const actions = createElement('div', 'setup-actions');
  const start = createElement('button', 'primary-button', 'Valendo! Começar duelo →');
  start.type = 'button';
  start.addEventListener('click', () => {
    const config = {
      names: [
        cleanName(document.querySelector('#team-one').value, 'Casal 1'),
        cleanName(document.querySelector('#team-two').value, 'Casal 2')
      ],
      rounds: Number(document.querySelector('#duel-rounds').value),
      difficulty: document.querySelector('#duel-difficulty').value
    };
    startTriviaGame('duel', config);
  });
  actions.append(start);
  setupContent.append(actions);
}

function capturePartyNames() {
  const inputs = [...setupContent.querySelectorAll('[data-player-input]')];
  if (!inputs.length) return;
  partyDraftNames = inputs.map((input, index) => cleanName(input.value, `Jogador ${index + 1}`));
}

function renderPartySetup() {
  const preservedRoundValue = document.querySelector('#party-rounds')?.value || '5';
  const preservedDifficulty = document.querySelector('#party-difficulty')?.value || 'mixed';
  setupContent.replaceChildren();
  setupContent.append(renderSetupHeader(
    '🎉',
    'SALA 03 · GALERA',
    'Aqui é cada um por si.',
    'Casais e solteiros jogam juntos. Cada pessoa responde no próprio turno e quem terminar no último lugar paga o mico.'
  ));

  const wrapper = createElement('div', 'form-grid');
  const playerField = createElement('div', 'field-full');
  playerField.append(createElement('span', 'form-label', `Jogadores · ${partyDraftNames.length}/8`));

  const list = createElement('div', 'player-list');
  partyDraftNames.forEach((name, index) => {
    const row = createElement('div', 'player-row');
    row.append(createElement('span', 'player-index', String(index + 1).padStart(2, '0')));

    const input = createElement('input', 'input');
    input.type = 'text';
    input.maxLength = 28;
    input.value = name;
    input.dataset.playerInput = 'true';
    input.setAttribute('aria-label', `Nome do jogador ${index + 1}`);
    row.append(input);

    const remove = createElement('button', 'player-remove', '×');
    remove.type = 'button';
    remove.title = 'Remover jogador';
    remove.disabled = partyDraftNames.length <= 2;
    remove.addEventListener('click', () => {
      capturePartyNames();
      partyDraftNames.splice(index, 1);
      renderPartySetup();
    });
    row.append(remove);
    list.append(row);
  });

  playerField.append(list);
  const add = createElement('button', 'ghost-button add-player', '+ Adicionar jogador');
  add.type = 'button';
  add.disabled = partyDraftNames.length >= 8;
  add.addEventListener('click', () => {
    capturePartyNames();
    if (partyDraftNames.length < 8) {
      partyDraftNames.push(`Jogador ${partyDraftNames.length + 1}`);
      renderPartySetup();
    }
  });
  playerField.append(add);
  wrapper.append(playerField);

  const roundsField = createElement('div', 'field');
  roundsField.innerHTML = `
    <label for="party-rounds">Rodadas por jogador</label>
    <select class="select" id="party-rounds">
      <option value="3">3 rodadas</option>
      <option value="5">5 rodadas</option>
      <option value="7">7 rodadas</option>
    </select>
  `;
  wrapper.append(roundsField);

  const difficultyField = createElement('div', 'field');
  difficultyField.innerHTML = `
    <label for="party-difficulty">Dificuldade</label>
    <select class="select" id="party-difficulty">
      <option value="mixed">Mista</option>
      <option value="easy">Fácil</option>
      <option value="medium">Média</option>
      <option value="hard">Difícil</option>
    </select>
  `;
  wrapper.append(difficultyField);
  setupContent.append(wrapper);

  document.querySelector('#party-rounds').value = preservedRoundValue;
  document.querySelector('#party-difficulty').value = preservedDifficulty;

  const actions = createElement('div', 'setup-actions');
  const start = createElement('button', 'primary-button', 'Começar a bagunça →');
  start.type = 'button';
  start.addEventListener('click', () => {
    capturePartyNames();
    const config = {
      names: partyDraftNames.map((name, index) => cleanName(name, `Jogador ${index + 1}`)),
      rounds: Number(document.querySelector('#party-rounds').value),
      difficulty: document.querySelector('#party-difficulty').value
    };
    startTriviaGame('party', config);
  });
  actions.append(start);
  setupContent.append(actions);
}

function refillCoupleBag() {
  const pool = coupleQuestions.filter((question) => question.intensity === state.config.intensity);
  state.questionBag = shuffle(pool);
  if (state.lastQuestionId && state.questionBag.length > 1 && state.questionBag.at(-1).id === state.lastQuestionId) {
    [state.questionBag[0], state.questionBag[state.questionBag.length - 1]] = [state.questionBag.at(-1), state.questionBag[0]];
  }
}

function nextCoupleQuestion() {
  if (!state.questionBag.length) refillCoupleBag();
  const question = state.questionBag.pop();
  state.lastQuestionId = question.id;
  return question;
}

function startCoupleGame(config) {
  state = {
    room: 'couple',
    config: structuredClone(config),
    index: 0,
    questionBag: [],
    lastQuestionId: null,
    currentQuestion: null
  };
  refillCoupleBag();
  state.currentQuestion = nextCoupleQuestion();
  showView('game-view');
  renderCoupleQuestion();
}

function renderCoupleQuestion() {
  const { currentQuestion: question, config, index } = state;
  scoreboard.replaceChildren();
  gameProgress.textContent = `Pergunta ${index + 1} de ${config.count}`;
  gameContent.replaceChildren();

  const card = createElement('article', 'question-card couple-question');
  const meta = createElement('div', 'question-meta');
  meta.append(
    createElement('span', 'category-chip', question.category),
    createElement('span', 'badge', intensityLabels[question.intensity])
  );
  card.append(meta);
  card.append(createElement('p', 'couple-names', `${config.names[0]} + ${config.names[1]}`));
  card.append(createElement('h2', 'question-text', question.text));

  const footer = createElement('div', 'question-footer');
  footer.append(createElement('div', 'feedback', 'Conversem no tempo de vocês.'));
  const actions = createElement('div', 'question-actions');

  const skip = createElement('button', 'ghost-button', 'Trocar pergunta');
  skip.type = 'button';
  skip.addEventListener('click', () => {
    state.currentQuestion = nextCoupleQuestion();
    renderCoupleQuestion();
    showToast('Pergunta trocada sem avançar a sessão.');
  });

  const next = createElement('button', 'primary-button', index + 1 >= config.count ? 'Encerrar sessão →' : 'Próxima →');
  next.type = 'button';
  next.addEventListener('click', () => {
    if (state.index + 1 >= state.config.count) {
      finishGame();
      return;
    }
    state.index += 1;
    state.currentQuestion = nextCoupleQuestion();
    renderCoupleQuestion();
  });

  actions.append(skip, next);
  footer.append(actions);
  card.append(footer, progressBar((index + 1) / config.count));
  gameContent.append(card);
}

function refillTriviaBag() {
  const { difficulty } = state.config;
  const pool = difficulty === 'mixed'
    ? triviaQuestions
    : triviaQuestions.filter((question) => question.difficulty === difficulty);

  state.questionBag = shuffle(pool);
  if (state.lastQuestionId && state.questionBag.length > 1 && state.questionBag.at(-1).id === state.lastQuestionId) {
    [state.questionBag[0], state.questionBag[state.questionBag.length - 1]] = [state.questionBag.at(-1), state.questionBag[0]];
  }
}

function nextTriviaQuestion() {
  if (!state.questionBag.length) refillTriviaBag();
  const question = state.questionBag.pop();
  state.lastQuestionId = question.id;
  return question;
}

function startTriviaGame(room, config) {
  const players = config.names.map((name) => ({ name, score: 0 }));
  const turnsPerRound = room === 'duel' ? 2 : players.length;
  state = {
    room,
    config: structuredClone(config),
    players,
    turn: 0,
    totalTurns: config.rounds * turnsPerRound,
    questionBag: [],
    lastQuestionId: null,
    currentQuestion: null,
    answered: false,
    lastDareId: null
  };
  refillTriviaBag();
  state.currentQuestion = nextTriviaQuestion();
  showView('game-view');
  renderTriviaQuestion();
}

function getActivePlayerIndex() {
  return state.room === 'duel'
    ? state.turn % 2
    : state.turn % state.players.length;
}

function getRoundNumber() {
  const turnsPerRound = state.room === 'duel' ? 2 : state.players.length;
  return Math.floor(state.turn / turnsPerRound) + 1;
}

function renderScoreboard() {
  scoreboard.replaceChildren();
  const activeIndex = getActivePlayerIndex();
  state.players.forEach((player, index) => {
    const card = createElement('div', `score-card${index === activeIndex ? ' is-active' : ''}`);
    card.append(
      createElement('span', '', player.name),
      createElement('strong', '', String(player.score)),
      createElement('small', '', index === activeIndex ? 'jogando agora' : 'pontos')
    );
    scoreboard.append(card);
  });
}

function renderTriviaQuestion() {
  state.answered = false;
  renderScoreboard();
  const question = state.currentQuestion;
  const activeIndex = getActivePlayerIndex();
  const activePlayer = state.players[activeIndex];
  const round = getRoundNumber();

  gameProgress.textContent = `Rodada ${round} de ${state.config.rounds} · ${activePlayer.name}`;
  gameContent.replaceChildren();

  const card = createElement('article', 'question-card');
  const meta = createElement('div', 'question-meta');
  meta.append(
    createElement('span', 'category-chip', question.category),
    createElement('span', `badge badge-${question.difficulty}`, difficultyLabels[question.difficulty])
  );
  card.append(meta);
  card.append(createElement('p', 'turn-label', `É a vez de ${activePlayer.name}`));
  card.append(createElement('h2', 'question-text', question.prompt));

  const answers = createElement('div', 'answers');
  question.options.forEach((option, index) => {
    const button = createElement('button', 'answer-button');
    button.type = 'button';
    button.dataset.answerIndex = String(index);
    button.append(
      createElement('span', 'answer-key', String(index + 1)),
      createElement('span', '', option)
    );
    button.addEventListener('click', () => answerQuestion(index));
    answers.append(button);
  });
  card.append(answers);

  const footer = createElement('div', 'question-footer');
  const feedback = createElement('div', 'feedback');
  feedback.id = 'answer-feedback';
  feedback.textContent = 'Escolha uma alternativa.';
  footer.append(feedback);

  const actions = createElement('div', 'question-actions');
  const skip = createElement('button', 'ghost-button', 'Trocar pergunta');
  skip.type = 'button';
  skip.id = 'skip-question';
  skip.addEventListener('click', skipTriviaQuestion);

  const next = createElement('button', 'primary-button', state.turn + 1 >= state.totalTurns ? 'Ver resultado →' : 'Próximo turno →');
  next.type = 'button';
  next.id = 'next-turn';
  next.hidden = true;
  next.addEventListener('click', nextTurn);

  actions.append(skip, next);
  footer.append(actions);
  card.append(footer, progressBar((state.turn + 1) / state.totalTurns));
  gameContent.append(card);
}

function answerQuestion(selectedIndex) {
  if (!state || state.room === 'couple' || state.answered) return;
  state.answered = true;

  const question = state.currentQuestion;
  const activeIndex = getActivePlayerIndex();
  const correct = selectedIndex === question.answer;
  stats.answers += 1;

  if (correct) {
    state.players[activeIndex].score += 1;
    stats.correct += 1;
  }
  saveStats();

  const buttons = [...gameContent.querySelectorAll('[data-answer-index]')];
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === question.answer) button.classList.add('is-correct');
    if (index === selectedIndex && !correct) button.classList.add('is-wrong');
  });

  const feedback = document.querySelector('#answer-feedback');
  feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
  feedback.textContent = correct
    ? `✓ Acertou! +1 para ${state.players[activeIndex].name}`
    : `✕ Não foi dessa vez. A resposta era “${question.options[question.answer]}”.`;

  document.querySelector('#skip-question').hidden = true;
  document.querySelector('#next-turn').hidden = false;
  renderScoreboard();
}

function skipTriviaQuestion() {
  if (state.answered) return;
  state.currentQuestion = nextTriviaQuestion();
  renderTriviaQuestion();
  showToast('Pergunta trocada sem perder o turno.');
}

function nextTurn() {
  if (!state.answered) return;
  if (state.turn + 1 >= state.totalTurns) {
    finishGame();
    return;
  }

  state.turn += 1;
  state.currentQuestion = nextTriviaQuestion();
  renderTriviaQuestion();
}

function progressBar(ratio) {
  const track = createElement('div', 'progress-track');
  const fill = createElement('span');
  fill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  track.append(fill);
  return track;
}

function pickDare() {
  let pool = dares;
  if (state?.lastDareId && dares.length > 1) {
    pool = dares.filter((dare) => dare.id !== state.lastDareId);
  }
  const dare = pool[secureRandomIndex(pool.length)];
  if (state) state.lastDareId = dare.id;
  return dare;
}

function finishGame() {
  stats.games += 1;
  saveStats();
  showView('result-view');
  resultContent.replaceChildren();

  if (state.room === 'couple') {
    renderCoupleResult();
  } else {
    renderTriviaResult();
  }
}

function renderCoupleResult() {
  const icon = createElement('div', 'result-icon', '💗');
  const title = createElement('h1', '', 'Boa conversa.');
  const description = createElement(
    'p',
    '',
    `${state.config.names[0]} e ${state.config.names[1]} concluíram ${state.config.count} perguntas no modo ${intensityLabels[state.config.intensity].toLowerCase()}. O resto da conversa é com vocês.`
  );
  resultContent.append(icon, createElement('p', 'kicker', 'SESSÃO CONCLUÍDA'), title, description);
  resultContent.append(resultButtons());
}

function renderTriviaResult() {
  const scores = state.players.map((player) => player.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const allTied = minScore === maxScore;
  const losers = state.players.filter((player) => player.score === minScore);
  const winners = state.players.filter((player) => player.score === maxScore);

  resultContent.append(createElement('div', 'result-icon', allTied ? '🤝' : '🏆'));
  resultContent.append(createElement('p', 'kicker', state.room === 'duel' ? 'DUELO ENCERRADO' : 'FIM DE JOGO'));
  resultContent.append(createElement('h1', '', allTied ? 'Empate perfeito!' : 'Temos resultado.'));

  const description = allTied
    ? 'Todo mundo terminou com a mesma pontuação. Ninguém ficou para trás — então o mico abaixo vira desempate ou caos coletivo opcional.'
    : state.room === 'duel'
      ? `${winners.map((player) => player.name).join(' & ')} levou a melhor. O menor placar recebe a missão.`
      : `${winners.map((player) => player.name).join(', ')} ficou no topo. O último lugar recebe a missão.`;
  resultContent.append(createElement('p', '', description));

  const scoreGrid = createElement('div', 'result-scores');
  state.players.forEach((player) => {
    let classes = 'result-score';
    if (!allTied && player.score === maxScore) classes += ' is-winner';
    if (!allTied && player.score === minScore) classes += ' is-loser';
    const score = createElement('div', classes);
    score.append(
      createElement('span', '', player.name),
      createElement('strong', '', `${player.score}/${state.config.rounds}`)
    );
    scoreGrid.append(score);
  });
  resultContent.append(scoreGrid);

  const target = allTied
    ? 'Mico coletivo opcional'
    : `Mico para ${losers.map((player) => player.name).join(' & ')}`;
  resultContent.append(createDareCard(target));
  resultContent.append(resultButtons());
}

function createDareCard(target) {
  const card = createElement('div', 'dare-card');
  card.append(createElement('p', 'kicker', 'MISSÃO ALEATÓRIA'));
  card.append(createElement('h2', '', target));
  const dareText = createElement('p');
  const level = createElement('span', 'badge');

  const roll = () => {
    const dare = pickDare();
    dareText.textContent = dare.text;
    level.textContent = `nível: ${dare.level}`;
  };
  roll();
  card.append(dareText, level);

  const reroll = createElement('button', 'ghost-button', '↻ Sortear outro mico');
  reroll.type = 'button';
  reroll.addEventListener('click', roll);
  card.append(reroll);
  return card;
}

function resultButtons() {
  const row = createElement('div', 'button-row');
  row.style.marginTop = '28px';

  const replay = createElement('button', 'primary-button', state.room === 'couple' ? 'Outra sessão →' : 'Revanche →');
  replay.type = 'button';
  replay.addEventListener('click', () => {
    const config = structuredClone(state.config);
    if (state.room === 'couple') startCoupleGame(config);
    else startTriviaGame(state.room, config);
  });

  const home = createElement('button', 'secondary-button', 'Escolher outra sala');
  home.type = 'button';
  home.addEventListener('click', goHome);
  row.append(replay, home);
  return row;
}

function goHome() {
  state = null;
  setupContent.replaceChildren();
  scoreboard.replaceChildren();
  gameContent.replaceChildren();
  resultContent.replaceChildren();
  renderHomeStats();
  showView('home-view');
}

function leaveCurrentGame() {
  if (!state) {
    goHome();
    return;
  }
  if (window.confirm('Sair da partida atual? O placar desta partida não será salvo.')) {
    goHome();
  }
}

function handleKeyboard(event) {
  if (!document.querySelector('#game-view').classList.contains('is-active') || !state) return;

  if (state.room !== 'couple' && !state.answered && /^[1-4]$/.test(event.key)) {
    const index = Number(event.key) - 1;
    const button = gameContent.querySelector(`[data-answer-index="${index}"]`);
    if (button) button.click();
  }

  if (state.room !== 'couple' && state.answered && event.key === 'Enter') {
    document.querySelector('#next-turn')?.click();
  }
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  } catch {
    showToast('O navegador não permitiu ativar a tela cheia.');
  }
}

document.querySelectorAll('[data-room]').forEach((button) => {
  button.addEventListener('click', () => openRoom(button.dataset.room));
});

document.querySelectorAll('[data-action="home"]').forEach((button) => {
  button.addEventListener('click', goHome);
});

document.querySelector('[data-action="leave-game"]').addEventListener('click', leaveCurrentGame);
document.querySelector('#fullscreen-button').addEventListener('click', toggleFullscreen);
document.addEventListener('keydown', handleKeyboard);

renderHomeStats();
