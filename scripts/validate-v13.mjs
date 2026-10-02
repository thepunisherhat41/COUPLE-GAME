import { coupleKnowledgeQuestions } from '../questions/couple-knowledge.js';

let failed = false;
function assert(condition, message) {
  if (!condition) {
    failed = true;
    console.error(`✖ ${message}`);
  }
}

const ids = new Set();
const prompts = new Set();
const categories = new Set();

for (const question of coupleKnowledgeQuestions) {
  assert(typeof question.id === 'string' && question.id.trim(), 'Pergunta sem ID');
  assert(!ids.has(question.id), `ID duplicado: ${question.id}`);
  ids.add(question.id);
  assert(typeof question.category === 'string' && question.category.trim(), `Categoria ausente em ${question.id}`);
  categories.add(question.category);
  assert(typeof question.prompt === 'string' && question.prompt.trim(), `Prompt ausente em ${question.id}`);
  const normalized = question.prompt.toLowerCase().replace(/[^a-z0-9áàâãéêíóôõúç]+/gi, ' ').trim();
  assert(!prompts.has(normalized), `Pergunta duplicada: ${question.id}`);
  prompts.add(normalized);
}

assert(coupleKnowledgeQuestions.length === 36, `Esperadas 36 perguntas; encontradas ${coupleKnowledgeQuestions.length}`);
assert(categories.size >= 12, `Esperadas pelo menos 12 categorias; encontradas ${categories.size}`);

if (failed) process.exit(1);
console.log('✓ v0.13: 36 perguntas de conhecimento validadas');
console.log(`✓ v0.13: ${categories.size} categorias distintas`);
console.log('✓ v0.13: IDs e prompts únicos');
