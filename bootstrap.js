import { triviaQuestions } from './data.js';
import { popularEasy } from './questions/popular-easy.js';
import { popularMedium } from './questions/popular-medium.js';
import { popularHardA } from './questions/popular-hard-a.js';
import { popularHardB } from './questions/popular-hard-b.js';

const popularTriviaQuestions = [
  ...popularEasy,
  ...popularMedium,
  ...popularHardA,
  ...popularHardB
];

// Mantém o motor do jogo original, mas substitui integralmente o baralho antigo.
// Como arrays importados são objetos mutáveis, app.js recebe a mesma instância já atualizada.
triviaQuestions.splice(0, triviaQuestions.length, ...popularTriviaQuestions);

// Após uma resposta, acrescenta uma curiosidade curta sem interferir no placar.
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
