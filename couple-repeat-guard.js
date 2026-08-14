const STORAGE_PREFIX = 'couple-game:recent:';
const RECENT_LIMIT = 40;
const TRACKED_INTENSITIES = new Set(['leve', 'profundo']);

function loadRecent(intensity) {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${intensity}`) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string').slice(-RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveRecent(intensity, ids) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${intensity}`, JSON.stringify(ids.slice(-RECENT_LIMIT)));
  } catch {
    // O jogo continua normalmente mesmo se o armazenamento local estiver indisponível.
  }
}

function rememberQuestion(question) {
  if (!question || !TRACKED_INTENSITIES.has(question.intensity)) return;
  const recent = loadRecent(question.intensity).filter((id) => id !== question.id);
  recent.push(question.id);
  saveRecent(question.intensity, recent);
}

export function installCoupleRepeatGuard(coupleQuestions) {
  if (!Array.isArray(coupleQuestions) || globalThis.__coupleRepeatGuardInstalled) return;
  globalThis.__coupleRepeatGuardInstalled = true;

  const masterQuestions = [...coupleQuestions];
  const byText = new Map(masterQuestions.map((question) => [question.text, question]));
  let lastSessionIntensity = null;

  function restoreMaster() {
    coupleQuestions.splice(0, coupleQuestions.length, ...masterQuestions);
  }

  function selectedIntensityFromSetup() {
    const selected = document.querySelector('[data-couple-intensity].is-selected');
    return selected?.dataset?.coupleIntensity || null;
  }

  function requestedCountFromSetup() {
    const select = document.querySelector('select[id^="couple-count-"]');
    return Number(select?.value) || 40;
  }

  function prepareDeck(intensity, requestedCount) {
    restoreMaster();
    if (!TRACKED_INTENSITIES.has(intensity)) return;

    const pool = masterQuestions.filter((question) => question.intensity === intensity);
    const recent = loadRecent(intensity);
    const maxBlocked = Math.max(0, pool.length - requestedCount);
    const blocked = new Set(recent.slice(-Math.min(maxBlocked, recent.length)));

    const prepared = masterQuestions.filter((question) => (
      question.intensity !== intensity || !blocked.has(question.id)
    ));

    coupleQuestions.splice(0, coupleQuestions.length, ...prepared);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button');
    if (!button) return;

    const label = button.textContent?.trim() || '';
    if (label.includes('Começar a sessão')) {
      const intensity = selectedIntensityFromSetup();
      lastSessionIntensity = intensity;
      prepareDeck(intensity, requestedCountFromSetup());
      return;
    }

    if (label.includes('Outra sessão')) {
      prepareDeck(lastSessionIntensity, 40);
      return;
    }

    if (button.matches('[data-action="home"]') || button.matches('[data-room]')) {
      restoreMaster();
    }
  }, true);

  const gameContent = document.querySelector('#game-content');
  if (!gameContent) return;

  const observer = new MutationObserver(() => {
    const text = gameContent.querySelector('.question-text')?.textContent?.trim();
    if (!text) return;
    const question = byText.get(text);
    rememberQuestion(question);
  });

  observer.observe(gameContent, { childList: true, subtree: true });
}
