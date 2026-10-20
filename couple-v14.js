const PROFILE_KEY = 'couple-game:profile:v1';
const PROGRESS_KEY = 'couple-game:progress:v1';
const ONBOARDING_KEY = 'couple-game:onboarding:v1';

const ACHIEVEMENTS = [
  { id: 'first-night', icon: '✨', title: 'Primeira noite', description: 'Concluir a primeira experiência.', test: (p) => p.sessions.length >= 1 },
  { id: 'history', icon: '📖', title: 'Nossa história', description: 'Concluir o Modo História.', test: (p) => p.sessions.some((s) => s.mode === 'story') },
  { id: 'mind-reader', icon: '🎯', title: 'Leitor de mente', description: 'Concluir Quanto você me conhece?.', test: (p) => p.sessions.some((s) => s.mode === 'knowledge') },
  { id: 'duo', icon: '📲', title: 'Dois celulares', description: 'Completar uma rodada pelo Duo QR.', test: (p) => p.sessions.some((s) => s.mode === 'duo') },
  { id: 'five', icon: '🔥', title: 'Virou ritual', description: 'Concluir 5 experiências.', test: (p) => p.sessions.length >= 5 },
  { id: 'explorer', icon: '🧭', title: 'Exploradores', description: 'Jogar 4 tipos diferentes de experiência.', test: (p) => new Set(p.sessions.map((s) => s.mode)).size >= 4 },
  { id: 'streak-3', icon: '💞', title: 'Três encontros', description: 'Jogar em 3 dias seguidos.', test: (p) => p.streak >= 3 },
  { id: 'streak-7', icon: '👑', title: 'Semana do casal', description: 'Jogar em 7 dias seguidos.', test: (p) => p.streak >= 7 },
  { id: 'twenty', icon: '🏆', title: 'Veteranos da noite', description: 'Concluir 20 experiências.', test: (p) => p.sessions.length >= 20 }
];

function create(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function cleanName(value, fallback = '') {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 28) || fallback;
}

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayStamp(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 86400000;
}

function readProfile() {
  return readJson(PROFILE_KEY, { names: ['', ''], createdAt: null });
}

function readProgress() {
  const saved = readJson(PROGRESS_KEY, {});
  return {
    xp: Number(saved.xp) || 0,
    sessions: Array.isArray(saved.sessions) ? saved.sessions.slice(-100) : [],
    streak: Number(saved.streak) || 0,
    lastPlayDay: saved.lastPlayDay || null,
    achievements: Array.isArray(saved.achievements) ? saved.achievements : []
  };
}

function levelInfo(xp) {
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
  const floor = (level - 1) ** 2 * 100;
  const ceiling = level ** 2 * 100;
  return {
    level,
    current: xp - floor,
    needed: Math.max(1, ceiling - floor),
    ratio: Math.max(0, Math.min(1, (xp - floor) / Math.max(1, ceiling - floor)))
  };
}

function sessionLabel(mode) {
  return {
    couple: 'Entre Nós',
    story: 'Modo História',
    knowledge: 'Quanto você me conhece?',
    duo: 'Duo QR',
    duel: 'Duelo de Casais',
    party: 'Galera'
  }[mode] || 'Couple Game';
}

function sessionXp(mode) {
  return { story: 40, knowledge: 35, duo: 30, couple: 25, duel: 25, party: 25 }[mode] || 20;
}

