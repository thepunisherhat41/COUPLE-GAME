import { dares } from './data.js';
import { COMPETITIVE_RULES, POWER_DEFINITIONS, createPowerState, hearts } from './competitive-rules.js';

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

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function cleanName(value, fallback) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  return normalized.slice(0, 28) || fallback;
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

export function installCompetitiveEngine(triviaQuestions) {
  const setupContent = document.querySelector('#setup-content');
  const gameContent = document.querySelector('#game-content');
  const scoreboard = document.querySelector('#scoreboard');
  const gameProgress = document.querySelector('#game-progress');
  const resultContent = document.querySelector('#result-content');
  const toast = document.querySelector('#toast');
  if (!setupContent || !gameContent || !scoreboard || !gameProgress || !resultContent) return;

  let active = false;
  let state = null;
  let duelDraft = ['Casal 1', 'Casal 2'];
  let partyDraft = Array.from({ length: 4 }, (_, index) => ({ name: `Jogador ${index + 1}`, team: index % 2 }));
  let partyMode = 'individual';
  let teamCount = 2;
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
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

  function resetSurfaces() {
    setupContent.replaceChildren();
    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    resultContent.replaceChildren();
  }

  function goHome() {
    active = false;
    state = null;
    resetSurfaces();
    showView('home-view');
  }

  function livesOptions(selected = 3) {
    return [3, 4, 5].map((value) => `<option value="${value}"${value === selected ? ' selected' : ''}>${value} vidas</option>`).join('');
  }

  function difficultyOptions() {
    return `
      <option value="mixed" selected>Mista</option>
      <option value="easy">Fácil</option>
      <option value="medium">Média</option>
      <option value="hard">Difícil</option>`;
  }

  function renderDuelSetup() {
    active = true;
    state = null;
    resetSurfaces();
    setupContent.append(renderSetupHeader(
      '🥂',
      'SALA 02 · DUELO DE CASAIS',
      'Até 6 casais. Três vidas mudam tudo.',
      'Cada casal responde no próprio turno. Trocar uma pergunta custa uma vida; ao zerar, o casal é eliminado.'
    ));

    const form = createElement('div', 'form-grid');
    const couplesField = createElement('div', 'field-full');
    couplesField.append(createElement('span', 'form-label', `Casais · ${duelDraft.length}/${COMPETITIVE_RULES.maxCouples}`));
    const list = createElement('div', 'player-list');
    duelDraft.forEach((name, index) => {
      const row = createElement('div', 'player-row');
      row.append(createElement('span', 'player-index', String(index + 1).padStart(2, '0')));
      const input = createElement('input', 'input');
      input.value = name;
      input.maxLength = 28;
      input.dataset.duelName = String(index);
      input.placeholder = `Casal ${index + 1}`;
      row.append(input);
      const remove = createElement('button', 'player-remove', '×');
      remove.type = 'button';
      remove.disabled = duelDraft.length <= 2;
      remove.addEventListener('click', () => {
        captureDuelDraft();
        duelDraft.splice(index, 1);
        renderDuelSetup();
      });
      row.append(remove);
      list.append(row);
    });
    couplesField.append(list);
    const add = createElement('button', 'ghost-button add-player', '+ Adicionar casal');
    add.type = 'button';
    add.disabled = duelDraft.length >= COMPETITIVE_RULES.maxCouples;
    add.addEventListener('click', () => {
      captureDuelDraft();
      if (duelDraft.length < COMPETITIVE_RULES.maxCouples) duelDraft.push(`Casal ${duelDraft.length + 1}`);
      renderDuelSetup();
    });
    couplesField.append(add);
    form.append(couplesField);

    const settings = createElement('div', 'field-full competitive-settings-grid');
    settings.innerHTML = `
      <div class="field"><label for="duel-rounds-v2">Rodadas por casal</label><select class="select" id="duel-rounds-v2"><option value="5">5</option><option value="10" selected>10</option><option value="15">15</option></select></div>
      <div class="field"><label for="duel-difficulty-v2">Dificuldade</label><select class="select" id="duel-difficulty-v2">${difficultyOptions()}</select></div>
      <div class="field"><label for="duel-lives-v2">Vidas por casal</label><select class="select" id="duel-lives-v2">${livesOptions()}</select></div>`;
    form.append(settings);
    setupContent.append(form);

    const rule = createElement('div', 'competitive-rule-note');
    rule.textContent = '❤️ Regra de vida: trocar/pular pergunta custa 1 vida. Resposta errada não custa vida.';
    setupContent.append(rule);

    const actions = createElement('div', 'setup-actions');
    const start = createElement('button', 'primary-button', 'Começar duelo →');
    start.type = 'button';
    start.addEventListener('click', () => {
      captureDuelDraft();
      startDuel({
        names: duelDraft.map((name, index) => cleanName(name, `Casal ${index + 1}`)),
        rounds: Number(setupContent.querySelector('#duel-rounds-v2').value),
        difficulty: setupContent.querySelector('#duel-difficulty-v2').value,
        maxLives: Number(setupContent.querySelector('#duel-lives-v2').value)
      });
    });
    actions.append(start);
    setupContent.append(actions);
    showView('setup-view');
  }

  function captureDuelDraft() {
    const inputs = [...setupContent.querySelectorAll('[data-duel-name]')];
    if (inputs.length) duelDraft = inputs.map((input, index) => cleanName(input.value, `Casal ${index + 1}`));
  }

  function capturePartyDraft() {
    const inputs = [...setupContent.querySelectorAll('[data-party-name]')];
    if (!inputs.length) return;
    partyDraft = inputs.map((input, index) => ({
      name: cleanName(input.value, `Jogador ${index + 1}`),
      team: Number(setupContent.querySelector(`[data-party-team="${index}"]`)?.value || 0)
    }));
  }

  function renderPartySetup() {
    active = true;
    state = null;
    resetSurfaces();
    setupContent.append(renderSetupHeader(
      '🎉',
      'SALA 03 · GALERA',
      'Até 16 jogadores. Individual ou por equipes.',
      'Cada jogador tem vidas próprias. No modo Equipes, cada time compartilha três poderes exclusivos para perguntas difíceis.'
    ));

    const modeField = createElement('div', 'field-full');
    modeField.innerHTML = `
      <span class="form-label">Formato</span>
      <div class="segmented">
        <button class="segment-button${partyMode === 'individual' ? ' is-selected' : ''}" type="button" data-party-mode="individual"><span>👤 Individual</span><small>cada um por si</small></button>
        <button class="segment-button${partyMode === 'teams' ? ' is-selected' : ''}" type="button" data-party-mode="teams"><span>🛡️ Equipes</span><small>times + 3 poderes</small></button>
      </div>`;
    setupContent.append(modeField);
    modeField.querySelectorAll('[data-party-mode]').forEach((button) => button.addEventListener('click', () => {
      capturePartyDraft();
      partyMode = button.dataset.partyMode;
      renderPartySetup();
    }));

    const form = createElement('div', 'form-grid');
    if (partyMode === 'teams') {
      const teamField = createElement('div', 'field-full competitive-settings-grid');
      teamField.innerHTML = `
        <div class="field"><label for="party-team-count">Quantidade de times</label><select class="select" id="party-team-count">${Array.from({ length: COMPETITIVE_RULES.maxPartyTeams - 1 }, (_, i) => i + 2).map((value) => `<option value="${value}"${value === teamCount ? ' selected' : ''}>${value} times</option>`).join('')}</select></div>
        <div class="power-summary"><strong>3 poderes por time</strong><span>✂️ 50/50 · 🔎 Pista · 🛡️ Segunda chance</span><small>Só ficam habilitados quando a pergunta é Difícil.</small></div>`;
      form.append(teamField);
      teamField.querySelector('#party-team-count').addEventListener('change', (event) => {
        capturePartyDraft();
        teamCount = Number(event.target.value);
        partyDraft.forEach((player) => { if (player.team >= teamCount) player.team = 0; });
        renderPartySetup();
      });
    }

    const playersField = createElement('div', 'field-full');
    playersField.append(createElement('span', 'form-label', `Jogadores · ${partyDraft.length}/${COMPETITIVE_RULES.maxPartyPlayers}`));
    const list = createElement('div', 'player-list party-player-list');
    partyDraft.forEach((player, index) => {
      const row = createElement('div', 'player-row party-player-row');
      row.append(createElement('span', 'player-index', String(index + 1).padStart(2, '0')));
      const input = createElement('input', 'input');
      input.value = player.name;
      input.maxLength = 28;
      input.dataset.partyName = String(index);
      row.append(input);
      if (partyMode === 'teams') {
        const select = createElement('select', 'select team-select');
        select.dataset.partyTeam = String(index);
        for (let team = 0; team < teamCount; team += 1) {
          const option = document.createElement('option');
          option.value = String(team);
          option.textContent = `Time ${team + 1}`;
          option.selected = player.team === team;
          select.append(option);
        }
        row.append(select);
      }
      const remove = createElement('button', 'player-remove', '×');
      remove.type = 'button';
      remove.disabled = partyDraft.length <= 2;
      remove.addEventListener('click', () => {
        capturePartyDraft();
        partyDraft.splice(index, 1);
        renderPartySetup();
      });
      row.append(remove);
      list.append(row);
    });
    playersField.append(list);
    const add = createElement('button', 'ghost-button add-player', '+ Adicionar jogador');
    add.type = 'button';
    add.disabled = partyDraft.length >= COMPETITIVE_RULES.maxPartyPlayers;
    add.addEventListener('click', () => {
      capturePartyDraft();
      if (partyDraft.length < COMPETITIVE_RULES.maxPartyPlayers) {
        const index = partyDraft.length;
        partyDraft.push({ name: `Jogador ${index + 1}`, team: index % teamCount });
      }
      renderPartySetup();
    });
    playersField.append(add);
    form.append(playersField);

    const settings = createElement('div', 'field-full competitive-settings-grid');
    settings.innerHTML = `
      <div class="field"><label for="party-rounds-v2">Rodadas por jogador</label><select class="select" id="party-rounds-v2"><option value="3">3</option><option value="5" selected>5</option><option value="7">7</option></select></div>
      <div class="field"><label for="party-difficulty-v2">Dificuldade</label><select class="select" id="party-difficulty-v2">${difficultyOptions()}</select></div>
      <div class="field"><label for="party-lives-v2">Vidas por jogador</label><select class="select" id="party-lives-v2">${livesOptions()}</select></div>`;
    form.append(settings);
    setupContent.append(form);

    const rule = createElement('div', 'competitive-rule-note');
    rule.textContent = partyMode === 'teams'
      ? '❤️ Cada jogador tem vidas próprias. Pular custa 1 vida. 🛡️ Os três poderes pertencem ao time e só funcionam em perguntas Difíceis.'
      : '❤️ Cada jogador tem vidas próprias. Pular ou trocar uma pergunta custa 1 vida. Ao zerar, o jogador é eliminado.';
    setupContent.append(rule);

    const actions = createElement('div', 'setup-actions');
    const start = createElement('button', 'primary-button', partyMode === 'teams' ? 'Começar batalha de times →' : 'Começar cada um por si →');
    start.type = 'button';
    start.addEventListener('click', () => {
      capturePartyDraft();
      if (partyMode === 'teams') {
        const occupied = new Set(partyDraft.map((player) => player.team));
        if (occupied.size < 2) {
          showToast('Distribua os jogadores em pelo menos 2 times.');
          return;
        }
      }
      startParty({
        players: structuredClone(partyDraft),
        mode: partyMode,
        teamCount,
        rounds: Number(setupContent.querySelector('#party-rounds-v2').value),
        difficulty: setupContent.querySelector('#party-difficulty-v2').value,
        maxLives: Number(setupContent.querySelector('#party-lives-v2').value)
      });
    });
    actions.append(start);
    setupContent.append(actions);
    showView('setup-view');
  }

  function createQuestionBag(difficulty) {
    const pool = difficulty === 'mixed' ? triviaQuestions : triviaQuestions.filter((question) => question.difficulty === difficulty);
    return shuffle(pool);
  }

  function drawQuestion() {
    if (!state.questionBag.length) state.questionBag = createQuestionBag(state.config.difficulty);
    let question = state.questionBag.pop();
    if (state.currentQuestion && question?.id === state.currentQuestion.id && state.questionBag.length) {
      const alternate = state.questionBag.pop();
      state.questionBag.unshift(question);
      question = alternate;
    }
    return question;
  }

  function startDuel(config) {
    state = {
      room: 'duel',
      config: structuredClone(config),
      competitors: config.names.map((name, index) => ({ id: `c${index}`, name, score: 0, lives: config.maxLives, turns: 0, eliminated: false })),
      cursor: 0,
      questionBag: createQuestionBag(config.difficulty),
      currentQuestion: null,
      answered: false,
      retryArmed: false,
      powerEffects: new Set()
    };
    state.currentQuestion = drawQuestion();
    showView('game-view');
    renderCompetitiveQuestion();
  }

  function startParty(config) {
    const players = config.players.map((player, index) => ({
      id: `p${index}`,
      name: cleanName(player.name, `Jogador ${index + 1}`),
      team: config.mode === 'teams' ? player.team : null,
      score: 0,
      lives: config.maxLives,
      turns: 0,
      eliminated: false
    }));
    const teams = config.mode === 'teams'
      ? Array.from({ length: config.teamCount }, (_, index) => ({ id: index, name: `Time ${index + 1}`, score: 0, powers: createPowerState() })).filter((team) => players.some((player) => player.team === team.id))
      : [];
    state = {
      room: 'party',
      config: structuredClone(config),
      players,
      teams,
      cursor: 0,
      questionBag: createQuestionBag(config.difficulty),
      currentQuestion: null,
      answered: false,
      retryArmed: false,
      powerEffects: new Set()
    };
    state.currentQuestion = drawQuestion();
    showView('game-view');
    renderCompetitiveQuestion();
  }

  function activeList() {
    return state.room === 'duel' ? state.competitors : state.players;
  }

  function currentActor() {
    return activeList()[state.cursor];
  }

  function currentTeam() {
    if (state.room !== 'party' || state.config.mode !== 'teams') return null;
    const actor = currentActor();
    return state.teams.find((team) => team.id === actor.team) || null;
  }

  function teamAlive(teamId) {
    return state.players.some((player) => player.team === teamId && !player.eliminated && player.turns < state.config.rounds);
  }

  function matchShouldEnd() {
    const list = activeList();
    const eligible = list.filter((item) => !item.eliminated && item.turns < state.config.rounds);
    if (!eligible.length) return true;
    if (state.room === 'duel') {
      const alive = list.filter((item) => !item.eliminated);
      return alive.length === 1 && list.some((item) => item.eliminated);
    }
    if (state.config.mode === 'teams') {
      const aliveTeams = state.teams.filter((team) => teamAlive(team.id));
      return aliveTeams.length === 1 && state.teams.length > 1 && state.players.some((player) => player.eliminated);
    }
    const alive = list.filter((item) => !item.eliminated);
    return alive.length === 1 && list.some((item) => item.eliminated);
  }

  function moveCursor() {
    const list = activeList();
    for (let step = 1; step <= list.length; step += 1) {
      const index = (state.cursor + step) % list.length;
      const candidate = list[index];
      if (!candidate.eliminated && candidate.turns < state.config.rounds) {
        state.cursor = index;
        return true;
      }
    }
    return false;
  }

  function endTurn() {
    const actor = currentActor();
    actor.turns += 1;
    if (matchShouldEnd() || !moveCursor()) {
      finishCompetitiveGame();
      return;
    }
    state.currentQuestion = drawQuestion();
    state.answered = false;
    state.retryArmed = false;
    state.powerEffects.clear();
    renderCompetitiveQuestion();
  }

  function renderScoreboard() {
    scoreboard.replaceChildren();
    scoreboard.className = 'scoreboard competitive-scoreboard';
    if (state.room === 'party' && state.config.mode === 'teams') {
      state.teams.forEach((team) => {
        const members = state.players.filter((player) => player.team === team.id);
        const card = createElement('div', `score-card team-score-card${currentActor()?.team === team.id ? ' is-active' : ''}`);
        const powersLeft = Object.values(team.powers).filter(Boolean).length;
        card.append(
          createElement('span', '', team.name),
          createElement('strong', '', `${team.score} pts`),
          createElement('small', '', `${members.filter((member) => !member.eliminated).length}/${members.length} ativos · ⚡ ${powersLeft}/3`)
        );
        const livesLine = createElement('div', 'team-member-lives');
        members.forEach((member) => livesLine.append(createElement('span', member.eliminated ? 'is-eliminated' : '', `${member.name}: ${hearts(member.lives, state.config.maxLives)}`)));
        card.append(livesLine);
        scoreboard.append(card);
      });
      return;
    }

    activeList().forEach((actor, index) => {
      const card = createElement('div', `score-card life-score-card${index === state.cursor ? ' is-active' : ''}${actor.eliminated ? ' is-eliminated' : ''}`);
      card.append(
        createElement('span', '', actor.name),
        createElement('strong', '', String(actor.score)),
        createElement('small', '', actor.eliminated ? 'eliminado' : hearts(actor.lives, state.config.maxLives))
      );
      scoreboard.append(card);
    });
  }

  function renderPowerPanel(question) {
    const team = currentTeam();
    if (!team) return null;
    const panel = createElement('div', 'power-panel');
    panel.append(createElement('p', 'kicker', `PODERES · ${team.name}`));
    const buttons = createElement('div', 'power-buttons');
    POWER_DEFINITIONS.forEach((power) => {
      const button = createElement('button', 'power-button');
      button.type = 'button';
      button.dataset.power = power.id;
      const available = team.powers[power.id];
      button.disabled = !available || question.difficulty !== 'hard' || state.answered;
      button.append(
        createElement('strong', '', `${power.icon} ${power.name}`),
        createElement('small', '', available ? power.description : 'Já utilizado')
      );
      button.addEventListener('click', () => usePower(power.id));
      buttons.append(button);
    });
    panel.append(buttons);
    panel.append(createElement('small', 'power-rule', question.difficulty === 'hard' ? 'Escolha com cuidado: cada poder só pode ser usado uma vez pelo time.' : '🔒 Poderes só podem ser usados em perguntas Difíceis.'));
    return panel;
  }

  function renderCompetitiveQuestion() {
    const actor = currentActor();
    const question = state.currentQuestion;
    state.answered = false;
    state.retryArmed = false;
    state.powerEffects.clear();
    renderScoreboard();
    gameContent.replaceChildren();
    const team = currentTeam();
    const label = state.room === 'duel' ? actor.name : team ? `${actor.name} · ${team.name}` : actor.name;
    gameProgress.textContent = `${label} · rodada ${actor.turns + 1}/${state.config.rounds}`;

    const card = createElement('article', 'question-card competitive-question-card');
    const meta = createElement('div', 'question-meta');
    meta.append(
      createElement('span', 'category-chip', question.category),
      createElement('span', `badge badge-${question.difficulty}`, question.difficulty === 'easy' ? 'Fácil' : question.difficulty === 'medium' ? 'Média' : 'Difícil'),
      createElement('span', 'life-badge', `${hearts(actor.lives, state.config.maxLives)} ${actor.lives}/${state.config.maxLives}`)
    );
    card.append(meta);
    card.append(createElement('p', 'turn-label', `É a vez de ${label}`));
    card.append(createElement('h2', 'question-text', question.prompt));

    const powerPanel = renderPowerPanel(question);
    if (powerPanel) card.append(powerPanel);

    const answers = createElement('div', 'answers competition-answers');
    question.options.forEach((option, index) => {
      const button = createElement('button', 'answer-button');
      button.type = 'button';
      button.dataset.competitionAnswer = String(index);
      button.append(createElement('span', 'answer-key', String(index + 1)), createElement('span', '', option));
      button.addEventListener('click', () => answerQuestion(index));
      answers.append(button);
    });
    card.append(answers);

    const footer = createElement('div', 'question-footer');
    const feedback = createElement('div', 'feedback', 'Escolha uma alternativa ou troque a pergunta perdendo uma vida.');
    feedback.id = 'competitive-feedback';
    footer.append(feedback);
    const actions = createElement('div', 'question-actions');
    const skip = createElement('button', 'ghost-button', '↻ Trocar pergunta · −1 ❤️');
    skip.type = 'button';
    skip.id = 'competitive-skip';
    skip.addEventListener('click', skipQuestion);
    const next = createElement('button', 'primary-button', 'Próximo turno →');
    next.type = 'button';
    next.id = 'competitive-next';
    next.hidden = true;
    next.addEventListener('click', endTurn);
    actions.append(skip, next);
    footer.append(actions);
    card.append(footer, progressBar((actor.turns + 1) / state.config.rounds));
    gameContent.append(card);
  }

  function usePower(powerId) {
    const team = currentTeam();
    const question = state.currentQuestion;
    if (!team || question.difficulty !== 'hard' || !team.powers[powerId] || state.answered) return;
    team.powers[powerId] = false;
    state.powerEffects.add(powerId);
    const feedback = gameContent.querySelector('#competitive-feedback');

    if (powerId === 'fifty') {
      const wrong = question.options.map((_, index) => index).filter((index) => index !== question.answer);
      shuffle(wrong).slice(0, 2).forEach((index) => {
        const button = gameContent.querySelector(`[data-competition-answer="${index}"]`);
        if (button) {
          button.disabled = true;
          button.classList.add('is-power-removed');
        }
      });
      feedback.textContent = '✂️ 50/50 usado: duas respostas erradas foram removidas.';
    }
    if (powerId === 'clue') {
      const answerText = question.options[question.answer].trim();
      feedback.textContent = `🔎 Pista: a resposta correta começa com “${answerText.charAt(0).toUpperCase()}”.`;
    }
    if (powerId === 'retry') {
      state.retryArmed = true;
      feedback.textContent = '🛡️ Segunda chance ativada: se a primeira resposta estiver errada, o time poderá tentar novamente.';
    }
    renderScoreboard();
    gameContent.querySelectorAll('[data-power]').forEach((button) => {
      const id = button.dataset.power;
      button.disabled = !team.powers[id] || question.difficulty !== 'hard' || state.answered;
      if (!team.powers[id]) button.classList.add('is-used');
    });
  }

  function answerQuestion(selectedIndex) {
    if (state.answered) return;
    const question = state.currentQuestion;
    const actor = currentActor();
    const correct = selectedIndex === question.answer;
    const buttons = [...gameContent.querySelectorAll('[data-competition-answer]')];
    const feedback = gameContent.querySelector('#competitive-feedback');

    if (!correct && state.retryArmed) {
      state.retryArmed = false;
      const selected = buttons[selectedIndex];
      if (selected) {
        selected.disabled = true;
        selected.classList.add('is-wrong');
      }
      feedback.className = 'feedback bad';
      feedback.textContent = '🛡️ Primeira tentativa errada. A Segunda chance salvou o turno — tente outra alternativa.';
      return;
    }

    state.answered = true;
    if (correct) {
      actor.score += 1;
      const team = currentTeam();
      if (team) team.score += 1;
    }
    buttons.forEach((button, index) => {
      button.disabled = true;
      if (index === question.answer) button.classList.add('is-correct');
      if (index === selectedIndex && !correct) button.classList.add('is-wrong');
    });
    feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
    feedback.textContent = correct
      ? `✓ Acertou! +1 ponto${question.fact ? ` · 💡 ${question.fact}` : ''}`
      : `✕ A resposta era “${question.options[question.answer]}”.${question.fact ? ` 💡 ${question.fact}` : ''}`;
    gameContent.querySelector('#competitive-skip').hidden = true;
    gameContent.querySelector('#competitive-next').hidden = false;
    gameContent.querySelectorAll('[data-power]').forEach((button) => { button.disabled = true; });
    renderScoreboard();
  }

  function skipQuestion() {
    if (state.answered) return;
    const actor = currentActor();
    actor.lives -= 1;
    if (actor.lives <= 0) {
      actor.lives = 0;
      actor.eliminated = true;
      renderScoreboard();
      showToast(`${actor.name} perdeu a última vida e foi eliminado.`);
      if (matchShouldEnd() || !moveCursor()) {
        finishCompetitiveGame();
        return;
      }
      state.currentQuestion = drawQuestion();
      renderCompetitiveQuestion();
      return;
    }
    state.currentQuestion = drawQuestion();
    state.answered = false;
    state.retryArmed = false;
    state.powerEffects.clear();
    showToast(`${actor.name} perdeu 1 vida. Restam ${actor.lives}.`);
    renderCompetitiveQuestion();
  }

  function rankDuel() {
    return [...state.competitors].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.score - a.score || b.lives - a.lives);
  }

  function rankIndividuals() {
    return [...state.players].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.score - a.score || b.lives - a.lives);
  }

  function rankTeams() {
    return state.teams.map((team) => {
      const members = state.players.filter((player) => player.team === team.id);
      return {
        ...team,
        lives: members.reduce((sum, player) => sum + player.lives, 0),
        eliminated: members.every((player) => player.eliminated),
        members
      };
    }).sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.score - a.score || b.lives - a.lives);
  }

  function pickDare() {
    return dares[secureRandomIndex(dares.length)];
  }

  function finishCompetitiveGame() {
    showView('result-view');
    scoreboard.replaceChildren();
    gameContent.replaceChildren();
    resultContent.replaceChildren();
    const ranking = state.room === 'duel' ? rankDuel() : state.config.mode === 'teams' ? rankTeams() : rankIndividuals();
    const winner = ranking[0];
    const loser = ranking.at(-1);
    resultContent.append(
      createElement('div', 'result-icon', '🏆'),
      createElement('p', 'kicker', state.room === 'duel' ? 'DUELO ENCERRADO' : 'FIM DE JOGO'),
      createElement('h1', '', `${winner.name} venceu!`),
      createElement('p', '', 'Pontuação decide primeiro; em empate, vidas restantes funcionam como desempate.')
    );

    const grid = createElement('div', 'competitive-result-grid');
    ranking.forEach((entry, index) => {
      const card = createElement('div', `competitive-result-card${index === 0 ? ' is-winner' : ''}${entry.eliminated ? ' is-eliminated' : ''}`);
      card.append(
        createElement('span', 'result-position', `${index + 1}º`),
        createElement('strong', '', entry.name),
        createElement('span', '', `${entry.score} ponto${entry.score === 1 ? '' : 's'}`),
        createElement('small', '', entry.eliminated ? 'eliminado' : `${entry.lives} vida${entry.lives === 1 ? '' : 's'} restante${entry.lives === 1 ? '' : 's'}`)
      );
      if (entry.members) card.append(createElement('small', '', entry.members.map((member) => member.name).join(' · ')));
      grid.append(card);
    });
    resultContent.append(grid);

    const dare = pickDare();
    const dareCard = createElement('div', 'dare-card');
    dareCard.append(
      createElement('p', 'kicker', 'MICO PARA O ÚLTIMO LUGAR'),
      createElement('h2', '', loser.name),
      createElement('p', '', dare.text),
      createElement('span', 'badge', `nível: ${dare.level}`)
    );
    resultContent.append(dareCard);

    const row = createElement('div', 'button-row');
    row.style.marginTop = '28px';
    const replay = createElement('button', 'primary-button', 'Jogar novamente →');
    replay.type = 'button';
    replay.addEventListener('click', () => state.room === 'duel' ? renderDuelSetup() : renderPartySetup());
    const home = createElement('button', 'secondary-button', 'Escolher outra sala');
    home.type = 'button';
    home.addEventListener('click', goHome);
    row.append(replay, home);
    resultContent.append(row);
  }

  document.addEventListener('click', (event) => {
    const duel = event.target.closest?.('[data-room="duel"]');
    const party = event.target.closest?.('[data-room="party"]');
    if (duel || party) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (duel) renderDuelSetup();
      else renderPartySetup();
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
      if (window.confirm('Sair da partida atual?')) goHome();
    }
  }, true);
}
