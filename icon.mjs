import { ICON } from "./module/config.mjs";

// Data models
import { CharacterDataModel } from "./module/data/actor/character.mjs";
import { NpcDataModel }       from "./module/data/actor/npc.mjs";
import { AbilityDataModel }   from "./module/data/item/ability.mjs";
import { TalentDataModel }    from "./module/data/item/talent.mjs";
import { BondDataModel }      from "./module/data/item/bond.mjs";
import { JobDataModel }       from "./module/data/item/job.mjs";
import { ConditionDataModel } from "./module/data/item/condition.mjs";

// Documents
import { IconActor } from "./module/documents/actor.mjs";
import { IconItem }  from "./module/documents/item.mjs";

// Sheets
import { IconCharacterSheet } from "./module/sheets/actor/character-sheet.mjs";
import { IconNpcSheet }       from "./module/sheets/actor/npc-sheet.mjs";
import { IconItemSheet }      from "./module/sheets/item/item-sheet.mjs";

/* ── init ─────────────────────────────────────────────────────────────── */

Hooks.once("init", () => {
  console.log("ICON | Initializing ICON system");

  // Expose config globally
  game.icon = { config: ICON };

  // ── Documents ────────────────────────────────────────────────────────
  CONFIG.Actor.documentClass = IconActor;
  CONFIG.Item.documentClass  = IconItem;

  // ── Data models ──────────────────────────────────────────────────────
  CONFIG.Actor.dataModels = {
    character: CharacterDataModel,
    npc:       NpcDataModel,
  };

  CONFIG.Item.dataModels = {
    ability:   AbilityDataModel,
    talent:    TalentDataModel,
    bond:      BondDataModel,
    job:       JobDataModel,
    condition: ConditionDataModel,
  };

  // ── Token bar attributes ──────────────────────────────────────────────
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar:   ["resources.hp", "resources.vigor"],
      value: ["progression.level", "resources.resolve"],
    },
    npc: {
      bar:   ["resources.hp"],
      value: [],
    },
  };

  // ── Sheets ───────────────────────────────────────────────────────────
  DocumentSheetConfig.registerSheet(Actor, "icon", IconCharacterSheet, {
    types:       ["character"],
    makeDefault: true,
    label:       "ICON.SheetLabel.Character",
  });

  DocumentSheetConfig.registerSheet(Actor, "icon", IconNpcSheet, {
    types:       ["npc"],
    makeDefault: true,
    label:       "ICON.SheetLabel.Npc",
  });

  DocumentSheetConfig.registerSheet(Item, "icon", IconItemSheet, {
    types:       ["ability", "talent", "bond", "job", "condition"],
    makeDefault: true,
    label:       "ICON.SheetLabel.Item",
  });

  // ── Status effects ────────────────────────────────────────────────────
  CONFIG.statusEffects = [
    // Positive
    { id: "armor",       name: "ICON.Condition.Armor",       icon: "icons/svg/shield.svg" },
    { id: "evasion",     name: "ICON.Condition.Evasion",     icon: "icons/svg/degen.svg" },
    { id: "haste",       name: "ICON.Condition.Haste",       icon: "icons/svg/lightning.svg" },
    { id: "shield",      name: "ICON.Condition.Shield",      icon: "icons/svg/shield.svg" },
    { id: "stealth",     name: "ICON.Condition.Stealth",     icon: "icons/svg/eye.svg" },
    { id: "strength",    name: "ICON.Condition.Strength",    icon: "icons/svg/sword.svg" },
    { id: "sturdy",      name: "ICON.Condition.Sturdy",      icon: "icons/svg/anchor.svg" },
    { id: "unstoppable", name: "ICON.Condition.Unstoppable", icon: "icons/svg/angel.svg" },
    { id: "keen",        name: "ICON.Condition.Keen",        icon: "icons/svg/upgrade.svg" },
    // Negative
    { id: "afflicted",   name: "ICON.Condition.Afflicted",   icon: "icons/svg/poison.svg" },
    { id: "blind",       name: "ICON.Condition.Blind",       icon: "icons/svg/blind.svg" },
    { id: "bloodied",    name: "ICON.Condition.Bloodied",    icon: "icons/svg/blood.svg" },
    { id: "brand",       name: "ICON.Condition.Brand",       icon: "icons/svg/fire.svg" },
    { id: "crisis",      name: "ICON.Condition.Crisis",      icon: "icons/svg/skull.svg" },
    { id: "daze",        name: "ICON.Condition.Daze",        icon: "icons/svg/daze.svg" },
    { id: "immobile",    name: "ICON.Condition.Immobile",    icon: "icons/svg/net.svg" },
    { id: "slow",        name: "ICON.Condition.Slow",        icon: "icons/svg/downgrade.svg" },
    { id: "stun",        name: "ICON.Condition.Stun",        icon: "icons/svg/stun.svg" },
  ];

  // ── Handlebars helpers ────────────────────────────────────────────────
  _registerHandlebarsHelpers();

  // ── Preload templates ─────────────────────────────────────────────────
  _preloadTemplates();
});

/* ── Handlebars helpers ─────────────────────────────────────────────────── */

function _registerHandlebarsHelpers() {
  Handlebars.registerHelper("times", function(n, options) {
    let out = "";
    for (let i = 0; i < n; i++) {
      const data = Handlebars.createFrame(options.data || {});
      data.index = i;
      out += options.fn(this, { data });
    }
    return out;
  });

  Handlebars.registerHelper("add", (a, b) => a + b);

  Handlebars.registerHelper("includes", (arr, val) => Array.isArray(arr) && arr.includes(val));

  Handlebars.registerHelper("joinArr", (arr, sep) =>
    Array.isArray(arr) ? arr.join(sep) : ""
  );

  Handlebars.registerHelper("eq", (a, b) => a === b);

  Handlebars.registerHelper("select", function (selected, options) {
    const html = options.fn(this);
    return html.replace(
      new RegExp(`value="${selected}"`),
      `value="${selected}" selected`
    );
  });
}

/* ── Template preload ───────────────────────────────────────────────────── */

function _preloadTemplates() {
  return loadTemplates([
    "systems/icon/templates/actor/parts/header.hbs",
    "systems/icon/templates/actor/parts/tab-narrative.hbs",
    "systems/icon/templates/actor/parts/tab-combat.hbs",
    "systems/icon/templates/actor/parts/tab-notes.hbs",
    "systems/icon/templates/actor/npc-sheet.hbs",
    "systems/icon/templates/item/item-sheet.hbs",
  ]);
}
