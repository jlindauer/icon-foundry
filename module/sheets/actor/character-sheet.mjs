import { ICON } from "../../config.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class IconCharacterSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icon", "actor", "character"],
    position: { width: 760, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      toggleCondition:   IconCharacterSheet.#onToggleCondition,
      checkXpTrigger:    IconCharacterSheet.#onCheckXpTrigger,
      gainXp:            IconCharacterSheet.#onGainXp,
      removeAbility:     IconCharacterSheet.#onRemoveAbility,
      removeTalent:      IconCharacterSheet.#onRemoveTalent,
      rollAction:        IconCharacterSheet.#onRollAction,
      setActionRating:   IconCharacterSheet.#onSetActionRating,
      openImport:        IconCharacterSheet.#onOpenImport,
      rollAbility:       IconCharacterSheet.#onRollAbility,
      setStrain:         IconCharacterSheet.#onSetStrain,
      setEffort:         IconCharacterSheet.#onSetEffort,
      camp:              IconCharacterSheet.#onCamp,
      addBurden:         IconCharacterSheet.#onAddBurden,
      deleteBurden:      IconCharacterSheet.#onDeleteBurden,
      tickBurden:        IconCharacterSheet.#onTickBurden,
      addSessionNote:    IconCharacterSheet.#onAddSessionNote,
      deleteSessionNote: IconCharacterSheet.#onDeleteSessionNote,
      postBondCard:      IconCharacterSheet.#onPostBondCard,
      selectGearKit:     IconCharacterSheet.#onSelectGearKit,
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

  // ── Title ────────────────────────────────────────────────────────────────

  get title() {
    return this.document.name;
  }

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
        context.xpForNext = system.xpForNextLevel;
        context.xpPercent = Math.round(Math.min(system.progression.currentXp / system.xpForNextLevel, 1) * 100);
        context.defense = mainJobItem?.system?.stats?.defense ?? null;
        context.freeMove = mainJobItem?.system?.stats?.freeMove ?? null;
        context.isBloodied = system.isBloodied;
        context.isInCrisis = system.isInCrisis;
        break;

      case "narrative": {
        context.tab           = context.tabs.narrative;
        context.actionRatings = this._prepareActionRatings(system);
        const bondData        = await this._prepareBondData(actor, system);
        context.bondData      = bondData;
        context.idealRows     = Array.from({ length: 3 }, (_, i) => ({
          index:    i,
          text:     bondData?.ideals?.[i] || null,
          fallback: `Ideal ${i + 1}`,
        }));
        // Strain / Effort
        context.maxStrain  = bondData?.strain  ?? 0;
        context.maxEffort  = bondData?.effort  ?? 0;
        context.curStrain  = Math.min(system.strain?.current ?? 0, context.maxStrain);
        context.curEffort  = Math.min(system.strain?.effort  ?? context.maxEffort, context.maxEffort);
        context.isBroken   = context.maxStrain > 0 && context.curStrain >= context.maxStrain;
        context.isExhausted = context.maxEffort > 0 && context.curEffort <= 0;
        context.strainSegs = Array.from({ length: context.maxStrain }, (_, i) => i < context.curStrain);
        context.effortDots = Array.from({ length: context.maxEffort }, (_, i) => i < context.curEffort);
        context.burdens    = system.burdens ?? [];
        break;
      }

      case "combat":
        context.tab              = context.tabs.combat;
        context.abilityGroups    = this._prepareAbilitiesByTier(actor);
        context.selectedTalents  = await this._prepareTalents(actor);
        context.conditions       = this._prepareConditions(system);
        context.jobs             = this._prepareJobs(system);
        context.isBloodied       = system.isBloodied;
        context.isInCrisis       = system.isInCrisis;
        context.xpForNext        = system.xpForNextLevel;
        context.xpPercent        = Math.round(Math.min(system.progression.currentXp / system.xpForNextLevel, 1) * 100);
        context.abilitySlots     = system.abilitySlots;
        context.talentSlots      = system.talentSlots;
        context.combatXpTriggers = ICON.COMBAT_XP_TRIGGERS;
        context.totalAbilities   = (system.combat.activeAbilities ?? []).length;
        context.basicAttacks     = context.jobs.filter((j) => j.basicAttack).map((j) => j.basicAttack);
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
    const bondAction = system.narrative.bondActionChoice ?? "";
    return Object.entries(ICON.ACTION_RATINGS).map(([key, label]) => ({
      key,
      label,
      value: system.narrative.actionRatings[key] ?? 0,
      pips:  Array.from({ length: 5 }, (_, i) => i < (system.narrative.actionRatings[key] ?? 0)),
      isBondAction: bondAction.toLowerCase() === key.toLowerCase(),
    }));
  }

  /** Resolve a bond item by name from embedded items or compendiums. */
  async _resolveBond(actor, system) {
    const bondName = system.narrative.bondId;
    if (!bondName) return null;
    let bondItem = actor.items.find((i) => i.type === "bond" && i.name === bondName);
    if (!bondItem) {
      for (const pack of game.packs) {
        if (pack.documentName !== "Item") continue;
        const index = await pack.getIndex();
        const entry = index.find((e) => e.name === bondName);
        if (entry) {
          const doc = await pack.getDocument(entry._id);
          if (doc.type === "bond") { bondItem = doc; break; }
        }
      }
    }
    return bondItem ?? null;
  }

  async _prepareBondData(actor, system) {
    const bondItem = await this._resolveBond(actor, system);
    if (!bondItem) return null;

    const s = bondItem.system;
    const selectedPowerNames = new Set(system.narrative.selectedPowers ?? []);
    const selectedGearKit    = system.narrative.selectedGearKit ?? "";

    const activePowers = (s.powers ?? []).filter((p) => selectedPowerNames.has(p.name));
    const gearKits     = (s.gearKits ?? []).map((k) => ({
      ...k,
      isPreferred: k.name === selectedGearKit,
    }));

    const characterIdeals = system.narrative.ideals ?? [];
    return {
      name:           bondItem.name,
      description:    s.description    ?? "",
      secondWind:     s.secondWind     ?? "",
      specialAbility: s.specialAbility,
      effort:         s.effort         ?? 0,
      strain:         s.strain         ?? 0,
      ideals:         characterIdeals.length ? characterIdeals : (s.ideals ?? []),
      powers:         activePowers,
      gearKits,
    };
  }

  /** Group active abilities by tier for the combat tab, appending limit breaks from jobs. */
  _prepareAbilitiesByTier(actor) {
    const ids    = actor.system.combat.activeAbilities ?? [];
    const items  = ids.map((id) => {
      const item = actor.items.get(id);
      if (!item) return null;
      return { _source: "item", id: item.id, name: item.name, system: item.system };
    }).filter(Boolean);
    const order  = ["apprentice", "I", "II", "IV"];
    const groups = {};
    for (const item of items) {
      const tier = item.system?.tier ?? "apprentice";
      (groups[tier] ??= []).push(item);
    }
    const result = order
      .filter((t) => groups[t]?.length)
      .map((tier) => ({ tier, label: `ICON.Tier.${tier === "apprentice" ? "Apprentice" : tier}`, abilities: groups[tier] }));

    const limitBreaks = (actor.system.combat.jobs ?? []).flatMap((j) => {
      const jobItem = actor.items.get(j.id);
      const lb      = jobItem?.system?.limitBreak;
      if (!lb?.name && !lb?.effect) return [];
      return [{
        id:        `${j.id}-lb`,
        name:      lb.name   || `${jobItem.name} Limit Break`,
        _source:   "jobAbility",
        _jobId:    j.id,
        _abilType: "limitBreak",
        system:    {
          cost:   lb.cost   || "1 action, 2 resolve",
          tags:   lb.tags   || [],
          flavor: lb.flavor || "",
          effect: lb.effect || "",
        },
      }];
    });

    if (limitBreaks.length) result.push({ tier: "limitBreak", label: "ICON.Tier.LimitBreak", abilities: limitBreaks });
    return result;
  }

  async _prepareTalents(actor) {
    const ids = actor.system.combat.selectedTalents ?? [];
    return ids.map((id) => actor.items.get(id) ?? { id, name: id, system: {} });
  }

  _prepareConditions(system) {
    const active = new Set(system.state.conditions ?? []);
    return ICON.CONDITIONS.map((id) => ({
      id,
      label:  `ICON.Condition.${id.charAt(0).toUpperCase() + id.slice(1)}`,
      active: active.has(id),
    }));
  }

  _prepareJobs(system) {
    return (system.combat.jobs ?? []).map((j) => {
      const item = this.document.items.get(j.id);
      const ba   = item?.system?.basicAttack;
      const lb   = item?.system?.limitBreak;
      const tr   = item?.system?.trait;
      return {
        id:     j.id,
        name:   item?.name ?? j.id,
        level:  j.level,
        isMain: j.id === system.combat.mainJobId,
        trait: (tr?.name || tr?.effect) ? { name: tr.name || "Trait", effect: tr.effect || "" } : null,
        basicAttack: (ba?.name || ba?.effect) ? {
          name:   ba.name   || "Basic Attack",
          cost:   ba.cost   || "1 action",
          tags:   ba.tags   || [],
          effect: ba.effect || "",
          jobId:  j.id,
        } : null,
        limitBreak: (lb?.name || lb?.effect) ? {
          name:   lb.name   || "Limit Break",
          cost:   lb.cost   || "1 action, 2 resolve",
          tags:   lb.tags   || [],
          flavor: lb.flavor || "",
          effect: lb.effect || "",
          jobId:  j.id,
        } : null,
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

    // Clock size picker toggle for burden add form
    this.element.querySelectorAll(".clock-size-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.closest(".clock-picker").querySelectorAll(".clock-size-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });

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

  static async #onOpenImport(event, target) {
    const { CharacterImportApp } = await import("../../apps/character-import-app.mjs");
    new CharacterImportApp({ actor: this.document }).render(true);
  }

  static async #onRollAbility(event, target) {
    const actor = this.document;
    let name, cost, tags, flavor, effect;

    if (target.dataset.itemId) {
      const item = actor.items.get(target.dataset.itemId);
      if (!item) return;
      name   = item.name;
      cost   = item.system.cost;
      tags   = item.system.tags ?? [];
      flavor = item.system.flavor;
      effect = item.system.effect;
    } else if (target.dataset.jobId) {
      const jobItem  = actor.items.get(target.dataset.jobId);
      if (!jobItem) return;
      const ab = jobItem.system[target.dataset.abilType];
      if (!ab) return;
      name   = ab.name;
      cost   = ab.cost;
      tags   = ab.tags ?? [];
      flavor = ab.flavor;
      effect = ab.effect;
    } else {
      return;
    }

    // Extract dice formulas from plain text of the effect (e.g. "Hit: +1d6", "1d3+1 damage")
    const plain   = (effect ?? "").replace(/<[^>]+>/g, " ");
    const seen    = new Set();
    const rollableFormulas = [];
    for (const m of plain.matchAll(/\b(\d+d\d+(?:[+-]\d+)?)\b/gi)) {
      const f = m[1];
      if (!seen.has(f.toLowerCase())) { seen.add(f.toLowerCase()); rollableFormulas.push(f); }
    }

    const isAttack = (tags ?? []).some((t) => t.toLowerCase() === "attack");

    const content = await renderTemplate(
      "systems/icon/templates/chat/ability-card.hbs",
      { name, cost, tags: tags ?? [], flavor, effect, actorName: actor.name, actorId: actor.id, isAttack, rollableFormulas },
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
    });
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

  // Strain: clicking segment i → set to i (if already filled) or i+1
  static async #onSetStrain(event, target) {
    const i   = parseInt(target.dataset.index);
    const cur = this.document.system.strain?.current ?? 0;
    await this.document.update({ "system.strain.current": i < cur ? i : i + 1 });
  }

  // Effort: clicking dot i → set to i (if already filled) or i+1
  static async #onSetEffort(event, target) {
    const i    = parseInt(target.dataset.index);
    const cur  = this.document.system.strain?.effort ?? 0;
    await this.document.update({ "system.strain.effort": i < cur ? i : i + 1 });
  }

  // Camp: reset strain to 0, restore effort to max from bond
  static async #onCamp(event, target) {
    const bondItem  = await this._resolveBond(this.document, this.document.system);
    const maxEffort = bondItem?.system?.effort ?? 0;
    await this.document.update({ "system.strain.current": 0, "system.strain.effort": maxEffort });
  }

  static async #onAddBurden(event, target) {
    const name      = target.closest("[data-burden-form]")?.querySelector("[data-burden-name]")?.value?.trim();
    const clockSize = parseInt(target.closest("[data-burden-form]")?.querySelector("[data-burden-clock].selected")?.dataset?.burdenClock ?? 4);
    if (!name) return ui.notifications.warn("Enter a burden name first.");
    const burdens = [...(this.document.system.burdens ?? [])];
    burdens.push({ id: foundry.utils.randomID(), name, clockSize, ticked: 0 });
    await this.document.update({ "system.burdens": burdens });
  }

  static async #onDeleteBurden(event, target) {
    const id      = target.dataset.burdenId;
    const burdens = (this.document.system.burdens ?? []).filter((b) => b.id !== id);
    await this.document.update({ "system.burdens": burdens });
  }

  // Clicking clock segment i → set to i (if already filled) or i+1
  static async #onTickBurden(event, target) {
    const burdenId = target.dataset.burdenId;
    const i        = parseInt(target.dataset.index);
    const burdens  = (this.document.system.burdens ?? []).map((b) => {
      if (b.id !== burdenId) return b;
      return { ...b, ticked: i < b.ticked ? i : i + 1 };
    });
    await this.document.update({ "system.burdens": burdens });
  }

  static async #onAddSessionNote(event, target) {
    const today = new Date().toISOString().slice(0, 10);
    const notes = [{ id: foundry.utils.randomID(), date: today, content: "" }, ...(this.document.system.state.sessionNotes ?? [])];
    await this.document.update({ "system.state.sessionNotes": notes });
  }

  static async #onDeleteSessionNote(event, target) {
    const id    = target.dataset.noteId;
    const notes = (this.document.system.state.sessionNotes ?? []).filter((n) => n.id !== id);
    await this.document.update({ "system.state.sessionNotes": notes });
  }

  static async #onPostBondCard(event, target) {
    const actor  = this.document;
    const name   = target.dataset.name   ?? "";
    const effect = target.dataset.effect ?? "";
    const tags   = target.dataset.gambit === "true" ? ["Gambit"] : [];
    const content = await renderTemplate(
      "systems/icon/templates/chat/ability-card.hbs",
      { name, cost: null, tags, flavor: null, effect, actorName: actor.name, actorId: actor.id, isAttack: false, rollableFormulas: [] },
    );
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }

  static async #onSelectGearKit(event, target) {
    const kitName = target.dataset.kitName ?? "";
    const current = this.document.system.narrative.selectedGearKit ?? "";
    await this.document.update({
      "system.narrative.selectedGearKit": current === kitName ? "" : kitName,
    });
  }
}
