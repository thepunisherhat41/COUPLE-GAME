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
import { sexChallengeCards } from './questions/couple-sex-challenges.js';
import { userSexChallengeCards } from './questions/couple-sex-user-challenges.js';
import { decorateHotQuestions } from './questions/couple-hot-stages.js';
import { installCoupleExperienceEngine } from './couple-experience-engine.js';
import { installCompetitiveEngine } from './competitive-engine.js';
import { installQuestionVisuals } from './question-visuals.js';
import { installCoupleRepeatGuard } from './couple-repeat-guard.js';
import { installCoupleExperiencePlus } from './couple-experience-plus.js';

function ensureStylesheet(id, relativePath) {
  if (document.querySelector(`#${id}`)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = new URL(relativePath, import.meta.url).href;
  document.head.append(link);
}

ensureStylesheet('couple-progressive-styles', './couple-progressive.css');
ensureStylesheet('competitive-styles', './competitive.css');
ensureStylesheet('question-visual-styles', './question-visuals.css');
ensureStylesheet('couple-experience-plus-styles', './couple-experience-plus.css');

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

const extraCoupleQuestions = [
  ...extraRomanticCoupleQuestions,
  ...extraDeepCoupleQuestions,
  ...extraHotCoupleQuestions,
  ...directAdultCoupleQuestions,
  ...sexChallengeCards,
  ...userSexChallengeCards
];

const existingCoupleIds = new Set(coupleQuestions.map((question) => question.id));
for (const question of extraCoupleQuestions) {
  if (!existingCoupleIds.has(question.id)) {
    coupleQuestions.push(question);
    existingCoupleIds.add(question.id);
  }
}

// Quente mantém os estágios clássicos e ganha uma sessão Sexo composta só por desafios.
decorateHotQuestions(coupleQuestions);

triviaQuestions.splice(0, triviaQuestions.length, ...popularTriviaQuestions);

await import('./app.js');

installCoupleExperienceEngine(coupleQuestions);
installCompetitiveEngine(triviaQuestions);
installQuestionVisuals();
installCoupleRepeatGuard(coupleQuestions);
installCoupleExperiencePlus(coupleQuestions);
