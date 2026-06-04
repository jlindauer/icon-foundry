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

// Apps
import { CharacterImportApp } from "./module/apps/character-import-app.mjs";

/* ── init ─────────────────────────────────────────────────────────────── */

Hooks.once("init", () => {
  console.log("ICON | Initializing ICON system");

  // Expose config and import API globally
  game.icon = {
    config:            ICON,
    importCharacter:   (data) => CharacterImportApp.importCharacter(data),
    openImportDialog:  () => new CharacterImportApp().render(true),
  };

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

  // ── Status effects (match web app conditions) ─────────────────────────
  CONFIG.statusEffects = [
    { id: "prone",       name: "ICON.Condition.Prone",       icon: "icons/svg/falling.svg" },
    { id: "slowed",      name: "ICON.Condition.Slowed",      icon: "icons/svg/downgrade.svg" },
    { id: "immobilized", name: "ICON.Condition.Immobilized", icon: "icons/svg/net.svg" },
    { id: "blinded",     name: "ICON.Condition.Blinded",     icon: "icons/svg/blind.svg" },
    { id: "dazed",       name: "ICON.Condition.Dazed",       icon: "icons/svg/daze.svg" },
    { id: "weakened",    name: "ICON.Condition.Weakened",    icon: "icons/svg/downgrade.svg" },
    { id: "burning",     name: "ICON.Condition.Burning",     icon: "icons/svg/fire.svg" },
    { id: "bleeding",    name: "ICON.Condition.Bleeding",    icon: "icons/svg/blood.svg" },
    { id: "stunned",     name: "ICON.Condition.Stunned",     icon: "icons/svg/stun.svg" },
    { id: "exposed",     name: "ICON.Condition.Exposed",     icon: "icons/svg/degen.svg" },
  ];

  // ── Handlebars helpers ────────────────────────────────────────────────
  _registerHandlebarsHelpers();

  // ── Preload templates ─────────────────────────────────────────────────
  _preloadTemplates();
});

/* ── Actors sidebar: inject Import button ───────────────────────────────── */

function _injectImportButton(root) {
  if (!root) return;
  if (root instanceof jQuery) root = root[0];

  // v14 sidebar: <header class="directory-header"> > <div class="header-actions action-buttons">
  const toolbar = root.querySelector(".header-actions")
    ?? root.querySelector(".directory-header .action-buttons")
    ?? root.querySelector(".action-buttons");

  if (!toolbar || toolbar.querySelector(".icon-import-btn")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-import-btn";
  btn.title = "Import character from ICON web app";
  btn.innerHTML = '<i class="fas fa-file-import"></i> Import';
  btn.addEventListener("click", () => new CharacterImportApp().render(true));
  toolbar.append(btn);
}

// Fires on every render/re-render of the actors tab
Hooks.on("renderActorDirectory", (_app, html) => _injectImportButton(html));

Hooks.once("ready", () => {
  // Direct DOM fallback — the actors tab section is always #actors in v14
  const section = document.querySelector("#actors") ?? ui.actors?.element;
  _injectImportButton(section);
});

/* ── Ability chat card — wire up inline roll buttons ────────────────────── */

Hooks.on("renderChatMessage", (message, html, _data) => {
  const el = html instanceof HTMLElement ? html : html[0];
  if (!el) return;

  function getCardContext(btn) {
    const card    = btn.closest(".icon-ability-card");
    const actorId = card?.dataset.actorId;
    const actor   = actorId ? game.actors.get(actorId) : null;
    const name    = card?.querySelector(".icon-ability-card-name")?.textContent?.trim() ?? "";
    return { actor, name };
  }

  // Damage / dice formula rolls
  el.querySelectorAll(".icon-roll-btn[data-formula]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { actor, name } = getCardContext(btn);
      const formula = btn.dataset.formula;
      const roll = await new Roll(formula).evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
        flavor:  name ? `${name} — ${formula}` : formula,
      });
    });
  });

  // To-hit action rating rolls (Nd6kh, 2d6kl at 0)
  el.querySelectorAll(".icon-action-roll-btn[data-value]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { actor, name } = getCardContext(btn);
      const value   = parseInt(btn.dataset.value) || 0;
      const label   = btn.dataset.label ?? "Attack";
      const formula = value === 0 ? "2d6kl" : `${value}d6kh`;
      const roll = await new Roll(formula).evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor ?? undefined }),
        flavor:  name ? `${name} — ${label}` : label,
      });
    });
  });
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
    "systems/icon/templates/apps/character-import.hbs",
    "systems/icon/templates/chat/ability-card.hbs",
  ]);
}
