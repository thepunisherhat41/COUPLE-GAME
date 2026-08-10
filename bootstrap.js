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
import { decorateHotQuestions } from './questions/couple-hot-stages.js';
import { installCoupleProgressiveEngine } from './couple-progressive-engine.js';

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

// Classifica as 100 perguntas adultas em uma progressão real de intensidade.
decorateHotQuestions(coupleQuestions);

// Mantém o motor original para as salas competitivas, usando o banco popular ampliado.
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

// app.js continua responsável por Duelo e Galera.
await import('./app.js');

// A Sala 01 usa o novo motor progressivo e intercepta apenas o botão Entre Nós.
installCoupleProgressiveEngine(coupleQuestions);
