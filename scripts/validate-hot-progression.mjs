import { coupleQuestions } from '../data.js';
import { extraHotCoupleQuestions } from '../questions/couple-hot.js';
import { directAdultCoupleQuestions } from '../questions/couple-adult-direct.js';
import { decorateHotQuestions, HOT_STAGE_ORDER } from '../questions/couple-hot-stages.js';

const originalHot = coupleQuestions.filter((question) => question.intensity === 'quente');
const hotQuestions = [...originalHot, ...extraHotCoupleQuestions, ...directAdultCoupleQuestions];
decorateHotQuestions(hotQuestions);

let failed = false;
const ids = new Set();
const expected = { picante: 34, fetiches: 36, semtabu: 30 };

function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

assert(hotQuestions.length === 100, `Esperadas 100 perguntas adultas; encontradas ${hotQuestions.length}`);

for (const question of hotQuestions) {
  assert(!ids.has(question.id), `ID adulto duplicado: ${question.id}`);
  ids.add(question.id);
  assert(HOT_STAGE_ORDER.includes(question.hotStage), `Estágio adulto inválido em ${question.id}: ${question.hotStage}`);
}

for (const [stage, count] of Object.entries(expected)) {
  const actual = hotQuestions.filter((question) => question.hotStage === stage).length;
  assert(actual === count, `Esperadas ${count} perguntas em ${stage}; encontradas ${actual}`);
  assert(actual >= 30, `${stage} precisa suportar sessão fixa de 30 perguntas sem repetição`);
}

// Em uma sessão progressiva de 40 perguntas, cada ato usa no máximo 14 cartas.
const maxProgressiveStageUse = Math.ceil(40 / 3);
for (const stage of HOT_STAGE_ORDER) {
  const actual = hotQuestions.filter((question) => question.hotStage === stage).length;
  assert(actual >= maxProgressiveStageUse, `${stage} não suporta progressão de 40 perguntas`);
}

if (failed) process.exit(1);
console.log('✓ Progressão adulta validada: 100 perguntas');
console.log('✓ 34 Picante · 36 Fetiches · 30 Sem Tabu');
console.log('✓ Modos fixos suportam 30 perguntas sem repetição');
console.log('✓ Progressivo suporta sessão de 40 perguntas');