function modalShell(className = '') {
  const overlay = create('div', `v14-overlay ${className}`.trim());
  const modal = create('section', 'v14-modal');
  const close = create('button', 'v14-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Fechar');
  close.addEventListener('click', () => overlay.remove());
  modal.append(close);
  overlay.append(modal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
  document.body.append(overlay);
  return { overlay, modal };
}

function launchMode(mode) {
  if (mode === 'couple') {
    document.querySelector('[data-room="couple"]')?.click();
    return;
  }
  const selector = `[data-v13-mode="${mode}"] [data-v13-launch]`;
  const button = document.querySelector(selector);
  if (button) {
    button.click();
    return;
  }
  const text = mode === 'story' ? 'Modo História' : mode === 'knowledge' ? 'Quanto você me conhece?' : 'Duo QR';
  const card = [...document.querySelectorAll('.v13-experience-card')].find((item) => item.textContent?.includes(text));
  card?.querySelector('button')?.click();
}

function recommendedMode(progress) {
  if (!progress.sessions.length) {
    return { mode: 'story', icon: '📖', title: 'Comecem pela história de vocês', copy: 'Uma sessão guiada em capítulos é a melhor porta de entrada para a experiência completa.' };
  }
  const recent = progress.sessions.slice(-6);
  const counts = Object.fromEntries(['story', 'knowledge', 'couple', 'duo'].map((mode) => [
    mode,
    recent.filter((session) => session.mode === mode).length
  ]));
  const mode = Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
  const meta = {
    story: ['📖', 'Hoje pede uma história', 'Passe por memórias, profundidade e futuro em uma sessão com começo, meio e fim.'],
    knowledge: ['🎯', 'Hora de testar a sintonia', 'Um responde em segredo e o outro tenta adivinhar.'],
    couple: ['💞', 'Conversa boa, sem roteiro longo', 'Entrem no Entre Nós e deixem o baralho conduzir a noite.'],
    duo: ['📲', 'Experimentem dois celulares', 'Uma rodada privada por QR muda completamente o ritmo do jogo.']
  }[mode];
  return { mode, icon: meta[0], title: meta[1], copy: meta[2] };
}

function showAchievementToast(achievement) {
  const toast = create('div', 'v14-achievement-toast');
  toast.append(
    create('span', 'v14-achievement-toast-icon', achievement.icon),
    create('div', '', ''),
    create('button', 'v14-achievement-toast-close', '×')
  );
  const copy = toast.children[1];
  copy.append(create('small', '', 'CONQUISTA DESBLOQUEADA'), create('strong', '', achievement.title));
  toast.lastElementChild.addEventListener('click', () => toast.remove());
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 350);
  }, 4200);
  try { navigator.vibrate?.([18, 35, 18]); } catch {}
}

function evaluateAchievements(progress) {
  const unlocked = new Set(progress.achievements);
  const fresh = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!unlocked.has(achievement.id) && achievement.test(progress)) {
      unlocked.add(achievement.id);
      fresh.push(achievement);
    }
  }
  progress.achievements = [...unlocked];
  return fresh;
}

