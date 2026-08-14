import { coupleQuestions } from '../data.js';
import { extraHotCoupleQuestions } from '../questions/couple-hot.js';
import { directAdultCoupleQuestions } from '../questions/couple-adult-direct.js';
import { extraRomanticCoupleQuestions } from '../questions/couple-romantic-extra.js';
import { extraDeepCoupleQuestions } from '../questions/couple-deep-extra.js';

const all = [
  ...coupleQuestions,
  ...extraRomanticCoupleQuestions,
  ...extraDeepCoupleQuestions,
  ...extraHotCoupleQuestions,
  ...directAdultCoupleQuestions
];

let failed = false;
const ids = new Set();
const normalizedTexts = new Set();

function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

for (const question of all) {
  assert(typeof question.id === 'string' && question.id.trim(), 'Pergunta de casal sem ID');
  assert(!ids.has(question.id), `ID duplicado: ${question.id}`);
  ids.add(question.id);
  assert(['leve', 'profundo', 'quente'].includes(question.intensity), `Intensidade inválida em ${question.id}`);
  assert(typeof question.category === 'string' && question.category.trim(), `Categoria ausente em ${question.id}`);
  assert(typeof question.text === 'string' && question.text.trim(), `Texto ausente em ${question.id}`);

  const normalized = normalizeText(question.text);
  assert(!normalizedTexts.has(normalized), `Texto duplicado ou equivalente em ${question.id}`);
  normalizedTexts.add(normalized);
}

const counts = Object.fromEntries(
  ['leve', 'profundo', 'quente'].map((intensity) => [
    intensity,
    all.filter((question) => question.intensity === intensity).length
  ])
);

const romanticCategories = new Set(all.filter((question) => question.intensity === 'leve').map((question) => question.category));
const deepCategories = new Set(all.filter((question) => question.intensity === 'profundo').map((question) => question.category));

assert(counts.leve === 80, `Esperadas 80 perguntas românticas; encontradas ${counts.leve}`);
assert(counts.profundo === 80, `Esperadas 80 perguntas profundas; encontradas ${counts.profundo}`);
assert(counts.quente === 100, `Esperadas 100 perguntas quentes; encontradas ${counts.quente}`);
assert(all.length === 260, `Esperadas 260 perguntas de casal; encontradas ${all.length}`);
assert(romanticCategories.size >= 12, `Romântico precisa de pelo menos 12 categorias; encontradas ${romanticCategories.size}`);
assert(deepCategories.size >= 12, `Profundo precisa de pelo menos 12 categorias; encontradas ${deepCategories.size}`);

if (failed) process.exit(1);
console.log('✓ 260 perguntas de casal validadas');
console.log('✓ 80 românticas · 80 profundas · 100 quentes/adultas');
console.log('✓ diversidade de categorias validada');
console.log('✓ IDs e textos únicos validados');
