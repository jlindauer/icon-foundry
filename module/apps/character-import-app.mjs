const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharacterImportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @param {object} [opts]
   *  @param {Actor}  [opts.actor]  If provided, update this actor instead of creating a new one. */
  constructor(opts = {}) {
    super(opts);
    this.#actor = opts.actor ?? null;
  }

  #actor;

  static DEFAULT_OPTIONS = {
    id: "icon-character-import",
    classes: ["icon", "character-import"],
    window: { resizable: false },
    position: { width: 560, height: "auto" },
    actions: { import: CharacterImportApp.#onImport },
  };

  static PARTS = {
    form: { template: "systems/icon/templates/apps/character-import.hbs" },
  };

  get title() {
    return this.#actor
      ? `Update "${this.#actor.name}" from Web App`
      : "Import Character from Web App";
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.isUpdate = !!this.#actor;
    ctx.actorName = this.#actor?.name ?? null;
    return ctx;
  }

  static async #onImport(event, target) {
    const textarea = this.element.querySelector("textarea[name='json']");
    const raw = textarea?.value?.trim();
    if (!raw) return ui.notifications.warn("Paste your character export JSON first.");

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return ui.notifications.error("Invalid JSON — check the format and try again.");
    }

    if (this.#actor) {
      await CharacterImportApp.updateCharacter(this.#actor, data);
    } else {
      await CharacterImportApp.importCharacter(data);
    }
    this.close();
  }

  // ── Shared helpers ───────────────────────────────────────────────────────

  /** Normalise the web-app JSON into a consistent internal shape. */
  static #normalise(data) {
    // Support both the designed format (version:"1") and the actual web-app
    // format (_schema:"icon-character/1") with flat fields.
    const isWebApp = data._schema?.startsWith("icon-character");

    if (isWebApp) {
      return {
        name:    data.name ?? "Imported Character",
        img:     data.img  ?? null,
        narrative: {
          kin:              data.kin             ?? "",
          culture:          data.culture         ?? "",
          bond:             data.bond            ?? "",
          bondActionChoice: data.bondActionChoice ?? "",
          actionRatings:    data.actionRatings   ?? {},
        },
        progression: {
          level:              data.level              ?? 0,
          currentXp:          data.currentXp          ?? 0,
          checkedXpTriggers:  data.checkedXpTriggers  ?? [],
          combatXpTriggers:   data.combatXpTriggers   ?? [],
        },
        resources: {
          hp:      { value: data.currentHp ?? 40, max: data.maxHp ?? 40 },
          vigor:   { value: data.currentVigor ?? 10, max: data.maxVigor ?? 10 },
          resolve: data.resolve ?? 0,
        },
        jobs:     data.jobs                ?? [],
        abilities: data.activeAbilityNames  ?? data.abilities ?? [],
        talents:   data.selectedTalentNames ?? data.talents   ?? [],
        conditions: data.conditions ?? [],
        notes:      data.notes      ?? "",
      };
    }

    // Designed format
    return {
      name:  data.name ?? "Imported Character",
      img:   data.img  ?? null,
      narrative: {
        kin:              data.narrative?.kin              ?? "",
        culture:          data.narrative?.culture          ?? "",
        bond:             data.narrative?.bond             ?? "",
        bondActionChoice: data.narrative?.bondActionChoice ?? "",
        actionRatings:    data.narrative?.actionRatings    ?? {},
      },
      progression: {
        level:             data.progression?.level             ?? 0,
        currentXp:         data.progression?.currentXp         ?? 0,
        checkedXpTriggers: data.progression?.checkedXpTriggers ?? [],
        combatXpTriggers:  data.progression?.combatXpTriggers  ?? [],
      },
      resources: {
        hp:      data.resources?.hp      ?? { value: 40, max: 40 },
        vigor:   data.resources?.vigor   ?? { value: 10, max: 10 },
        resolve: data.resources?.resolve ?? 0,
      },
      jobs:      data.jobs      ?? [],
      abilities: data.abilities ?? [],
      talents:   data.talents   ?? [],
      conditions: data.conditions ?? [],
      notes:      data.notes      ?? "",
    };
  }

  /** Search compendium packs and world items for an item by type + name. */
  static async #resolveByName(type, name) {
    for (const pack of game.packs) {
      if (pack.documentName !== "Item") continue;
      const index = await pack.getIndex();
      const entry = index.find((e) => e.name === name);
      if (entry) {
        const doc = await pack.getDocument(entry._id);
        if (doc.type === type) return doc;
      }
    }
    return game.items.find((i) => i.type === type && i.name === name) ?? null;
  }

  /** Embed jobs, abilities, and talents onto `actor`. Returns the combat update object. */
  static async #embedItems(actor, norm) {
    const jobEntries = [];
    let mainJobId = null;

    for (const jobDef of norm.jobs) {
      const source = await CharacterImportApp.#resolveByName("job", jobDef.name);
      if (!source) { ui.notifications.warn(`Job not found: "${jobDef.name}"`); continue; }
      const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
      jobEntries.push({ id: created.id, level: jobDef.level ?? 1 });
      if (jobDef.isMain) mainJobId = created.id;
    }
    if (jobEntries.length && !mainJobId) mainJobId = jobEntries[0].id;

    const abilityIds = [];
    for (const name of norm.abilities) {
      const source = await CharacterImportApp.#resolveByName("ability", name);
      if (!source) { ui.notifications.warn(`Ability not found: "${name}"`); continue; }
      const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
      abilityIds.push(created.id);
    }

    const talentIds = [];
    for (const name of norm.talents) {
      const source = await CharacterImportApp.#resolveByName("talent", name);
      if (!source) { ui.notifications.warn(`Talent not found: "${name}"`); continue; }
      const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
      talentIds.push(created.id);
    }

    return {
      "system.combat.jobs":            jobEntries,
      "system.combat.mainJobId":       mainJobId ?? "",
      "system.combat.activeAbilities": abilityIds,
      "system.combat.selectedTalents": talentIds,
    };
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Create a new character actor from a web-app export JSON object. */
  static async importCharacter(data) {
    const norm = CharacterImportApp.#normalise(data);
    ui.notifications.info("Importing character…");

    const actorData = {
      name: norm.name,
      type: "character",
      system: {
        narrative: {
          kin:              norm.narrative.kin,
          culture:          norm.narrative.culture,
          bondId:           norm.narrative.bond,
          bondActionChoice: norm.narrative.bondActionChoice,
          actionRatings:    norm.narrative.actionRatings,
        },
        progression: {
          level:             norm.progression.level,
          currentXp:         norm.progression.currentXp,
          checkedXpTriggers: norm.progression.checkedXpTriggers,
          combatXpTriggers:  norm.progression.combatXpTriggers,
        },
        resources: {
          hp:      norm.resources.hp,
          vigor:   norm.resources.vigor,
          resolve: norm.resources.resolve,
        },
        state: {
          conditions: norm.conditions,
          notes:      norm.notes,
        },
      },
    };

    if (norm.img) actorData.img = norm.img;

    const actor = await Actor.create(actorData);
    if (!actor) return ui.notifications.error("Failed to create actor.");

    const combatUpdate = await CharacterImportApp.#embedItems(actor, norm);
    await actor.update(combatUpdate);

    ui.notifications.info(`"${actor.name}" imported successfully!`);
    actor.sheet.render(true);
    return actor;
  }

  /** Update an existing actor in-place from a web-app export JSON object. */
  static async updateCharacter(actor, data) {
    const norm = CharacterImportApp.#normalise(data);
    ui.notifications.info(`Updating "${actor.name}"…`);

    // Remove all existing embedded jobs, abilities, and talents before re-importing
    const toDelete = actor.items
      .filter((i) => ["job", "ability", "talent"].includes(i.type))
      .map((i) => i.id);
    if (toDelete.length) await actor.deleteEmbeddedDocuments("Item", toDelete);

    const update = {
      "system.narrative.kin":              norm.narrative.kin,
      "system.narrative.culture":          norm.narrative.culture,
      "system.narrative.bondId":           norm.narrative.bond,
      "system.narrative.bondActionChoice": norm.narrative.bondActionChoice,
      "system.narrative.actionRatings":    norm.narrative.actionRatings,
      "system.progression.level":             norm.progression.level,
      "system.progression.currentXp":         norm.progression.currentXp,
      "system.progression.checkedXpTriggers": norm.progression.checkedXpTriggers,
      "system.progression.combatXpTriggers":  norm.progression.combatXpTriggers,
      "system.resources.hp":      norm.resources.hp,
      "system.resources.vigor":   norm.resources.vigor,
      "system.resources.resolve": norm.resources.resolve,
      "system.state.conditions":  norm.conditions,
      "system.state.notes":       norm.notes,
      // Clear combat arrays — will be rebuilt below
      "system.combat.jobs":            [],
      "system.combat.mainJobId":       "",
      "system.combat.activeAbilities": [],
      "system.combat.selectedTalents": [],
    };

    await actor.update(update);

    const combatUpdate = await CharacterImportApp.#embedItems(actor, norm);
    await actor.update(combatUpdate);

    ui.notifications.info(`"${actor.name}" updated successfully!`);
    actor.sheet.render(true);
    return actor;
  }
}
