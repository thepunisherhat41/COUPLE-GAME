import { eroticCoupleQuestions } from '../questions/couple-erotic.js';
import { COMPETITIVE_RULES, POWER_DEFINITIONS } from '../competitive-rules.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

assert(eroticCoupleQuestions.length === 100, `Esperadas 100 perguntas no modo Hot; encontradas ${eroticCoupleQuestions.length}`);
const ids = new Set();
for (const question of eroticCoupleQuestions) {
  assert(question.intensity === 'erotico', `Intensidade inválida em ${question.id}`);
  assert(typeof question.category === 'string' && question.category.trim(), `Categoria ausente em ${question.id}`);
  assert(typeof question.text === 'string' && question.text.trim(), `Texto ausente em ${question.id}`);
  assert(!ids.has(question.id), `ID Hot duplicado: ${question.id}`);
  ids.add(question.id);
}

assert(new Set(eroticCoupleQuestions.map((question) => question.category)).size >= 15, 'O modo Hot precisa manter variedade de temas');

assert(COMPETITIVE_RULES.minLives >= 3, 'O mínimo de vidas precisa ser pelo menos 3');
assert(COMPETITIVE_RULES.maxPartyPlayers === 16, 'Sala 3 precisa aceitar até 16 jogadores');
assert(COMPETITIVE_RULES.maxCouples === 6, 'Sala 2 precisa aceitar até 6 casais');
assert(POWER_DEFINITIONS.length === 3, `Esperados exatamente 3 poderes; encontrados ${POWER_DEFINITIONS.length}`);
assert(new Set(POWER_DEFINITIONS.map((power) => power.id)).size === 3, 'IDs dos poderes precisam ser únicos');

if (failed) process.exit(1);
console.log('✓ 100 perguntas no modo Hot surpresa');
console.log('✓ variedade interna do modo Hot validada');
console.log('✓ mínimo de 3 vidas validado');
console.log('✓ Sala 3: até 16 jogadores');
console.log('✓ Sala 2: até 6 casais');
console.log('✓ 3 poderes de equipe validados');
