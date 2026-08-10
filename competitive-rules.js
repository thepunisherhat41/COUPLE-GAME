export const COMPETITIVE_RULES = Object.freeze({
  minLives: 3,
  maxLives: 5,
  maxPartyPlayers: 16,
  maxCouples: 6,
  maxPartyTeams: 8
});

export const POWER_DEFINITIONS = Object.freeze([
  {
    id: 'fifty',
    icon: '✂️',
    name: '50/50',
    description: 'Remove duas alternativas erradas.'
  },
  {
    id: 'clue',
    icon: '🔎',
    name: 'Pista',
    description: 'Revela a primeira letra da resposta correta.'
  },
  {
    id: 'retry',
    icon: '🛡️',
    name: 'Segunda chance',
    description: 'Permite errar uma vez e responder novamente.'
  }
]);

export function createPowerState() {
  return Object.fromEntries(POWER_DEFINITIONS.map((power) => [power.id, true]));
}

export function hearts(lives, maxLives) {
  const safeLives = Math.max(0, lives);
  return `${'❤️'.repeat(safeLives)}${'🖤'.repeat(Math.max(0, maxLives - safeLives))}`;
}
