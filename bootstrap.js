import { coupleQuestions, triviaQuestions } from './data.js';
import { popularEasy } from './questions/popular-easy.js';
import { popularMedium } from './questions/popular-medium.js';
import { popularHardA } from './questions/popular-hard-a.js';
import { popularHardB } from './questions/popular-hard-b.js';
import { triviaCorrections } from './questions/corrections.js';
import { extraHotCoupleQuestions } from './questions/couple-hot.js';
import { directAdultCoupleQuestions } from './questions/couple-adult-direct.js';
import { extraRomanticCoupleQuestions } from './questions/couple-romantic-extra.js';
import { extraDeepCoupleQuestions } from './questions/couple-deep-extra.js';

const popularTriviaQuestions = [
  ...popularEasy,
  ...popularMedium,
  ...popularHardA,
  ...popularHardB
];

for (const question of popularTriviaQuestions) {
  const correction = triviaCorrections[question.id];
  if (correction) Object.assign(question, correction);
}

// Expande os três níveis do modo Entre Nós.
// O baralho final fica com 40 perguntas leves, 40 profundas e 100 quentes/adultas.
const extraCoupleQuestions = [
  ...extraRomanticCoupleQuestions,
  ...extraDeepCoupleQuestions,
  ...extraHotCoupleQuestions,
  ...directAdultCoupleQuestions
];

const existingCoupleIds = new Set(coupleQuestions.map((question) => question.id));
for (const question of extraCoupleQuestions) {
  if (!existingCoupleIds.has(question.id)) {
    coupleQuestions.push(question);
    existingCoupleIds.add(question.id);
  }
}

// Mantém o motor do jogo original, mas substitui integralmente o baralho antigo de trivia.
triviaQuestions.splice(0, triviaQuestions.length, ...popularTriviaQuestions);

// Após uma resposta de trivia, acrescenta uma curiosidade curta sem interferir no placar.
document.addEventListener('click', (event) => {
  const answerButton = event.target.closest?.('[data-answer-index]');
  if (!answerButton) return;

  queueMicrotask(() => {
    const prompt = document.querySelector('.question-text')?.textContent?.trim();
    const feedback = document.querySelector('#answer-feedback');
    if (!prompt || !feedback || feedback.dataset.factAdded === 'true') return;

    const question = triviaQuestions.find((item) => item.prompt === prompt);
    if (!question?.fact) return;

    const fact = document.createElement('span');
    fact.textContent = `💡 ${question.fact}`;
    fact.style.display = 'block';
    fact.style.marginTop = '8px';
    fact.style.color = 'var(--muted)';
    fact.style.lineHeight = '1.5';
    feedback.append(fact);
    feedback.dataset.factAdded = 'true';
  });
});

await import('./app.js');

function enhanceCoupleSetup() {
  const intensitySelector = document.querySelector('#intensity-selector');
  const hotButton = intensitySelector?.querySelector('[data-intensity="quente"]');

  if (hotButton) {
    const label = hotButton.querySelector('span');
    const hint = hotButton.querySelector('small');
    if (label && label.textContent !== '🔥 Quente 18+') label.textContent = '🔥 Quente 18+';
    if (hint && hint.textContent !== 'sexo, fetiches e fantasias') hint.textContent = 'sexo, fetiches e fantasias';
  }

  const countSelect = document.querySelector('#couple-count');
  if (countSelect) {
    const options = [
      ['20', '20 perguntas'],
      ['30', '30 perguntas'],
      ['40', '40 perguntas']
    ];
    for (const [value, label] of options) {
      if (!countSelect.querySelector(`option[value="${value}"]`)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        countSelect.append(option);
      }
    }
  }

  const intensityField = intensitySelector?.closest('.field-full');
  if (intensityField && !document.querySelector('#adult-mode-note')) {
    const note = document.createElement('div');
    note.id = 'adult-mode-note';
    note.setAttribute('role', 'note');
    note.textContent = '🔞 O modo Quente contém perguntas adultas sobre sexo, fetiches e fantasias. Use apenas entre adultos, com consentimento, e troque qualquer pergunta que gere desconforto.';
    note.style.marginTop = '12px';
    note.style.padding = '12px 14px';
    note.style.border = '1px solid rgba(255, 79, 145, 0.28)';
    note.style.borderRadius = '12px';
    note.style.background = 'rgba(255, 79, 145, 0.07)';
    note.style.color = 'var(--muted)';
    note.style.fontSize = '0.82rem';
    note.style.lineHeight = '1.5';
    intensityField.append(note);
  }
}

const setupRoot = document.querySelector('#setup-content');
if (setupRoot) {
  const setupObserver = new MutationObserver(enhanceCoupleSetup);
  setupObserver.observe(setupRoot, { childList: true, subtree: true });
}

enhanceCoupleSetup();
