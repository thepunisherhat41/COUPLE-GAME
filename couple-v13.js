const QR_MODULE_URL = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';
const DUO_HASH = '#duo=';

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
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

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = secureRandomIndex(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomId() {
  const bytes = new Uint8Array(9);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function encodePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePayload(value) {
  try {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function payloadFromText(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const markerIndex = text.indexOf(DUO_HASH);
  const encoded = markerIndex >= 0 ? text.slice(markerIndex + DUO_HASH.length) : text.replace(/^duo:/i, '');
  return decodePayload(encoded.split(/[?&\s]/)[0]);
}

function payloadUrl(payload) {
  const base = `${location.origin}${location.pathname}${location.search}`;
  return `${base}${DUO_HASH}${encodePayload(payload)}`;
}

function haptic(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch {}
}

function modalShell(className = '') {
  const overlay = create('div', `v13-overlay ${className}`.trim());
  const modal = create('section', 'v13-modal');
  const close = create('button', 'v13-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar');
  close.addEventListener('click', () => overlay.remove());
  modal.append(close);
  overlay.append(modal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
  document.body.append(overlay);
  return { overlay, modal, close };
}

function addInput(label, placeholder = '') {
  const wrap = create('label', 'v13-field');
  wrap.append(create('span', '', label));
  const input = document.createElement('input');
  input.className = 'input';
  input.maxLength = 28;
  input.placeholder = placeholder;
  wrap.append(input);
  return { wrap, input };
}

function addTextarea(label, placeholder = '') {
  const wrap = create('label', 'v13-field');
  wrap.append(create('span', '', label));
  const textarea = document.createElement('textarea');
  textarea.className = 'v13-textarea';
  textarea.rows = 5;
  textarea.maxLength = 700;
  textarea.placeholder = placeholder;
  wrap.append(textarea);
  return { wrap, textarea };
}

function setViewBody(modal, nodes) {
  const close = modal.querySelector('.v13-close');
  modal.replaceChildren(close, ...nodes);
}

async function renderQr(container, text) {
  container.replaceChildren();
  const canvas = document.createElement('canvas');
  canvas.className = 'v13-qr-canvas';
  container.append(canvas);
  try {
    const mod = await import(QR_MODULE_URL);
    const QR = mod.default || mod;
    await QR.toCanvas(canvas, text, { width: 280, margin: 2, errorCorrectionLevel: 'M' });
    return true;
  } catch {
    container.replaceChildren(create('p', 'v13-qr-fallback', 'Não consegui desenhar o QR neste navegador. Use “Copiar link” abaixo.'));
    return false;
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function chooseHistoryDeck(coupleQuestions) {
  const used = new Set();
  const chapters = [
    { title: 'O começo', emoji: '✨', description: 'lembranças, primeiras impressões e descobertas', match: (q) => q.intensity === 'leve' && /Memórias|Descobertas/i.test(q.category) },
    { title: 'Nós dois', emoji: '💞', description: 'cumplicidade, carinho e o jeito de vocês', match: (q) => q.intensity === 'leve' && !/Memórias|Descobertas/i.test(q.category) },
    { title: 'Por dentro', emoji: '🌙', description: 'o que normalmente fica por trás das respostas rápidas', match: (q) => q.intensity === 'profundo' && /Vulnerabilidade|Identidade|Conexão|Cuidado|Segurança|Amor/i.test(q.category) },
    { title: 'Daqui pra frente', emoji: '🛤️', description: 'sonhos, escolhas e a vida que vocês querem construir', match: (q) => q.intensity === 'profundo' && /Futuro|Valores|Crescimento|Prioridades|Sonhos/i.test(q.category) },
    { title: 'A carta que fica', emoji: '💌', description: 'uma mistura final para terminar com algo que vale guardar', match: (q) => q.intensity === 'leve' || q.intensity === 'profundo' }
  ];

  return chapters.map((chapter) => {
    const preferred = shuffle(coupleQuestions.filter((q) => chapter.match(q) && !used.has(q.id)));
    const fallback = shuffle(coupleQuestions.filter((q) => (q.intensity === 'leve' || q.intensity === 'profundo') && !used.has(q.id)));
    const selected = [...preferred, ...fallback.filter((q) => !preferred.some((item) => item.id === q.id))].slice(0, 4);
    selected.forEach((q) => used.add(q.id));
    return { ...chapter, cards: selected };
  });
}

function storyMode(coupleQuestions) {
  const { overlay, modal } = modalShell('v13-story-overlay');
  const p1 = addInput('Pessoa 1', 'Nome');
  const p2 = addInput('Pessoa 2', 'Nome do par');
  const start = create('button', 'primary-button', 'Começar nossa história →');
  start.type = 'button';
  setViewBody(modal, [
    create('p', 'kicker', '📖 MODO HISTÓRIA'),
    create('h1', '', 'Uma sessão com começo, meio e fim.'),
    create('p', 'v13-lead', '20 cartas divididas em 5 capítulos. O clima começa leve, entra em profundidade e termina com uma carta para guardar.'),
    create('div', 'v13-name-grid'),
    start
  ]);
  const grid = modal.querySelector('.v13-name-grid');
  grid.append(p1.wrap, p2.wrap);

  start.addEventListener('click', () => {
    const names = [normalize(p1.input.value) || 'Pessoa 1', normalize(p2.input.value) || 'Pessoa 2'];
    const chapters = chooseHistoryDeck(coupleQuestions);
    let chapterIndex = 0;
    let cardIndex = 0;
    let swapped = 0;

    function renderChapterIntro() {
      const chapter = chapters[chapterIndex];
      const next = create('button', 'primary-button', `Entrar no capítulo ${chapterIndex + 1} →`);
      next.type = 'button';
      next.addEventListener('click', renderCard);
      setViewBody(modal, [
        create('div', 'v13-big-emoji', chapter.emoji),
        create('p', 'kicker', `CAPÍTULO ${chapterIndex + 1} DE 5`),
        create('h1', '', chapter.title),
        create('p', 'v13-lead', chapter.description),
        next
      ]);
      haptic(16);
    }

    function finish() {
      const summary = create('div', 'v13-summary-grid');
      [['20', 'cartas'], ['5', 'capítulos'], [String(swapped), 'trocas']].forEach(([value, label]) => {
        const item = create('div', 'v13-summary-item');
        item.append(create('strong', '', value), create('span', '', label));
        summary.append(item);
      });
      const replay = create('button', 'primary-button', 'Jogar outra história');
      replay.type = 'button';
      replay.addEventListener('click', () => { overlay.remove(); storyMode(coupleQuestions); });
      const done = create('button', 'ghost-button', 'Voltar ao início');
      done.type = 'button';
      done.addEventListener('click', () => overlay.remove());
      setViewBody(modal, [
        create('div', 'v13-big-emoji', '💞'),
        create('p', 'kicker', 'HISTÓRIA CONCLUÍDA'),
        create('h1', '', `${names[0]} + ${names[1]}`),
        create('p', 'v13-lead', 'Vocês atravessaram a história inteira. A melhor parte agora é continuar a conversa sem o jogo mandar.'),
        summary,
        create('div', 'button-row')
      ]);
      modal.querySelector('.button-row').append(replay, done);
    }

    function advance() {
      if (cardIndex < 3) {
        cardIndex += 1;
        renderCard();
        return;
      }
      if (chapterIndex >= chapters.length - 1) {
        finish();
        return;
      }
      chapterIndex += 1;
      cardIndex = 0;
      renderChapterIntro();
    }

    function renderCard() {
      const chapter = chapters[chapterIndex];
      const question = chapter.cards[cardIndex];
      const card = create('article', 'v13-story-card');
      const meta = create('div', 'question-meta');
      meta.append(create('span', 'category-chip', question.category), create('span', 'badge', `${chapter.emoji} ${chapter.title}`));
      card.append(
        meta,
        create('p', 'v13-story-turn', `${names[(chapterIndex + cardIndex) % 2]} responde primeiro`),
        create('h2', 'v13-story-question', question.text)
      );
      const actions = create('div', 'question-actions');
      const swap = create('button', 'ghost-button', 'Trocar carta');
      swap.type = 'button';
      swap.addEventListener('click', () => {
        const candidates = shuffle(coupleQuestions.filter((q) => (q.intensity === question.intensity) && !chapters.some((ch) => ch.cards.includes(q))));
        if (candidates[0]) {
          chapters[chapterIndex].cards[cardIndex] = candidates[0];
          swapped += 1;
          renderCard();
        }
      });
      const next = create('button', 'primary-button', chapterIndex === 4 && cardIndex === 3 ? 'Encerrar história →' : 'Próxima carta →');
      next.type = 'button';
      next.addEventListener('click', advance);
      actions.append(swap, next);
      card.append(actions);
      setViewBody(modal, [
        create('p', 'kicker', `CAPÍTULO ${chapterIndex + 1}/5 · CARTA ${cardIndex + 1}/4`),
        card,
        create('div', 'v13-story-progress')
      ]);
      const progress = modal.querySelector('.v13-story-progress');
      const fill = create('span');
      fill.style.width = `${(((chapterIndex * 4) + cardIndex + 1) / 20) * 100}%`;
      progress.append(fill);
      haptic(8);
    }

    renderChapterIntro();
  });
}

function knowledgeMode(knowledgeQuestions) {
  const { overlay, modal } = modalShell('v13-knowledge-overlay');
  const p1 = addInput('Pessoa 1', 'Nome');
  const p2 = addInput('Pessoa 2', 'Nome do par');
  const roundsField = create('div', 'v13-choice-row');
  [10, 20].forEach((count, index) => {
    const button = create('button', `v13-choice-button${index === 0 ? ' is-selected' : ''}`, `${count} rodadas`);
    button.type = 'button';
    button.dataset.rounds = String(count);
    button.addEventListener('click', () => {
      roundsField.querySelectorAll('button').forEach((item) => item.classList.toggle('is-selected', item === button));
    });
    roundsField.append(button);
  });
  const start = create('button', 'primary-button', 'Começar desafio →');
  start.type = 'button';
  setViewBody(modal, [
    create('p', 'kicker', '🎯 QUANTO VOCÊ ME CONHECE?'),
    create('h1', '', 'Um responde. O outro tenta adivinhar.'),
    create('p', 'v13-lead', 'As respostas ficam escondidas até a revelação. Quem respondeu decide se foi acerto, quase ou erro.'),
    create('div', 'v13-name-grid'),
    create('span', 'form-label', 'Tamanho da partida'),
    roundsField,
    start
  ]);
  modal.querySelector('.v13-name-grid').append(p1.wrap, p2.wrap);

  start.addEventListener('click', () => {
    const names = [normalize(p1.input.value) || 'Pessoa 1', normalize(p2.input.value) || 'Pessoa 2'];
    const rounds = Number(roundsField.querySelector('.is-selected')?.dataset.rounds) || 10;
    const deck = shuffle(knowledgeQuestions).slice(0, rounds);
    const scores = [0, 0];
    let index = 0;
    let ownerAnswer = '';
    let guess = '';

    function scoreboard() {
      const box = create('div', 'v13-scoreboard');
      names.forEach((name, player) => {
        const item = create('div', 'v13-score-item');
        item.append(create('span', '', name), create('strong', '', `${scores[player]} pts`));
        box.append(item);
      });
      return box;
    }

    function finish() {
      const winner = scores[0] === scores[1] ? 'Empate bonito 😌' : `${names[scores[0] > scores[1] ? 0 : 1]} conhece melhor hoje 🏆`;
      const replay = create('button', 'primary-button', 'Jogar de novo');
      replay.type = 'button';
      replay.addEventListener('click', () => { overlay.remove(); knowledgeMode(knowledgeQuestions); });
      const done = create('button', 'ghost-button', 'Voltar');
      done.type = 'button';
      done.addEventListener('click', () => overlay.remove());
      setViewBody(modal, [
        create('div', 'v13-big-emoji', '🏆'),
        create('p', 'kicker', 'PLACAR FINAL'),
        create('h1', '', winner),
        scoreboard(),
        create('div', 'button-row')
      ]);
      modal.querySelector('.button-row').append(replay, done);
    }

    function nextRound() {
      index += 1;
      ownerAnswer = '';
      guess = '';
      if (index >= rounds) finish();
      else ownerStep();
    }

    function revealStep() {
      const owner = index % 2;
      const guesser = (owner + 1) % 2;
      const resultGrid = create('div', 'v13-reveal-grid');
      const answerCard = create('article', 'v13-answer-card');
      answerCard.append(create('span', '', `${names[owner]} respondeu`), create('p', '', ownerAnswer));
      const guessCard = create('article', 'v13-answer-card');
      guessCard.append(create('span', '', `${names[guesser]} apostou`), create('p', '', guess));
      resultGrid.append(answerCard, guessCard);
      const decisions = create('div', 'v13-score-actions');
      [
        ['🎯 Acertou', 2],
        ['🤏 Quase', 1],
        ['❌ Não foi', 0]
      ].forEach(([label, points]) => {
        const button = create('button', points === 2 ? 'primary-button' : points === 1 ? 'secondary-button' : 'ghost-button', label);
        button.type = 'button';
        button.addEventListener('click', () => {
          scores[guesser] += points;
          haptic(points === 2 ? [12, 20, 12] : 8);
          nextRound();
        });
        decisions.append(button);
      });
      setViewBody(modal, [
        create('p', 'kicker', `RODADA ${index + 1} DE ${rounds}`),
        create('h2', '', deck[index].prompt),
        scoreboard(),
        resultGrid,
        create('p', 'v13-helper', `${names[owner]} decide o resultado:`),
        decisions
      ]);
    }

    function guessStep() {
      const owner = index % 2;
      const guesser = (owner + 1) % 2;
      const field = addTextarea(`${names[guesser]}, qual foi a resposta de ${names[owner]}?`, 'Escreva seu palpite…');
      const reveal = create('button', 'primary-button', 'Revelar as duas respostas →');
      reveal.type = 'button';
      reveal.addEventListener('click', () => {
        guess = normalize(field.textarea.value);
        if (!guess) return field.textarea.focus();
        revealStep();
      });
      setViewBody(modal, [
        create('p', 'kicker', `RODADA ${index + 1} DE ${rounds}`),
        create('div', 'v13-big-emoji', '🙈'),
        create('h2', '', `${names[guesser]}, sua vez de adivinhar.`),
        create('p', 'v13-secret-prompt', deck[index].prompt),
        field.wrap,
        reveal
      ]);
      field.textarea.focus();
    }

    function handoffStep() {
      const guesser = ((index % 2) + 1) % 2;
      const continueButton = create('button', 'primary-button', `Sou ${names[guesser]} →`);
      continueButton.type = 'button';
      continueButton.addEventListener('click', guessStep);
      setViewBody(modal, [
        create('div', 'v13-big-emoji', '📱'),
        create('p', 'kicker', 'PASSE O CELULAR'),
        create('h1', '', `Agora é com ${names[guesser]}.`),
        create('p', 'v13-lead', 'A resposta ficou escondida. Entregue o aparelho sem voltar a tela.'),
        continueButton
      ]);
      haptic(14);
    }

    function ownerStep() {
      const owner = index % 2;
      const field = addTextarea(`${names[owner]}, responda sobre você`, 'Sua resposta fica escondida…');
      const save = create('button', 'primary-button', 'Guardar resposta →');
      save.type = 'button';
      save.addEventListener('click', () => {
        ownerAnswer = normalize(field.textarea.value);
        if (!ownerAnswer) return field.textarea.focus();
        handoffStep();
      });
      setViewBody(modal, [
        create('p', 'kicker', `RODADA ${index + 1} DE ${rounds}`),
        scoreboard(),
        create('span', 'badge', deck[index].category),
        create('h2', 'v13-knowledge-question', deck[index].prompt),
        field.wrap,
        save
      ]);
      field.textarea.focus();
    }

    ownerStep();
  });
}

function duoQrMode(coupleQuestions) {
  const { modal } = modalShell('v13-duo-overlay');
  const host = addInput('Seu nome', 'Quem está criando a rodada');
  const partner = addInput('Nome do par', 'Quem vai responder no outro celular');
  const start = create('button', 'primary-button', 'Criar rodada QR →');
  start.type = 'button';
  setViewBody(modal, [
    create('p', 'kicker', '📲 DUO QR'),
    create('h1', '', 'Dois celulares. Nenhuma conta.'),
    create('p', 'v13-lead', 'O convite e a resposta viajam no próprio QR usando o fragmento do link. O conteúdo não é enviado para a Vercel.'),
    create('div', 'v13-name-grid'),
    start
  ]);
  modal.querySelector('.v13-name-grid').append(host.wrap, partner.wrap);

  start.addEventListener('click', () => {
    const names = [normalize(host.input.value) || 'Pessoa 1', normalize(partner.input.value) || 'Pessoa 2'];
    const pool = coupleQuestions.filter((q) => (q.intensity === 'leve' || q.intensity === 'profundo') && q.type !== 'challenge');
    const question = pool[secureRandomIndex(pool.length)];
    const sid = randomId();
    const payload = {
      v: 1,
      type: 'invite',
      sid,
      host: names[0],
      partner: names[1],
      q: { id: question.id, text: question.text, category: question.category, intensity: question.intensity }
    };
    renderHostInvite(modal, payload, coupleQuestions);
  });
}

function renderHostInvite(modal, payload, coupleQuestions) {
  const url = payloadUrl(payload);
  const qrWrap = create('div', 'v13-qr-wrap');
  const copy = create('button', 'secondary-button', 'Copiar link do convite');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    const ok = await copyText(url);
    copy.textContent = ok ? '✓ Link copiado' : 'Não foi possível copiar';
  });
  const scan = create('button', 'primary-button', '📷 Escanear resposta');
  scan.type = 'button';
  scan.addEventListener('click', () => openScanner(payload.sid, (response) => renderDuoResponse(modal, payload, response, coupleQuestions)));
  const manual = create('button', 'ghost-button', 'Colar resposta manualmente');
  manual.type = 'button';
  manual.addEventListener('click', () => openManualImport(payload.sid, (response) => renderDuoResponse(modal, payload, response, coupleQuestions)));
  setViewBody(modal, [
    create('p', 'kicker', '📲 DUO QR · HOST'),
    create('h2', '', `${payload.partner} escaneia este QR`),
    create('p', 'v13-secret-prompt', payload.q.text),
    qrWrap,
    create('p', 'v13-helper', 'Depois que a outra pessoa responder, ela verá um QR de resposta. Escaneie esse QR aqui.'),
    create('div', 'button-row')
  ]);
  modal.querySelector('.button-row').append(scan, copy, manual);
  renderQr(qrWrap, url);
}

function renderDuoResponse(modal, invite, response, coupleQuestions) {
  const next = create('button', 'primary-button', 'Criar próxima rodada →');
  next.type = 'button';
  next.addEventListener('click', () => {
    const pool = coupleQuestions.filter((q) => (q.intensity === 'leve' || q.intensity === 'profundo') && q.id !== invite.q.id && q.type !== 'challenge');
    const question = pool[secureRandomIndex(pool.length)];
    const payload = {
      v: 1,
      type: 'invite',
      sid: randomId(),
      host: invite.host,
      partner: invite.partner,
      q: { id: question.id, text: question.text, category: question.category, intensity: question.intensity }
    };
    renderHostInvite(modal, payload, coupleQuestions);
  });
  setViewBody(modal, [
    create('p', 'kicker', '✨ RESPOSTA RECEBIDA'),
    create('span', 'badge', invite.q.category),
    create('h2', '', invite.q.text),
    create('article', 'v13-duo-answer'),
    next
  ]);
  const answer = modal.querySelector('.v13-duo-answer');
  answer.append(create('strong', '', response.from || invite.partner), create('p', '', response.answer || '—'));
  haptic([16, 24, 16]);
}

function openManualImport(expectedSid, onResult) {
  const { overlay, modal } = modalShell('v13-manual-overlay');
  const field = addTextarea('Cole aqui o link ou código da resposta', 'https://...#duo=...');
  const importButton = create('button', 'primary-button', 'Importar resposta');
  importButton.type = 'button';
  importButton.addEventListener('click', () => {
    const payload = payloadFromText(field.textarea.value);
    if (!payload || payload.type !== 'response' || payload.sid !== expectedSid) {
      field.textarea.classList.add('is-error');
      return;
    }
    overlay.remove();
    onResult(payload);
  });
  modal.append(create('p', 'kicker', 'IMPORTAR RESPOSTA'), field.wrap, importButton);
}

async function openScanner(expectedSid, onResult) {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
    openManualImport(expectedSid, onResult);
    return;
  }
  const { overlay, modal } = modalShell('v13-scanner-overlay');
  const video = document.createElement('video');
  video.className = 'v13-scanner-video';
  video.playsInline = true;
  video.muted = true;
  modal.append(create('p', 'kicker', '📷 LEITOR DE QR'), create('h2', '', 'Aponte para o QR de resposta'), video);
  let stream = null;
  let stopped = false;
  const stop = () => {
    stopped = true;
    stream?.getTracks().forEach((track) => track.stop());
  };
  overlay.addEventListener('click', (event) => { if (event.target === overlay) stop(); });
  modal.querySelector('.v13-close').addEventListener('click', stop);
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = stream;
    await video.play();
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    while (!stopped && overlay.isConnected) {
      const codes = await detector.detect(video).catch(() => []);
      const raw = codes[0]?.rawValue;
      if (raw) {
        const payload = payloadFromText(raw);
        if (payload?.type === 'response' && payload.sid === expectedSid) {
          stop();
          overlay.remove();
          onResult(payload);
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  } catch {
    stop();
    overlay.remove();
    openManualImport(expectedSid, onResult);
  }
}

function renderGuestInvite(payload) {
  const { modal } = modalShell('v13-duo-guest-overlay');
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  const field = addTextarea(`${payload.partner}, sua resposta`, 'Escreva sem mostrar ao outro celular…');
  const send = create('button', 'primary-button', 'Gerar QR de resposta →');
  send.type = 'button';
  setViewBody(modal, [
    create('p', 'kicker', '📲 DUO QR · CONVIDADO'),
    create('span', 'badge', payload.q?.category || 'Pergunta'),
    create('h2', '', payload.q?.text || 'Pergunta do casal'),
    field.wrap,
    send
  ]);
  send.addEventListener('click', () => {
    const answer = normalize(field.textarea.value);
    if (!answer) return field.textarea.focus();
    const response = { v: 1, type: 'response', sid: payload.sid, from: payload.partner || 'Pessoa 2', answer };
    const url = payloadUrl(response);
    const qrWrap = create('div', 'v13-qr-wrap');
    const copy = create('button', 'secondary-button', 'Copiar resposta');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      const ok = await copyText(url);
      copy.textContent = ok ? '✓ Copiado' : 'Não foi possível copiar';
    });
    setViewBody(modal, [
      create('div', 'v13-big-emoji', '✅'),
      create('p', 'kicker', 'RESPOSTA PRONTA'),
      create('h2', '', `Mostre este QR para ${payload.host}.`),
      create('p', 'v13-helper', 'O texto da sua resposta está codificado no QR e não foi enviado para um servidor do Couple Game.'),
      qrWrap,
      copy
    ]);
    renderQr(qrWrap, url);
    haptic([12, 20, 12]);
  });
}

export function installCoupleV13(coupleQuestions, knowledgeQuestions) {
  if (globalThis.__coupleV13Installed) return;
  globalThis.__coupleV13Installed = true;
  const home = document.querySelector('#home-view');
  if (!home) return;

  const section = create('section', 'v13-experiences');
  section.id = 'v13-experiences';
  section.append(
    create('p', 'eyebrow', 'NOVAS EXPERIÊNCIAS'),
    create('h2', '', 'Mais do que responder cartas.'),
    create('p', 'v13-section-copy', 'Três modos para transformar a noite em uma experiência com começo, disputa e dois celulares.')
  );

  const grid = create('div', 'v13-experience-grid');
  const modes = [
    {
      icon: '📖',
      title: 'Modo História',
      text: '20 cartas em 5 capítulos: começo, cumplicidade, profundidade, futuro e uma última carta.',
      action: () => storyMode(coupleQuestions),
      button: 'Viver nossa história →'
    },
    {
      icon: '🎯',
      title: 'Quanto você me conhece?',
      text: 'Um responde em segredo, o outro tenta adivinhar e o próprio casal decide a pontuação.',
      action: () => knowledgeMode(knowledgeQuestions),
      button: 'Começar disputa →'
    },
    {
      icon: '📲',
      title: 'Duo QR',
      text: 'Mande a pergunta para outro celular por QR e receba a resposta de volta sem criar conta.',
      action: () => duoQrMode(coupleQuestions),
      button: 'Usar dois celulares →'
    }
  ];

  modes.forEach((mode) => {
    const card = create('article', 'v13-experience-card');
    card.append(create('span', 'v13-experience-icon', mode.icon), create('h3', '', mode.title), create('p', '', mode.text));
    const button = create('button', 'secondary-button', mode.button);
    button.type = 'button';
    button.addEventListener('click', mode.action);
    card.append(button);
    grid.append(card);
  });
  section.append(grid);

  const anchor = home.querySelector('#v12-home-experience') || home.querySelector('.local-stats');
  if (anchor) anchor.insertAdjacentElement('afterend', section);
  else home.append(section);

  if (location.hash.startsWith(DUO_HASH)) {
    const payload = payloadFromText(location.href);
    if (payload?.type === 'invite' && payload.sid && payload.q?.text) queueMicrotask(() => renderGuestInvite(payload));
  }
}
