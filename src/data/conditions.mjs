export const conditions = [
  // Positive
  { id: 'armor',       isPositive: true,  keyword: 'Armor (+)',       effect: 'Gain +1 DF when attacked.' },
  { id: 'evasion',     isPositive: true,  keyword: 'Evasion (+)',     effect: 'When attacked, roll 1d6. On a 5+, the attack automatically misses.' },
  { id: 'haste',       isPositive: true,  keyword: 'Haste (+)',       effect: 'When free moving, move +2 spaces.' },
  { id: 'shield',      isPositive: true,  keyword: 'Shield (+)',      effect: 'When attacked, gain +2 DF.' },
  { id: 'stealth',     isPositive: true,  keyword: 'Stealth (+)',     effect: 'As long as you have one stealth token, cannot be directly targeted by foes except from adjacent spaces. After using any ability, or when ending any turn adjacent to a foe, discard one.' },
  { id: 'strength',    isPositive: true,  keyword: 'Strength (+)',    effect: 'When attacking, gain +2 base damage.' },
  { id: 'sturdy',      isPositive: true,  keyword: 'Sturdy (+)',      effect: 'When you would be forcibly moved, ignore it.' },
  { id: 'unstoppable', isPositive: true,  keyword: 'Unstoppable',     effect: "Can't be forcibly moved. Immune to the effects of all negative statuses. Movement cannot be reduced or stopped for any reason." },
  { id: 'keen',        isPositive: true,  keyword: 'Keen (+)',        effect: 'When attacking, gain attack [+].' },
  // Negative
  { id: 'afflicted',   isPositive: false, keyword: 'Afflicted',       effect: 'Suffering from at least one negative status token.' },
  { id: 'blind',       isPositive: false, keyword: 'Blind (-)',       effect: 'When attacking, gain attack [-].' },
  { id: 'bloodied',    isPositive: false, keyword: 'Bloodied',        effect: 'At 50% HP or lower.' },
  { id: 'brand',       isPositive: false, keyword: 'Brand (-)',       effect: 'When attacked, gain -2 DF.' },
  { id: 'crisis',      isPositive: false, keyword: 'Crisis',          effect: 'At 25% HP or lower.' },
  { id: 'daze',        isPositive: false, keyword: 'Daze (-)',        effect: 'When attacking, gain -2 base damage.' },
  { id: 'immobile',    isPositive: false, keyword: 'Immobile',        effect: "Can't voluntarily move." },
  { id: 'slow',        isPositive: false, keyword: 'Slow (-)',        effect: 'When free moving, move -2 spaces.' },
  { id: 'stun',        isPositive: false, keyword: 'Stun (-)',        effect: 'When taking a turn, deal half damage this turn.' },
];
