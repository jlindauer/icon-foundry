import { ICON } from "../../config.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class IconCharacterSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icon", "actor", "character"],
    position: { width: 760, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      toggleCondition:  IconCharacterSheet.#onToggleCondition,
      checkXpTrigger:   IconCharacterSheet.#onCheckXpTrigger,
      gainXp:           IconCharacterSheet.#onGainXp,
      removeAbility:    IconCharacterSheet.#onRemoveAbility,
      removeTalent:     IconCharacterSheet.#onRemoveTalent,
      rollAction:       IconCharacterSheet.#onRollAction,
      setActionRating:  IconCharacterSheet.#onSetActionRating,
    },
  };

  static PARTS = {
    header: {
      template: "systems/icon/templates/actor/parts/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    narrative: {
      template: "systems/icon/templates/actor/parts/tab-narrative.hbs",
      scrollable: [""],
    },
    combat: {
      template: "systems/icon/templates/actor/parts/tab-combat.hbs",
      scrollable: [""],
    },
    notes: {
      template: "systems/icon/templates/actor/parts/tab-notes.hbs",
      scrollable: [""],
    },
  };

  tabGroups = { primary: "narrative" };

  #dragDrop = new foundry.applications.ux.DragDrop.implementation({
    permissions: { drop: () => this.isEditable },
    callbacks:   { drop: (event) => this._onDrop(event) },
  });

  // ── Context preparation ──────────────────────────────────────────────────

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;

    return {
      ...context,
      actor,
      system,
      tabs: this._getTabs(),
      config: ICON,
      isEditable: this.isEditable,
    };
  }

  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    const actor = this.document;
    const system = actor.system;

    const mainJobItem = (() => {
      const mainId = system.combat.mainJobId;
      if (!mainId) return null;
      return actor.items.get(mainId) ?? null;
    })();

    switch (partId) {
      case "header":
        context.tab = undefined;
        context.mainJobName = mainJobItem?.name ?? null;
        context.jobClassName = null;
        context.xpForNext = system.xpForNextLevel;
        context.xpPercent = Math.round(Math.min(system.progression.currentXp / system.xpForNextLevel, 1) * 100);
        context.defense = mainJobItem?.system?.stats?.defense ?? null;
        context.freeMove = mainJobItem?.system?.stats?.freeMove ?? null;
        break;

      case "narrative":
        context.tab = context.tabs.narrative;
        context.actionRatings = this._prepareActionRatings(system);
        context.xpForNext = system.xpForNextLevel;
        context.xpPercent = Math.round(Math.min(system.progression.currentXp / system.xpForNextLevel, 1) * 100);
        context.abilitySlots = system.abilitySlots;
        context.talentSlots = system.talentSlots;
        break;

      case "combat":
        context.tab = context.tabs.combat;
        context.activeAbilities = await this._prepareAbilities(actor);
        context.selectedTalents = await this._prepareTalents(actor);
        context.conditions = this._prepareConditions(system);
        context.jobs = this._prepareJobs(system);
        context.isBloodied = system.isBloodied;
        context.isInCrisis = system.isInCrisis;
        break;

      case "notes":
        context.tab = context.tabs.notes;
        break;
    }

    return context;
  }

  _getTabs() {
    const definitions = {
      narrative: { id: "narrative", group: "primary", icon: "fa-scroll",   label: "ICON.Tab.Narrative" },
      combat:    { id: "combat",    group: "primary", icon: "fa-sword",     label: "ICON.Tab.Combat" },
      notes:     { id: "notes",     group: "primary", icon: "fa-pencil-alt",label: "ICON.Tab.Notes" },
    };

    for (const tab of Object.values(definitions)) {
      tab.active   = this.tabGroups[tab.group] === tab.id;
      tab.cssClass = tab.active ? "active" : "";
    }

    return definitions;
  }

  _prepareActionRatings(system) {
    return Object.entries(ICON.ACTION_RATINGS).map(([key, label]) => ({
      key,
      label,
      value: system.narrative.actionRatings[key] ?? 0,
      pips: Array.from({ length: 5 }, (_, i) => i < (system.narrative.actionRatings[key] ?? 0)),
    }));
  }

  async _prepareAbilities(actor) {
    const ids = actor.system.combat.activeAbilities ?? [];
    return ids.map((id) => actor.items.get(id) ?? { id, name: id, system: {} });
  }

  async _prepareTalents(actor) {
    const ids = actor.system.combat.selectedTalents ?? [];
    return ids.map((id) => actor.items.get(id) ?? { id, name: id, system: {} });
  }

  _prepareConditions(system) {
    const active = new Set(system.state.conditions ?? []);
    const all = [...ICON.CONDITIONS_POSITIVE, ...ICON.CONDITIONS_NEGATIVE];
    return all.map((id) => ({
      id,
      label: `ICON.Condition.${id.charAt(0).toUpperCase() + id.slice(1)}`,
      active: active.has(id),
      isPositive: ICON.CONDITIONS_POSITIVE.includes(id),
    }));
  }

  _prepareJobs(system) {
    return (system.combat.jobs ?? []).map((j) => {
      const item = this.document.items.get(j.id);
      return {
        id:          j.id,
        name:        item?.name ?? j.id,
        level:       j.level,
        isMain:      j.id === system.combat.mainJobId,
        trait:       item?.system?.trait?.effect ?? null,
        basicAttack: item?.system?.basicAttack?.effect ?? null,
        limitBreak:  item?.system?.limitBreak?.effect ?? null,
      };
    });
  }

  // ── Render hook ───────────────────────────────────────────────────────────

  _onRender(context, options) {
    // Set initial active tab (changeTab handles subsequent clicks)
    const activeTab = this.tabGroups.primary ?? "narrative";
    this.element.querySelectorAll(".tab[data-group='primary']").forEach((el) => {
      el.classList.toggle("active", el.dataset.tab === activeTab);
    });

    // Bind drag-drop to the whole sheet; _onDrop uses closest() to identify the zone
    this.#dragDrop.bind(this.element);

    // Inline HP/Vigor editing on click
    this.element.querySelectorAll(".resource-value[data-field]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        const field = ev.currentTarget.dataset.field;
        const input = document.createElement("input");
        input.type  = "number";
        input.value = ev.currentTarget.textContent.trim();
        input.className = "resource-input";
        ev.currentTarget.replaceWith(input);
        input.focus();
        input.select();
        input.addEventListener("blur", async () => {
          await this.document.update({ [field]: parseInt(input.value) || 0 });
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") input.blur();
          if (e.key === "Escape") this.render();
        });
      });
    });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  async _onDrop(event) {
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch { return; }

    if (data.type !== "Item") return;

    const sourceItem = await fromUuid(data.uuid);
    if (!sourceItem) return;

    switch (sourceItem.type) {
      case "ability": return this.#dropAbility(sourceItem);
      case "talent":  return this.#dropTalent(sourceItem);
      case "bond":    return this.#dropBond(sourceItem);
      case "job":     return this.#dropJob(sourceItem);
    }
  }

  async #dropAbility(sourceItem) {
    const current  = this.document.system.combat.activeAbilities ?? [];
    const maxSlots = this.document.system.abilitySlots;
    if (current.includes(sourceItem.id)) return;
    if (current.length >= maxSlots) {
      ui.notifications.warn(game.i18n.localize("ICON.Warning.AbilitySlotsMax"));
      return;
    }
    const [created] = await this.document.createEmbeddedDocuments("Item", [sourceItem.toObject()]);
    await this.document.update({ "system.combat.activeAbilities": [...current, created.id] });
  }

  async #dropTalent(sourceItem) {
    const current  = this.document.system.combat.selectedTalents ?? [];
    const maxSlots = this.document.system.talentSlots;
    if (current.includes(sourceItem.id)) return;
    if (current.length >= maxSlots) {
      ui.notifications.warn(game.i18n.localize("ICON.Warning.TalentSlotsMax"));
      return;
    }
    const [created] = await this.document.createEmbeddedDocuments("Item", [sourceItem.toObject()]);
    await this.document.update({ "system.combat.selectedTalents": [...current, created.id] });
  }

  async #dropBond(sourceItem) {
    await this.document.update({ "system.narrative.bondId": sourceItem.name });
  }

  async #dropJob(sourceItem) {
    const current = this.document.system.combat.jobs ?? [];
    if (current.some((j) => j.id === sourceItem.id)) return;
    const [created] = await this.document.createEmbeddedDocuments("Item", [sourceItem.toObject()]);
    const update = { "system.combat.jobs": [...current, { id: created.id, level: 1 }] };
    if (!this.document.system.combat.mainJobId) update["system.combat.mainJobId"] = created.id;
    await this.document.update(update);
  }

  // ── Static action handlers ───────────────────────────────────────────────

  static async #onToggleCondition(event, target) {
    const id = target.dataset.conditionId;
    if (id) await this.document.toggleCondition(id);
  }

  static async #onCheckXpTrigger(event, target) {
    const index  = parseInt(target.dataset.index);
    const type   = target.dataset.triggerType; // "narrative" | "combat"
    const field  = type === "combat"
      ? "system.progression.combatXpTriggers"
      : "system.progression.checkedXpTriggers";
    const current = [...(type === "combat"
      ? this.document.system.progression.combatXpTriggers
      : this.document.system.progression.checkedXpTriggers)];

    const pos = current.indexOf(index);
    if (pos === -1) {
      current.push(index);
      await this.document.gainXp(1);
    } else {
      current.splice(pos, 1);
    }
    await this.document.update({ [field]: current });
  }

  static async #onGainXp(event, target) {
    await this.document.gainXp(1);
  }

  static async #onRemoveAbility(event, target) {
    const id = target.dataset.itemId;
    const abilities = (this.document.system.combat.activeAbilities ?? []).filter((a) => a !== id);
    await this.document.update({ "system.combat.activeAbilities": abilities });
    await this.document.deleteEmbeddedDocuments("Item", [id]);
  }

  static async #onRemoveTalent(event, target) {
    const id = target.dataset.itemId;
    const talents = (this.document.system.combat.selectedTalents ?? []).filter((t) => t !== id);
    await this.document.update({ "system.combat.selectedTalents": talents });
    await this.document.deleteEmbeddedDocuments("Item", [id]);
  }

  static async #onSetActionRating(event, target) {
    const key      = target.dataset.actionKey;
    const pipIndex = parseInt(target.dataset.pipIndex);
    const current  = this.document.system.narrative.actionRatings[key] ?? 0;
    // Clicking the last filled pip decrements by 1; otherwise set to pip+1
    const newValue = current === pipIndex + 1 ? pipIndex : pipIndex + 1;
    await this.document.update({ [`system.narrative.actionRatings.${key}`]: newValue });
  }

  static async #onRollAction(event, target) {
    const key   = target.dataset.action_key;
    const value = parseInt(target.dataset.value) || 0;
    const label = game.i18n.localize(target.dataset.label);
    const actor = this.document;

    // Pool = value dice, keep highest; on 0 rating roll 2d6 keep lowest
    let formula;
    if (value === 0) formula = "2d6kl";
    else formula = `${value}d6kh`;

    const roll = await new Roll(formula).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor:  `${actor.name} — ${label}`,
    });
  }
}
