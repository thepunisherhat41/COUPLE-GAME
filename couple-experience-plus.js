const FAVORITES_KEY = 'couple-game:favorites:v2';
const SOUND_KEY = 'couple-game:sound-enabled:v1';
const DURATION_PRESETS = Object.freeze([
  { minutes: 10, label: '10 min', regular: 7, hot: 7, sex: 10 },
  { minutes: 20, label: '20 min', regular: 14, hot: 14, sex: 20 },
  { minutes: 40, label: '40 min', regular: 30, hot: 30, sex: 40 }
]);
const REACTIONS = ['❤️', '😂', '😳', '🔥'];

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function readFavorites() {
  try {
    const parsed = safeParse(localStorage.getItem(FAVORITES_KEY) || '[]', []);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeFavorites(items) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(items.slice(-200))); } catch {}
}

function soundEnabled() {
  try { return localStorage.getItem(SOUND_KEY) === 'true'; } catch { return false; }
}

function setSoundEnabled(value) {
  try { localStorage.setItem(SOUND_KEY, String(Boolean(value))); } catch {}
}

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

function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayNumber(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function chooseDailyQuestion(coupleQuestions, date = new Date()) {
  const intensity = dayNumber(date) % 2 === 0 ? 'leve' : 'profundo';
  const pool = coupleQuestions.filter((question) => question.intensity === intensity && question.type !== 'challenge');
  if (!pool.length) return null;
  const seed = Number(localDayKey(date).replaceAll('-', '')) || dayNumber(date);
  return pool[seed % pool.length];
}

function normalize(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

function vibrate(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}

let audioContext = null;
function playTone(kind = 'tap') {
  if (!soundEnabled()) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const tones = {
      tap: [440, 0.035, 0.035],
      reveal: [620, 0.06, 0.055],
      favorite: [760, 0.08, 0.05],
      success: [880, 0.12, 0.065],
      dice: [520, 0.07, 0.05]
    };
    const [frequency, duration, volume] = tones[kind] || tones.tap;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {}
}

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function closestOption(select, desired) {
  const values = [...select.options].map((option) => Number(option.value)).filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((best, value) => Math.abs(value - desired) < Math.abs(best - desired) ? value : best, values[0]);
}

function selectedSetupMode() {
  const intensity = document.querySelector('[data-couple-intensity].is-selected')?.dataset?.coupleIntensity || 'leve';
  const hotMode = document.querySelector('[data-hot-mode].is-selected')?.dataset?.hotMode || null;
  return { intensity, hotMode };
}

function presetTarget(preset, intensity, hotMode) {
  if (intensity === 'quente' && hotMode === 'sexo') return preset.sex;
  if (intensity === 'quente') return preset.hot;
  return preset.regular;
}

function modalShell(className = '') {
  const overlay = create('div', `v12-modal-overlay ${className}`.trim());
  const modal = create('section', 'v12-modal');
  overlay.append(modal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
  document.body.append(overlay);
  return { overlay, modal };
}

function shareText(text) {
  if (navigator.share) return navigator.share({ text }).catch(() => {});
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return Promise.resolve();
  }
  return Promise.resolve();
}

export function installCoupleExperiencePlus(coupleQuestions) {
  if (globalThis.__coupleExperiencePlusInstalled) return;
  globalThis.__coupleExperiencePlusInstalled = true;

  const byText = new Map(coupleQuestions.map((question) => [normalize(question.text), question]));
  const setupContent = document.querySelector('#setup-content');
  const gameContent = document.querySelector('#game-content');
  const resultContent = document.querySelector('#result-content');
  const homeView = document.querySelector('#home-view');
  const headerActions = document.querySelector('.header-actions');
  if (!setupContent || !gameContent || !resultContent || !homeView) return;

  let pendingSession = null;
  let session = null;
  let lastQuestionId = null;
  let recentCategories = [];
  let autoSwapDepth = 0;
  let internalAutoSwap = false;

  function freshSession(config = {}) {
    return {
      config,
      startedAt: Date.now(),
      cardsSeen: 0,
      completed: 0,
      swaps: 0,
      secretReveals: 0,
      reactions: Object.fromEntries(REACTIONS.map((reaction) => [reaction, 0])),
      favoritesAdded: 0,
      categories: new Set(),
      reactedByCard: new Map(),
      questionIds: new Set()
    };
  }

  function ensureSession() {
    if (!session) session = freshSession(pendingSession || {});
    return session;
  }

  function installSoundToggle() {
    if (!headerActions || headerActions.querySelector('#couple-sound-toggle')) return;
    const button = create('button', 'icon-button', soundEnabled() ? '🔊' : '🔇');
    button.id = 'couple-sound-toggle';
    button.type = 'button';
    button.title = 'Som do jogo';
    button.setAttribute('aria-label', 'Alternar sons do jogo');
    button.addEventListener('click', () => {
      const next = !soundEnabled();
      setSoundEnabled(next);
      button.textContent = next ? '🔊' : '🔇';
      vibrate(10);
      if (next) playTone('reveal');
    });
    headerActions.prepend(button);
  }

  function renderFavoritesModal() {
    const favorites = readFavorites();
    const { modal } = modalShell('v12-favorites-modal');
    const close = create('button', 'v12-modal-close', '×');
    close.type = 'button';
    close.addEventListener('click', () => modal.parentElement.remove());
    modal.append(close, create('p', 'kicker', '⭐ FAVORITAS'), create('h2', '', 'As cartas que vocês quiseram guardar'));
    if (!favorites.length) {
      modal.append(create('p', 'v12-empty', 'Nenhuma favorita ainda. Durante uma sessão, toque em ☆ para guardar uma carta.'));
      return;
    }
    const list = create('div', 'v12-favorite-list');
    favorites.slice().reverse().forEach((favorite) => {
      const item = create('article', 'v12-favorite-item');
      item.append(create('span', 'category-chip', favorite.category || 'Carta'), create('p', '', favorite.text));
      const remove = create('button', 'ghost-button', 'Remover');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        writeFavorites(readFavorites().filter((entry) => entry.id !== favorite.id));
        modal.parentElement.remove();
        renderFavoritesModal();
        renderHomeExperience();
      });
      item.append(remove);
      list.append(item);
    });
    modal.append(list);
  }

  function renderHomeExperience() {
    let block = homeView.querySelector('#v12-home-experience');
    if (block) block.remove();
    block = create('section', 'v12-home-experience');
    block.id = 'v12-home-experience';

    const daily = chooseDailyQuestion(coupleQuestions);
    const dailyCard = create('article', 'v12-daily-card');
    dailyCard.append(create('p', 'kicker', '💌 PERGUNTA DO DIA'), create('h2', '', 'Uma carta nova para hoje'));
    if (daily) {
      const badge = create('span', 'badge', daily.intensity === 'leve' ? '🌷 Romântico' : '🌙 Profundo');
      const text = create('p', 'v12-daily-question is-hidden', daily.text);
      const actions = create('div', 'button-row');
      const reveal = create('button', 'primary-button', 'Revelar pergunta →');
      reveal.type = 'button';
      reveal.addEventListener('click', () => {
        text.classList.remove('is-hidden');
        reveal.hidden = true;
        share.hidden = false;
        vibrate(18);
        playTone('reveal');
      });
      const share = create('button', 'secondary-button', 'Compartilhar');
      share.type = 'button';
      share.hidden = true;
      share.addEventListener('click', () => shareText(`💌 Pergunta do dia — Couple Game\n\n${daily.text}`));
      actions.append(reveal, share);
      dailyCard.append(badge, text, actions);
    }

    const favoritesCard = create('article', 'v12-favorites-card');
    const favorites = readFavorites();
    favoritesCard.append(
      create('p', 'kicker', '⭐ NOSSA COLEÇÃO'),
      create('strong', 'v12-favorite-count', String(favorites.length)),
      create('span', '', favorites.length === 1 ? 'carta favorita' : 'cartas favoritas')
    );
    const openFavorites = create('button', 'secondary-button', favorites.length ? 'Ver favoritas' : 'Como funciona');
    openFavorites.type = 'button';
    openFavorites.addEventListener('click', renderFavoritesModal);
    favoritesCard.append(openFavorites);

    block.append(dailyCard, favoritesCard);
    const localStats = homeView.querySelector('.local-stats');
    if (localStats) localStats.insertAdjacentElement('afterend', block);
    else homeView.append(block);
  }

  function injectDurationPresets() {
    const select = setupContent.querySelector('select[id^="couple-count-"]');
    if (!select) return;
    const field = select.closest('.field-full');
    if (!field) return;
    let box = setupContent.querySelector('#v12-duration-presets');
    if (!box) {
      box = create('div', 'field-full v12-duration-field');
      box.id = 'v12-duration-presets';
      box.append(create('span', 'form-label', 'Quanto tempo vocês têm?'));
      const row = create('div', 'v12-duration-row');
      DURATION_PRESETS.forEach((preset) => {
        const button = create('button', 'v12-duration-button', preset.label);
        button.type = 'button';
        button.dataset.minutes = String(preset.minutes);
        button.addEventListener('click', () => {
          const currentSelect = setupContent.querySelector('select[id^="couple-count-"]');
          if (!currentSelect) return;
          const { intensity, hotMode } = selectedSetupMode();
          const target = presetTarget(preset, intensity, hotMode);
          const resolved = closestOption(currentSelect, target);
          if (resolved !== null) currentSelect.value = String(resolved);
          row.querySelectorAll('.v12-duration-button').forEach((item) => item.classList.toggle('is-selected', item === button));
          currentSelect.dispatchEvent(new Event('change', { bubbles: true }));
          vibrate(8);
        });
        row.append(button);
      });
      const free = create('button', 'v12-duration-button', 'Livre');
      free.type = 'button';
      free.addEventListener('click', () => row.querySelectorAll('.v12-duration-button').forEach((item) => item.classList.toggle('is-selected', item === free)));
      row.append(free);
      box.append(row, create('small', 'v12-duration-help', 'O jogo converte o tempo em uma quantidade de cartas adequada ao modo escolhido.'));
      field.insertAdjacentElement('beforebegin', box);
    }
  }

  function isRomanticOrDeep(question) {
    return question?.intensity === 'leve' || question?.intensity === 'profundo';
  }

  function favoriteId(question) {
    return question?.id || `text:${normalize(question?.text)}`;
  }

  function toggleFavorite(question, button) {
    const id = favoriteId(question);
    const favorites = readFavorites();
    const exists = favorites.some((item) => item.id === id);
    if (exists) {
      writeFavorites(favorites.filter((item) => item.id !== id));
      button.classList.remove('is-active');
      button.textContent = '☆ Favoritar';
    } else {
      writeFavorites([...favorites, {
        id,
        text: question.text,
        category: question.category,
        intensity: question.intensity,
        savedAt: new Date().toISOString()
      }]);
      button.classList.add('is-active');
      button.textContent = '★ Favorita';
      ensureSession().favoritesAdded += 1;
      vibrate([12, 24, 12]);
      playTone('favorite');
    }
    renderHomeExperience();
  }

  function openSecretAnswers(question, names) {
    const { overlay, modal } = modalShell('v12-secret-modal');
    const answers = ['', ''];
    let step = 0;

    function renderStep() {
      modal.replaceChildren();
      const close = create('button', 'v12-modal-close', '×');
      close.type = 'button';
      close.addEventListener('click', () => overlay.remove());
      modal.append(close, create('p', 'kicker', '🙈 RESPOSTAS SECRETAS'), create('p', 'v12-secret-question', question.text));

      if (step < 2) {
        modal.append(create('h2', '', `${names[step]}, responda sem mostrar.`));
        const textarea = document.createElement('textarea');
        textarea.className = 'v12-secret-input';
        textarea.rows = 5;
        textarea.maxLength = 600;
        textarea.placeholder = 'Escreva sua resposta…';
        textarea.value = answers[step];
        const save = create('button', 'primary-button', step === 0 ? 'Guardar e passar o celular →' : 'Guardar resposta →');
        save.type = 'button';
        save.addEventListener('click', () => {
          answers[step] = textarea.value.trim();
          if (!answers[step]) {
            textarea.focus();
            textarea.classList.add('is-error');
            return;
          }
          step += 1;
          if (step === 1) {
            modal.replaceChildren(close, create('div', 'result-icon', '🙈'), create('h2', '', `Passe o celular para ${names[1]}`), create('p', 'v12-secret-copy', `${names[0]} já respondeu. A resposta continua escondida.`));
            const continueButton = create('button', 'primary-button', `Sou ${names[1]} →`);
            continueButton.type = 'button';
            continueButton.addEventListener('click', renderStep);
            modal.append(continueButton);
          } else {
            renderStep();
          }
          vibrate(12);
        });
        modal.append(textarea, save);
        setTimeout(() => textarea.focus(), 0);
        return;
      }

      modal.append(create('h2', '', 'Hora da revelação ✨'));
      const reveal = create('button', 'primary-button', 'Revelar as duas respostas');
      reveal.type = 'button';
      reveal.addEventListener('click', () => {
        modal.replaceChildren(close, create('p', 'kicker', '✨ REVELADO'), create('p', 'v12-secret-question', question.text));
        const grid = create('div', 'v12-secret-results');
        [0, 1].forEach((index) => {
          const item = create('article', 'v12-secret-result');
          item.append(create('strong', '', names[index]), create('p', '', answers[index]));
          grid.append(item);
        });
        const done = create('button', 'primary-button', 'Voltar para a carta');
        done.type = 'button';
        done.addEventListener('click', () => overlay.remove());
        modal.append(grid, done);
        ensureSession().secretReveals += 1;
        vibrate([20, 30, 20]);
        playTone('reveal');
      });
      modal.append(reveal);
    }

    renderStep();
  }

  function parseNames(card) {
    const text = normalize(card.querySelector('.couple-names')?.textContent);
    const parts = text.split('+').map((value) => value.trim()).filter(Boolean);
    return parts.length >= 2 ? parts.slice(0, 2) : ['Pessoa 1', 'Pessoa 2'];
  }

  function decorateRegularCard(card, question) {
    if (card.dataset.v12Enhanced === 'true') return;
    card.dataset.v12Enhanced = 'true';
    card.classList.add('v12-card-enter');

    const footer = card.querySelector('.question-footer');
    if (!footer) return;

    const tools = create('div', 'v12-card-tools');
    const reactions = create('div', 'v12-reaction-row');
    const currentSession = ensureSession();
    const key = favoriteId(question);
    const selected = currentSession.reactedByCard.get(key) || new Set();

    REACTIONS.forEach((reaction) => {
      const button = create('button', 'v12-reaction-button', reaction);
      button.type = 'button';
      button.title = `Reagir ${reaction}`;
      button.addEventListener('click', () => {
        const reactionSet = currentSession.reactedByCard.get(key) || new Set();
        if (reactionSet.has(reaction)) {
          reactionSet.delete(reaction);
          currentSession.reactions[reaction] = Math.max(0, currentSession.reactions[reaction] - 1);
          button.classList.remove('is-active');
        } else {
          reactionSet.add(reaction);
          currentSession.reactions[reaction] += 1;
          button.classList.add('is-active');
          vibrate(8);
          playTone('tap');
        }
        currentSession.reactedByCard.set(key, reactionSet);
      });
      if (selected.has(reaction)) button.classList.add('is-active');
      reactions.append(button);
    });

    const favorite = create('button', 'v12-favorite-button', '☆ Favoritar');
    favorite.type = 'button';
    if (readFavorites().some((item) => item.id === key)) {
      favorite.classList.add('is-active');
      favorite.textContent = '★ Favorita';
    }
    favorite.addEventListener('click', () => toggleFavorite(question, favorite));

    tools.append(reactions, favorite);

    if (isRomanticOrDeep(question)) {
      const secret = create('button', 'secondary-button v12-secret-button', '🙈 Responder em segredo');
      secret.type = 'button';
      secret.addEventListener('click', () => openSecretAnswers(question, parseNames(card)));
      tools.append(secret);
    }

    footer.insertAdjacentElement('beforebegin', tools);
  }

  function maybeAutoSwap(question, card) {
    if (!isRomanticOrDeep(question)) return false;
    const category = normalize(question.category);
    if (!category || recentCategories.at(-1) !== category || autoSwapDepth >= 4) return false;
    const swap = [...card.querySelectorAll('button')].find((button) => /Trocar carta/i.test(button.textContent || ''));
    if (!swap) return false;
    autoSwapDepth += 1;
    internalAutoSwap = true;
    swap.click();
    queueMicrotask(() => { internalAutoSwap = false; });
    return true;
  }

  function handleQuestionCard() {
    const card = gameContent.querySelector('.question-card');
    const text = normalize(card?.querySelector('.question-text')?.textContent);
    if (!card || !text) return;
    const question = byText.get(text);
    if (!question) return;
    const id = favoriteId(question);
    if (id === lastQuestionId && card.dataset.v12Enhanced === 'true') return;

    if (maybeAutoSwap(question, card)) return;
    autoSwapDepth = 0;
    lastQuestionId = id;
    recentCategories = [...recentCategories.slice(-2), normalize(question.category)];

    const current = ensureSession();
    if (!current.questionIds.has(id)) {
      current.questionIds.add(id);
      current.cardsSeen += 1;
      if (question.category) current.categories.add(question.category);
    }
    decorateRegularCard(card, question);
  }

  function capturePendingSession() {
    const { intensity, hotMode } = selectedSetupMode();
    const names = [...setupContent.querySelectorAll('input[id^="couple-name-"]')].slice(0, 2).map((input, index) => normalize(input.value) || `Pessoa ${index + 1}`);
    const count = Number(setupContent.querySelector('select[id^="couple-count-"]')?.value) || null;
    pendingSession = { intensity, hotMode, names, count };
    session = null;
    lastQuestionId = null;
    recentCategories = [];
  }

  function summaryText(current) {
    const minutes = Math.max(1, Math.round((Date.now() - current.startedAt) / 60000));
    const topReaction = Object.entries(current.reactions).sort((a, b) => b[1] - a[1])[0];
    return {
      minutes,
      topReaction: topReaction?.[1] ? `${topReaction[0]} ${topReaction[1]}x` : '—',
      text: `Couple Game · ${current.completed} concluídas · ${current.categories.size} temas · ${minutes} min · reação ${topReaction?.[1] ? topReaction[0] : '✨'}`
    };
  }

  function appendSummary() {
    if (!session || resultContent.querySelector('#v12-night-summary')) return;
    if (!/SESSÃO CONCLUÍDA/i.test(resultContent.textContent || '')) return;
    const summary = summaryText(session);
    const box = create('section', 'v12-night-summary');
    box.id = 'v12-night-summary';
    box.append(create('p', 'kicker', '✨ RESUMO DA SESSÃO'), create('h2', '', 'A noite de vocês em números'));
    const grid = create('div', 'v12-summary-grid');
    const stats = [
      [session.completed, 'concluídas'],
      [session.categories.size, 'temas'],
      [summary.minutes, 'minutos'],
      [session.secretReveals, 'revelações'],
      [session.swaps, 'trocas'],
      [session.favoritesAdded, 'novas favoritas']
    ];
    stats.forEach(([value, label]) => {
      const stat = create('div', 'v12-summary-stat');
      stat.append(create('strong', '', String(value)), create('span', '', label));
      grid.append(stat);
    });
    const reaction = create('p', 'v12-summary-reaction', `Reação dominante: ${summary.topReaction}`);
    const share = create('button', 'secondary-button', 'Compartilhar resumo');
    share.type = 'button';
    share.addEventListener('click', () => shareText(`✨ ${summary.text}\nSem respostas privadas — só o placar da noite.`));
    box.append(grid, reaction, share);
    resultContent.append(box);
  }

  function installGlobalInteractions() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest?.('button');
      if (!button) return;
      const label = normalize(button.textContent);

      const roomButton = button.closest?.('[data-room]');
      if (roomButton?.dataset?.room && roomButton.dataset.room !== 'couple') { session = null; pendingSession = null; }
      if (/Começar a sessão/i.test(label)) capturePendingSession();
      if (/Entrar no jogo/i.test(label) && pendingSession) session = freshSession(pendingSession);
      if (/Outra sessão/i.test(label)) {
        pendingSession = session?.config || pendingSession;
        session = freshSession(pendingSession || {});
        lastQuestionId = null;
        recentCategories = [];
      }

      if (/Trocar carta|Trocar desafio/i.test(label) && !internalAutoSwap) ensureSession().swaps += 1;
      if (/Próxima carta|Encerrar sessão|CUMPRIDO/i.test(label)) ensureSession().completed += 1;

      if (/REVELAR|Revelar pergunta/i.test(label)) { vibrate(18); playTone('reveal'); }
      else if (/Rolar dado/i.test(label)) { vibrate([8, 16, 8]); playTone('dice'); }
      else if (/CUMPRIDO|concluído/i.test(label)) { vibrate([16, 24, 16]); playTone('success'); }
    }, true);
  }

  const setupObserver = new MutationObserver(() => requestAnimationFrame(injectDurationPresets));
  setupObserver.observe(setupContent, { childList: true, subtree: true });

  const gameObserver = new MutationObserver(() => requestAnimationFrame(handleQuestionCard));
  gameObserver.observe(gameContent, { childList: true, subtree: true });

  const resultObserver = new MutationObserver(() => requestAnimationFrame(appendSummary));
  resultObserver.observe(resultContent, { childList: true, subtree: true });

  installSoundToggle();
  installGlobalInteractions();
  renderHomeExperience();
  injectDurationPresets();
}
