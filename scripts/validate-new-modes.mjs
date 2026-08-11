import { sexChallengeCards } from '../questions/couple-sex-challenges.js';
import { userSexChallengeCards } from '../questions/couple-sex-user-challenges.js';
import { COMPETITIVE_RULES, POWER_DEFINITIONS } from '../competitive-rules.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

assert(sexChallengeCards.length === 60, `Esperados 60 desafios-base; encontrados ${sexChallengeCards.length}`);
assert(userSexChallengeCards.length === 25, `Esperados 25 desafios enviados pelo usuário; encontrados ${userSexChallengeCards.length}`);

const sexChallenges = [...sexChallengeCards, ...userSexChallengeCards];
const ids = new Set();
for (const card of sexChallenges) {
  assert(card.intensity === 'erotico', `Intensidade interna inválida em ${card.id}`);
  assert(card.type === 'challenge', `Carta sem type=challenge: ${card.id}`);
  assert([1, 2, 3].includes(Number(card.heat)), `Nível de calor inválido em ${card.id}`);
  assert(typeof card.category === 'string' && card.category.trim(), `Categoria ausente em ${card.id}`);
  assert(typeof card.text === 'string' && card.text.trim(), `Texto ausente em ${card.id}`);
  assert(!ids.has(card.id), `ID duplicado na sessão Sexo: ${card.id}`);
  ids.add(card.id);
}

assert(sexChallenges.length === 85, `Esperados 85 desafios na sessão Sexo; encontrados ${sexChallenges.length}`);
for (const heat of [1, 2, 3]) {
  const count = sexChallenges.filter((card) => Number(card.heat) === heat).length;
  assert(count >= 20, `Nível ${heat} precisa ter pelo menos 20 desafios; encontrados ${count}`);
}

assert(COMPETITIVE_RULES.minLives >= 3, 'O mínimo de vidas precisa ser pelo menos 3');
assert(COMPETITIVE_RULES.maxPartyPlayers === 16, 'Sala 3 precisa aceitar até 16 jogadores');
assert(COMPETITIVE_RULES.maxCouples === 6, 'Sala 2 precisa aceitar até 6 casais');
assert(POWER_DEFINITIONS.length === 3, `Esperados exatamente 3 poderes; encontrados ${POWER_DEFINITIONS.length}`);
assert(new Set(POWER_DEFINITIONS.map((power) => power.id)).size === 3, 'IDs dos poderes precisam ser únicos');

if (failed) process.exit(1);
console.log('✓ Sessão Sexo: 85 desafios e nenhuma pergunta comum');
console.log('✓ 25 desafios enviados pelo usuário integrados');
console.log('✓ progressão em 3 níveis validada');
console.log('✓ todos os IDs da sessão Sexo são únicos');
console.log('✓ mínimo de 3 vidas validado');
console.log('✓ Sala 3: até 16 jogadores');
console.log('✓ Sala 2: até 6 casais');
console.log('✓ 3 poderes de equipe validados');
