import { popularEasy } from '../questions/popular-easy.js';
import { popularMedium } from '../questions/popular-medium.js';
import { popularHardA } from '../questions/popular-hard-a.js';
import { popularHardB } from '../questions/popular-hard-b.js';

const questions = [...popularEasy, ...popularMedium, ...popularHardA, ...popularHardB];
const expected = { easy: 54, medium: 54, hard: 54 };
const ids = new Set();
let failed = false;

function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

for (const question of questions) {
  assert(typeof question.id === 'string' && question.id, 'Pergunta sem ID');
  assert(!ids.has(question.id), `ID duplicado: ${question.id}`);
  ids.add(question.id);
  assert(['easy', 'medium', 'hard'].includes(question.difficulty), `Dificuldade inválida em ${question.id}`);
  assert(typeof question.category === 'string' && question.category.trim(), `Categoria vazia em ${question.id}`);
  assert(typeof question.prompt === 'string' && question.prompt.trim(), `Enunciado vazio em ${question.id}`);
  assert(Array.isArray(question.options) && question.options.length === 4, `${question.id} precisa ter 4 alternativas`);
  assert(Number.isInteger(question.answer) && question.answer >= 0 && question.answer <= 3, `Resposta inválida em ${question.id}`);
  assert(typeof question.fact === 'string' && question.fact.trim(), `Curiosidade ausente em ${question.id}`);
}

for (const [difficulty, amount] of Object.entries(expected)) {
  const count = questions.filter((question) => question.difficulty === difficulty).length;
  assert(count === amount, `Esperadas ${amount} perguntas ${difficulty}; encontradas ${count}`);
}

assert(questions.length === 162, `Esperadas 162 perguntas populares; encontradas ${questions.length}`);

if (failed) process.exit(1);
console.log(`✓ ${questions.length} perguntas populares validadas`);
console.log('✓ 54 fáceis · 54 médias · 54 difíceis');
console.log('✓ Todas possuem categoria, 4 alternativas, resposta e curiosidade');
