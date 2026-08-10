import { coupleQuestions } from '../data.js';
import { extraHotCoupleQuestions } from '../questions/couple-hot.js';

let failed = false;
const allIds = new Set(coupleQuestions.map((question) => question.id));

function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

assert(extraHotCoupleQuestions.length === 36, `Esperadas 36 novas perguntas quentes; encontradas ${extraHotCoupleQuestions.length}`);

for (const question of extraHotCoupleQuestions) {
  assert(typeof question.id === 'string' && question.id.trim(), 'Pergunta quente sem ID');
  assert(!allIds.has(question.id), `ID já existente no baralho original: ${question.id}`);
  allIds.add(question.id);
  assert(question.intensity === 'quente', `Intensidade inválida em ${question.id}`);
  assert(typeof question.category === 'string' && question.category.trim(), `Categoria ausente em ${question.id}`);
  assert(typeof question.text === 'string' && question.text.trim(), `Texto ausente em ${question.id}`);
}

const totalHot = coupleQuestions.filter((question) => question.intensity === 'quente').length + extraHotCoupleQuestions.length;
assert(totalHot === 50, `Esperadas 50 perguntas no modo Quente; encontradas ${totalHot}`);

if (failed) process.exit(1);
console.log(`✓ ${extraHotCoupleQuestions.length} novas perguntas quentes validadas`);
console.log(`✓ ${totalHot} perguntas disponíveis no modo Quente`);
