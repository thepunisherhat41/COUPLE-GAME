import { eroticCoupleQuestions } from '../questions/couple-erotic.js';
import { sexChallengeCards } from '../questions/couple-sex-challenges.js';
import { COMPETITIVE_RULES, POWER_DEFINITIONS } from '../competitive-rules.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

assert(eroticCoupleQuestions.length === 100, `Esperadas 100 perguntas adultas; encontradas ${eroticCoupleQuestions.length}`);
assert(sexChallengeCards.length === 60, `Esperados 60 desafios de casal; encontrados ${sexChallengeCards.length}`);

const sexCards = [...eroticCoupleQuestions, ...sexChallengeCards];
const ids = new Set();
for (const card of sexCards) {
  assert(card.intensity === 'erotico', `Intensidade interna inválida em ${card.id}`);
  assert(typeof card.category === 'string' && card.category.trim(), `Categoria ausente em ${card.id}`);
  assert(typeof card.text === 'string' && card.text.trim(), `Texto ausente em ${card.id}`);
  assert(!ids.has(card.id), `ID duplicado na sessão Sexo: ${card.id}`);
  ids.add(card.id);
}

for (const card of sexChallengeCards) {
  assert(card.type === 'challenge', `Desafio sem type=challenge: ${card.id}`);
}

assert(sexCards.length === 160, `Esperadas 160 cartas na sessão Sexo; encontradas ${sexCards.length}`);
assert(new Set(eroticCoupleQuestions.map((question) => question.category)).size >= 15, 'A sessão Sexo precisa manter variedade de temas');

assert(COMPETITIVE_RULES.minLives >= 3, 'O mínimo de vidas precisa ser pelo menos 3');
assert(COMPETITIVE_RULES.maxPartyPlayers === 16, 'Sala 3 precisa aceitar até 16 jogadores');
assert(COMPETITIVE_RULES.maxCouples === 6, 'Sala 2 precisa aceitar até 6 casais');
assert(POWER_DEFINITIONS.length === 3, `Esperados exatamente 3 poderes; encontrados ${POWER_DEFINITIONS.length}`);
assert(new Set(POWER_DEFINITIONS.map((power) => power.id)).size === 3, 'IDs dos poderes precisam ser únicos');

if (failed) process.exit(1);
console.log('✓ Sessão Sexo: 100 perguntas + 60 desafios');
console.log('✓ 160 cartas sem IDs duplicados');
console.log('✓ variedade interna da sessão Sexo validada');
console.log('✓ mínimo de 3 vidas validado');
console.log('✓ Sala 3: até 16 jogadores');
console.log('✓ Sala 2: até 6 casais');
console.log('✓ 3 poderes de equipe validados');
