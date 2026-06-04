export const ICON = {};

ICON.ACTION_RATINGS = {
  sneak:    "ICON.Action.Sneak",
  traverse: "ICON.Action.Traverse",
  sense:    "ICON.Action.Sense",
  study:    "ICON.Action.Study",
  charm:    "ICON.Action.Charm",
  command:  "ICON.Action.Command",
  tinker:   "ICON.Action.Tinker",
  excel:    "ICON.Action.Excel",
  smash:    "ICON.Action.Smash",
  endure:   "ICON.Action.Endure",
};

ICON.ABILITY_TIERS = {
  apprentice: "ICON.Tier.Apprentice",
  I:          "ICON.Tier.I",
  II:         "ICON.Tier.II",
  IV:         "ICON.Tier.IV",
};

ICON.JOB_TYPES = {
  apprentice: "ICON.JobType.Apprentice",
  advanced:   "ICON.JobType.Advanced",
};

ICON.JOB_SOULS = {
  knight:    "ICON.Soul.Knight",
  warrior:   "ICON.Soul.Warrior",
  berserker: "ICON.Soul.Berserker",
  mercenary: "ICON.Soul.Mercenary",
  shadow:    "ICON.Soul.Shadow",
  gunner:    "ICON.Soul.Gunner",
  thief:     "ICON.Soul.Thief",
  ranger:    "ICON.Soul.Ranger",
  bard:      "ICON.Soul.Bard",
  witch:     "ICON.Soul.Witch",
  monk:      "ICON.Soul.Monk",
  oracle:    "ICON.Soul.Oracle",
  flame:     "ICON.Soul.Flame",
  earth:     "ICON.Soul.Earth",
  bolt:      "ICON.Soul.Bolt",
  water:     "ICON.Soul.Water",
};

ICON.KIN_TYPES = {
  thrynn:    "ICON.Kin.Thrynn",
  trogg:     "ICON.Kin.Trogg",
  beastfolk: "ICON.Kin.Beastfolk",
  xixo:      "ICON.Kin.Xixo",
};

ICON.CULTURES = {
  yeokin:     "ICON.Culture.Yeokin",
  islander:   "ICON.Culture.Islander",
  leggio:     "ICON.Culture.Leggio",
  churner:    "ICON.Culture.Churner",
  chronicler: "ICON.Culture.Chronicler",
  guilder:    "ICON.Culture.Guilder",
};

// Positive conditions
ICON.CONDITIONS_POSITIVE = [
  "armor",
  "evasion",
  "haste",
  "shield",
  "stealth",
  "strength",
  "sturdy",
  "unstoppable",
  "keen",
];

// Negative conditions
ICON.CONDITIONS_NEGATIVE = [
  "afflicted",
  "blind",
  "bloodied",
  "brand",
  "crisis",
  "daze",
  "immobile",
  "slow",
  "stun",
];

ICON.COMBAT_XP_TRIGGERS = [
  "Bloodied or slew an enemy",
  "You or an ally used a Limit Break",
  "You were taken out (reduced to 0 HP)",
  "Completed the encounter",
];

// XP needed to advance from a given level: level + 3
ICON.xpForLevel = (level) => level + 3;

// Ability slots available at a given character level
ICON.abilitySlotsAtLevel = (level) => (level === 0 ? 2 : Math.min(6, level + 2));

// Talent slots available at a given character level
ICON.talentSlotsAtLevel = (level) => Math.floor(level / 2);

// Ability tiers unlocked at a given character level
ICON.unlockedTiersAtLevel = (level) => {
  const tiers = ["apprentice"];
  if (level >= 1) tiers.push("I");
  if (level >= 2) tiers.push("II");
  if (level >= 4) tiers.push("IV");
  return tiers;
};
