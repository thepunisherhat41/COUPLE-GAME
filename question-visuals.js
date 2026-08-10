const CATEGORY_VISUALS = [
  { match: /⚡ desafio|desafio/i, icon: '⚡', label: 'Desafio', theme: 'erotic' },
  { match: /bdsm|domina|submiss|bondage|impacto|aftercare|limites bdsm/i, icon: '⛓️', label: 'Intensidade', theme: 'erotic' },
  { match: /fetiche/i, icon: '😈', label: 'Fetiches', theme: 'hot' },
  { match: /pornografia/i, icon: '🎞️', label: 'Adulto', theme: 'erotic' },
  { match: /masturba/i, icon: '✨', label: 'Autoconhecimento', theme: 'erotic' },
  { match: /orgasmo|prazer|desejo sexual|sexo oral|práticas|brinquedos|fantasia|intimidade|depois do sexo|sexo 18/i, icon: '❤️‍🔥', label: 'Sexo', theme: 'erotic' },
  { match: /romance|carinho|afeto|amor|encontro|admiração|memórias|gratidão|história/i, icon: '💌', label: 'Conexão', theme: 'romance' },
  { match: /vulnerabilidade|sentimentos|medos|confiança|perdão|futuro|valores|crescimento|comunicação|compromisso|identidade/i, icon: '🌙', label: 'Profundidade', theme: 'deep' },
  { match: /música/i, icon: '🎵', label: 'Música', theme: 'trivia' },
  { match: /cinema|tv/i, icon: '🎬', label: 'Cinema & TV', theme: 'trivia' },
  { match: /esporte/i, icon: '🏆', label: 'Esportes', theme: 'trivia' },
  { match: /ciência|natureza/i, icon: '🔬', label: 'Ciência', theme: 'trivia' },
  { match: /internet|games|game/i, icon: '🎮', label: 'Games', theme: 'trivia' },
  { match: /brasil/i, icon: '🇧🇷', label: 'Brasil', theme: 'trivia' },
  { match: /mundo/i, icon: '🌍', label: 'Mundo', theme: 'trivia' }
];

function resolveVisual(card) {
  const category = card.querySelector('.category-chip')?.textContent?.trim() || '';
  const badge = card.querySelector('.badge')?.textContent?.trim() || '';
  const combined = `${category} ${badge}`;

  const found = CATEGORY_VISUALS.find((item) => item.match.test(combined));
  if (found) return found;

  if (/sexo/i.test(badge)) return { icon: '❤️‍🔥', label: 'Sexo', theme: 'erotic' };
  if (/quente|picante|sem tabu/i.test(badge)) return { icon: '🔥', label: 'Quente', theme: 'hot' };
  if (/profundo/i.test(badge)) return { icon: '🌙', label: 'Profundo', theme: 'deep' };
  if (/romântico|leve/i.test(badge)) return { icon: '💗', label: 'Romântico', theme: 'romance' };
  return { icon: '❓', label: 'Desafio', theme: 'trivia' };
}

function createVisual(card) {
  if (!card || card.dataset.visualDecorated === 'true') return;
  card.dataset.visualDecorated = 'true';

  const visual = resolveVisual(card);
  card.dataset.visualTheme = visual.theme;
  card.classList.add('question-card-animated');

  const scene = document.createElement('div');
  scene.className = `question-visual question-visual-${visual.theme}`;
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `
    <span class="visual-orbit orbit-one"></span>
    <span class="visual-orbit orbit-two"></span>
    <span class="visual-spark spark-one">✦</span>
    <span class="visual-spark spark-two">✦</span>
    <span class="visual-icon">${visual.icon}</span>
    <span class="visual-caption">${visual.label}</span>
  `;

  const trail = card.querySelector('.hot-stage-trail');
  if (trail) trail.insertAdjacentElement('afterend', scene);
  else card.prepend(scene);
}

function decorateCurrentQuestion() {
  const card = document.querySelector('#game-content .question-card');
  if (card) createVisual(card);
}

function installAnswerEffects(gameContent) {
  const answerObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes') continue;
      const target = mutation.target;
      if (!(target instanceof HTMLElement)) continue;

      if (target.classList.contains('answer-button') && target.classList.contains('is-correct')) {
        const card = target.closest('.question-card');
        if (card && card.dataset.celebrated !== 'true') {
          card.dataset.celebrated = 'true';
          card.classList.add('question-success');
          window.setTimeout(() => card.classList.remove('question-success'), 900);
        }
      }

      if (target.classList.contains('answer-button') && target.classList.contains('is-wrong')) {
        const card = target.closest('.question-card');
        if (card) {
          card.classList.add('question-miss');
          window.setTimeout(() => card.classList.remove('question-miss'), 520);
        }
      }
    }
  });

  answerObserver.observe(gameContent, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

export function installQuestionVisuals() {
  const gameContent = document.querySelector('#game-content');
  if (!gameContent) return;

  const observer = new MutationObserver(() => {
    requestAnimationFrame(decorateCurrentQuestion);
  });
  observer.observe(gameContent, { childList: true, subtree: true });
  installAnswerEffects(gameContent);
  decorateCurrentQuestion();
}
