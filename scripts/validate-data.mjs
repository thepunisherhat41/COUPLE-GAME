import { coupleQuestions, triviaQuestions, dares } from '../data.js';

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function validateUniqueIds(label, items) {
  const ids = new Set();
  for (const item of items) {
    assert(typeof item.id === 'string' && item.id.length > 0, `${label}: item sem ID válido`);
    assert(!ids.has(item.id), `${label}: ID duplicado ${item.id}`);
    ids.add(item.id);
  }
}

validateUniqueIds('coupleQuestions', coupleQuestions);
validateUniqueIds('triviaQuestions', triviaQuestions);
validateUniqueIds('dares', dares);

assert(coupleQuestions.length >= 42, `Esperadas ao menos 42 perguntas de casal; encontradas ${coupleQuestions.length}`);
assert(triviaQuestions.length >= 54, `Esperadas ao menos 54 perguntas de trivia; encontradas ${triviaQuestions.length}`);
assert(dares.length >= 30, `Esperados ao menos 30 micos; encontrados ${dares.length}`);

const validIntensities = new Set(['leve', 'profundo', 'quente']);
for (const question of coupleQuestions) {
  assert(validIntensities.has(question.intensity), `Intensidade inválida em ${question.id}`);
  assert(typeof question.category === 'string' && question.category.trim(), `Categoria ausente em ${question.id}`);
  assert(typeof question.text === 'string' && question.text.trim(), `Texto ausente em ${question.id}`);
}

const intensityCounts = Object.groupBy
  ? Object.groupBy(coupleQuestions, (question) => question.intensity)
  : coupleQuestions.reduce((acc, question) => {
      (acc[question.intensity] ??= []).push(question);
      return acc;
    }, {});

for (const intensity of validIntensities) {
  assert((intensityCounts[intensity] || []).length >= 14, `A intensidade ${intensity} precisa ter pelo menos 14 perguntas`);
}

const validDifficulties = new Set(['easy', 'medium', 'hard']);
for (const question of triviaQuestions) {
  assert(validDifficulties.has(question.difficulty), `Dificuldade inválida em ${question.id}`);
  assert(Array.isArray(question.options) && question.options.length === 4, `${question.id} precisa ter exatamente 4 alternativas`);
  assert(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4, `Resposta correta inválida em ${question.id}`);
  assert(question.options.every((option) => typeof option === 'string' && option.trim()), `Alternativa vazia em ${question.id}`);
  assert(typeof question.prompt === 'string' && question.prompt.trim(), `Pergunta vazia em ${question.id}`);
}

const validDareLevels = new Set(['leve', 'engraçado', 'ousado']);
for (const dare of dares) {
  assert(validDareLevels.has(dare.level), `Nível de mico inválido em ${dare.id}`);
  assert(typeof dare.text === 'string' && dare.text.trim(), `Mico sem texto em ${dare.id}`);
}

if (!process.exitCode) {
  console.log(`✓ ${coupleQuestions.length} perguntas para casal validadas`);
  console.log(`✓ ${triviaQuestions.length} perguntas de conhecimento validadas`);
  console.log(`✓ ${dares.length} micos validados`);
  console.log('✓ Dados do Couple Game íntegros');
}
