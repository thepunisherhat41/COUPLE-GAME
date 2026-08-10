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

function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

for (const question of all) {
  assert(typeof question.id === 'string' && question.id.trim(), 'Pergunta de casal sem ID');
  assert(!ids.has(question.id), `ID duplicado: ${question.id}`);
  ids.add(question.id);
  assert(['leve', 'profundo', 'quente'].includes(question.intensity), `Intensidade inválida em ${question.id}`);
  assert(typeof question.category === 'string' && question.category.trim(), `Categoria ausente em ${question.id}`);
  assert(typeof question.text === 'string' && question.text.trim(), `Texto ausente em ${question.id}`);
}

const counts = Object.fromEntries(
  ['leve', 'profundo', 'quente'].map((intensity) => [
    intensity,
    all.filter((question) => question.intensity === intensity).length
  ])
);

assert(counts.leve === 40, `Esperadas 40 perguntas leves; encontradas ${counts.leve}`);
assert(counts.profundo === 40, `Esperadas 40 perguntas profundas; encontradas ${counts.profundo}`);
assert(counts.quente === 100, `Esperadas 100 perguntas quentes; encontradas ${counts.quente}`);
assert(all.length === 180, `Esperadas 180 perguntas de casal; encontradas ${all.length}`);

if (failed) process.exit(1);
console.log('✓ 180 perguntas de casal validadas');
console.log('✓ 40 românticas · 40 profundas · 100 quentes/adultas');
console.log('✓ IDs, categorias, intensidades e textos íntegros');