export function installCoupleV14() {
  if (globalThis.__coupleV14Installed) return;
  globalThis.__coupleV14Installed = true;

  const home = document.querySelector('#home-view');
  const resultView = document.querySelector('#result-view');
  if (!home) return;

  let installPrompt = null;
  let activeMode = null;
  let lastRecorded = { mode: null, at: 0 };
  const seenCompletionNodes = new WeakSet();

  function saveProfile(names) {
    const current = readProfile();
    const profile = {
      names: [cleanName(names[0]), cleanName(names[1])],
      createdAt: current.createdAt || new Date().toISOString()
    };
    writeJson(PROFILE_KEY, profile);
    renderDashboard();
    return profile;
  }

  function recordSession(mode) {
    if (!mode) return;
    const now = Date.now();
    if (lastRecorded.mode === mode && now - lastRecorded.at < 15000) return;
    lastRecorded = { mode, at: now };

    const progress = readProgress();
    const day = todayKey();
    if (progress.lastPlayDay !== day) {
      if (progress.lastPlayDay && dayStamp(day) - dayStamp(progress.lastPlayDay) === 1) progress.streak += 1;
      else progress.streak = 1;
      progress.lastPlayDay = day;
    }

    const gain = sessionXp(mode) + Math.min(progress.streak, 7) * 2;
    progress.xp += gain;
    progress.sessions.push({
      mode,
      at: new Date().toISOString(),
      xp: gain
    });
    progress.sessions = progress.sessions.slice(-100);

    const fresh = evaluateAchievements(progress);
    writeJson(PROGRESS_KEY, progress);
    renderDashboard();
    fresh.forEach((achievement, index) => setTimeout(() => showAchievementToast(achievement), index * 900));
  }

  function openProfile() {
    const profile = readProfile();
    const { overlay, modal } = modalShell('v14-profile-overlay');
    modal.append(
      create('p', 'kicker', '💞 PERFIL LOCAL'),
      create('h2', '', 'Quem joga junto?'),
      create('p', 'v14-muted', 'Os nomes ficam somente neste navegador e servem para personalizar a experiência.')
    );
    const grid = create('div', 'v14-profile-grid');
    const inputs = [0, 1].map((index) => {
      const label = create('label', 'v14-field');
      label.append(create('span', '', `Pessoa ${index + 1}`));
      const input = document.createElement('input');
      input.className = 'input';
      input.maxLength = 28;
      input.placeholder = index ? 'Nome do par' : 'Seu nome';
      input.value = profile.names?.[index] || '';
      label.append(input);
      grid.append(label);
      return input;
    });
    const save = create('button', 'primary-button', 'Salvar perfil');
    save.type = 'button';
    save.addEventListener('click', () => {
      saveProfile(inputs.map((input) => input.value));
      overlay.remove();
    });
    modal.append(grid, save);
  }

  function openAchievements() {
    const progress = readProgress();
    const unlocked = new Set(progress.achievements);
    const { modal } = modalShell('v14-achievements-overlay');
    modal.append(
      create('p', 'kicker', '🏆 CONQUISTAS'),
      create('h2', '', `${unlocked.size} de ${ACHIEVEMENTS.length} desbloqueadas`)
    );
    const grid = create('div', 'v14-achievement-grid');
    ACHIEVEMENTS.forEach((achievement) => {
      const card = create('article', `v14-achievement-card${unlocked.has(achievement.id) ? ' is-unlocked' : ''}`);
      card.append(
        create('span', 'v14-achievement-icon', unlocked.has(achievement.id) ? achievement.icon : '🔒'),
        create('strong', '', achievement.title),
        create('p', '', achievement.description)
      );
      grid.append(card);
    });
    modal.append(grid);
  }

  function renderDashboard() {
    home.querySelector('#v14-night-dashboard')?.remove();
    const profile = readProfile();
    const progress = readProgress();
    const level = levelInfo(progress.xp);
    const recommendation = recommendedMode(progress);

    const section = create('section', 'v14-night-dashboard');
    section.id = 'v14-night-dashboard';

    const top = create('div', 'v14-night-top');
    const copy = create('div');
    copy.append(
      create('p', 'eyebrow', 'HOJE À NOITE'),
      create('h2', '', profile.names?.filter(Boolean).length === 2
        ? `${profile.names[0]} + ${profile.names[1]}`
        : 'Uma noite que lembra de vocês.'),
      create('p', 'v14-muted', 'Progresso e preferências ficam só neste aparelho. Respostas íntimas não entram no perfil.')
    );

    const profileButton = create('button', 'secondary-button v14-profile-button', profile.names?.filter(Boolean).length === 2 ? 'Editar perfil' : 'Criar perfil');
    profileButton.type = 'button';
    profileButton.addEventListener('click', openProfile);
    top.append(copy, profileButton);

    const stats = create('div', 'v14-stats');
    [
      [String(level.level), 'nível'],
      [String(progress.streak || 0), 'dias seguidos'],
      [String(progress.sessions.length), 'experiências'],
      [String(progress.achievements.length), 'conquistas']
    ].forEach(([value, label]) => {
      const box = create('div', 'v14-stat');
      box.append(create('strong', '', value), create('span', '', label));
      stats.append(box);
    });

    const xp = create('div', 'v14-xp');
    const xpHead = create('div', 'v14-xp-head');
    xpHead.append(
      create('span', '', `Nível ${level.level}`),
      create('span', '', `${Math.max(0, level.current)} / ${level.needed} XP`)
    );
    const track = create('div', 'v14-xp-track');
    const fill = create('span');
    fill.style.width = `${Math.round(level.ratio * 100)}%`;
    track.append(fill);
    xp.append(xpHead, track);

    const recommendationCard = create('article', 'v14-recommendation');
    const recommendationCopy = create('div');
    recommendationCopy.append(
      create('span', 'v14-recommendation-icon', recommendation.icon),
      create('div', '', '')
    );
    recommendationCopy.lastElementChild.append(
      create('small', '', 'RECOMENDADO PARA VOCÊS'),
      create('h3', '', recommendation.title),
      create('p', '', recommendation.copy)
    );
    const play = create('button', 'primary-button', 'Jogar agora →');
    play.type = 'button';
    play.addEventListener('click', () => launchMode(recommendation.mode));
    recommendationCard.append(recommendationCopy, play);

    const actions = create('div', 'v14-dashboard-actions');
    const achievements = create('button', 'ghost-button', '🏆 Ver conquistas');
    achievements.type = 'button';
    achievements.addEventListener('click', openAchievements);
    actions.append(achievements);

    if (installPrompt) {
      const install = create('button', 'ghost-button', '📱 Instalar app');
      install.type = 'button';
      install.addEventListener('click', async () => {
        installPrompt.prompt();
        await installPrompt.userChoice.catch(() => null);
        installPrompt = null;
        renderDashboard();
      });
      actions.append(install);
    }

    section.append(top, stats, xp, recommendationCard, actions);

    const hero = home.querySelector('.hero');
    if (hero) hero.insertAdjacentElement('afterend', section);
    else home.prepend(section);
  }

  function renderOnboarding() {
    if (readJson(ONBOARDING_KEY, false)) return;
    const { overlay, modal } = modalShell('v14-onboarding-overlay');
    let step = 0;
    const slides = [
      {
        icon: '💞',
        kicker: 'COUPLE GAME',
        title: 'Mais do que perguntas.',
        copy: 'Escolham o clima da noite, descubram coisas novas e deixem o app variar entre conversa, disputa e experiências.'
      },
      {
        icon: '🔐',
        kicker: 'PRIVADO POR PADRÃO',
        title: 'O que é íntimo continua íntimo.',
        copy: 'Perfil, progresso e favoritas ficam neste aparelho. Respostas secretas não viram histórico.'
      },
      {
        icon: '✨',
        kicker: 'FEITO PARA VOLTAR',
        title: 'Cada noite constrói progresso.',
        copy: 'Ganhem XP, subam de nível, criem uma sequência e desbloqueiem conquistas sem precisar criar conta.'
      }
    ];

    function show() {
      const slide = slides[step];
      const dots = create('div', 'v14-onboarding-dots');
      slides.forEach((_, index) => dots.append(create('span', index === step ? 'is-active' : '')));
      const next = create('button', 'primary-button', step === slides.length - 1 ? 'Entrar no app →' : 'Continuar →');
      next.type = 'button';
      next.addEventListener('click', () => {
        if (step < slides.length - 1) {
          step += 1;
          show();
        } else {
          writeJson(ONBOARDING_KEY, true);
          overlay.remove();
          if (!readProfile().names?.some(Boolean)) setTimeout(openProfile, 150);
        }
      });
      const skip = create('button', 'ghost-button', 'Pular');
      skip.type = 'button';
      skip.addEventListener('click', () => {
        writeJson(ONBOARDING_KEY, true);
        overlay.remove();
      });
      const close = modal.querySelector('.v14-close');
      modal.replaceChildren(
        close,
        create('div', 'v14-onboarding-icon', slide.icon),
        create('p', 'kicker', slide.kicker),
        create('h1', '', slide.title),
        create('p', 'v14-onboarding-copy', slide.copy),
        dots,
        create('div', 'button-row')
      );
      modal.querySelector('.button-row').append(next, skip);
    }

    modal.querySelector('.v14-close').addEventListener('click', () => writeJson(ONBOARDING_KEY, true));
    show();
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    renderDashboard();
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button');
    if (!button) return;
    if (button.matches('[data-room="couple"]')) activeMode = 'couple';
    else if (button.matches('[data-room="duel"]')) activeMode = 'duel';
    else if (button.matches('[data-room="party"]')) activeMode = 'party';
    else if (button.closest('[data-v13-mode="story"]')) activeMode = 'story';
    else if (button.closest('[data-v13-mode="knowledge"]')) activeMode = 'knowledge';
    else if (button.closest('[data-v13-mode="duo"]')) activeMode = 'duo';
  }, true);

  if (resultView) {
    const resultObserver = new MutationObserver(() => {
      if (!resultView.classList.contains('is-active')) return;
      const panel = resultView.querySelector('#result-content');
      if (!panel || seenCompletionNodes.has(panel)) return;
      const text = panel.textContent || '';
      if (!/sessão|resultado|fim|conclu/i.test(text)) return;
      seenCompletionNodes.add(panel);
      recordSession(activeMode || 'couple');
    });
    resultObserver.observe(resultView, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  const bodyObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        const overlay = node.matches('.v13-overlay') ? node : node.querySelector?.('.v13-overlay');
        if (!overlay) continue;
        const mode = overlay.classList.contains('v13-story-overlay') ? 'story'
          : overlay.classList.contains('v13-knowledge-overlay') ? 'knowledge'
          : overlay.classList.contains('v13-duo-overlay') || overlay.classList.contains('v13-duo-guest-overlay') ? 'duo'
          : null;
        if (mode) activeMode = mode;
        const observer = new MutationObserver(() => {
          const text = overlay.textContent || '';
          if (mode === 'story' && /HISTÓRIA CONCLUÍDA/i.test(text)) {
            observer.disconnect();
            recordSession('story');
          } else if (mode === 'knowledge' && /PLACAR FINAL/i.test(text)) {
            observer.disconnect();
            recordSession('knowledge');
          } else if (mode === 'duo' && /RESPOSTA RECEBIDA/i.test(text)) {
            observer.disconnect();
            recordSession('duo');
          }
        });
        observer.observe(overlay, { childList: true, subtree: true });
      }
    }
  });
  bodyObserver.observe(document.body, { childList: true });

  renderDashboard();
  queueMicrotask(renderOnboarding);
}
