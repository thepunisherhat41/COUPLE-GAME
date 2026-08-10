export const HOT_STAGE_ORDER = ['picante', 'fetiches', 'semtabu'];

export const hotStageLabels = {
  picante: '🔥 Picante',
  fetiches: '😈 Fetiches',
  semtabu: '🖤 Sem Tabu'
};

export const hotStageDescriptions = {
  picante: 'desejo, química, provocação e intimidade',
  fetiches: 'fantasias, brinquedos, roleplay e experimentação',
  semtabu: 'sexo, pornografia, masturbação, voyeurismo, limites e conversas sem filtro'
};

export function decorateHotQuestions(questions) {
  for (const question of questions) {
    if (question.intensity !== 'quente') continue;
    const match = /^c-q-(\d+)$/.exec(question.id);
    if (!match) continue;
    const number = Number(match[1]);

    // Faixas curadas para aumentar a ousadia de forma gradual.
    question.hotStage = number <= 34
      ? 'picante'
      : number <= 70
        ? 'fetiches'
        : 'semtabu';
  }
  return questions;
}
