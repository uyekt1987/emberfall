// The upgrade draft: after each cleared wave the player picks 1 of 3.
// Every upgrade stacks; capped ones leave the pool once maxed, so a draft
// never offers a dead choice.

export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Ember',
    desc: '+18% fire rate',
    max: 5,
    apply(p) {
      p.fireRate *= 1.18;
    },
  },
  {
    id: 'heavy',
    name: 'Heavy Ember',
    desc: '+25% damage',
    max: 5,
    apply(p) {
      p.damage *= 1.25;
    },
  },
  {
    id: 'split',
    name: 'Twin Flame',
    desc: '+1 projectile',
    max: 4,
    apply(p) {
      p.projectiles += 1;
    },
  },
  {
    id: 'swift',
    name: 'Swift Step',
    desc: '+12% move speed',
    max: 4,
    apply(p) {
      p.speed *= 1.12;
    },
  },
  {
    id: 'vital',
    name: 'Lantern Heart',
    desc: '+25 max HP, heal 25',
    max: 5,
    apply(p) {
      p.maxHp += 25;
      p.hp = Math.min(p.maxHp, p.hp + 25);
    },
  },
  {
    id: 'dash',
    name: 'Ember Dash',
    desc: 'Dash recharges 30% faster',
    max: 3,
    apply(p) {
      p.dashCooldown *= 0.7;
    },
  },
  {
    id: 'pierce',
    name: 'Piercing Light',
    desc: 'Shots pierce +1 enemy',
    max: 3,
    apply(p) {
      p.pierce += 1;
    },
  },
  {
    id: 'magnet',
    name: 'Ember Magnet',
    desc: '+60% pickup radius',
    max: 3,
    apply(p) {
      p.magnet *= 1.6;
    },
  },
  {
    id: 'crit',
    name: 'Bright Spark',
    desc: '+10% critical chance (2x damage)',
    max: 4,
    apply(p) {
      p.crit += 0.1;
    },
  },
  {
    id: 'regen',
    name: 'Slow Burn',
    desc: 'Regenerate 1 HP per second',
    max: 3,
    apply(p) {
      p.regen += 1;
    },
  },
];

function ownedCount(state, id) {
  return state.upgradesOwned.filter((u) => u === id).length;
}

export function rollDraft(state, random) {
  const available = UPGRADES.filter((u) => ownedCount(state, u.id) < u.max);
  const pool = [...available];
  const draft = [];
  while (draft.length < 3 && pool.length > 0) {
    const i = Math.floor(random() * pool.length);
    draft.push(pool.splice(i, 1)[0]);
  }
  return draft;
}

export function applyUpgrade(state, upgrade) {
  upgrade.apply(state.player);
  state.upgradesOwned.push(upgrade.id);
}
