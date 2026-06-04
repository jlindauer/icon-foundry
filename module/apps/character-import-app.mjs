const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CharacterImportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "icon-character-import",
    classes: ["icon", "character-import"],
    window: { title: "Import Character from Web App", resizable: false },
    position: { width: 560, height: "auto" },
    actions: { import: CharacterImportApp.#onImport },
  };

  static PARTS = {
    form: { template: "systems/icon/templates/apps/character-import.hbs" },
  };

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

    await CharacterImportApp.importCharacter(data);
    this.close();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Create a Foundry character actor from a web-app export JSON object.
   * Searches all compendium packs (then world items) to resolve items by name.
   */
  static async importCharacter(data) {
    if (data.version !== "1") {
      ui.notifications.warn(`Unknown export version "${data.version}". Attempting import anyway.`);
    }

    ui.notifications.info("Importing character…");

    // ── Build core actor data ────────────────────────────────────────────
    const actorData = {
      name: data.name ?? "Imported Character",
      type: "character",
      system: {
        narrative: {
          kin:           data.narrative?.kin     ?? "",
          culture:       data.narrative?.culture ?? "",
          bondId:        data.narrative?.bond    ?? "",
          actionRatings: data.narrative?.actionRatings ?? {},
        },
        progression: {
          level:     data.progression?.level     ?? 0,
          currentXp: data.progression?.currentXp ?? 0,
        },
        resources: {
          hp:      data.resources?.hp      ?? { value: 40, max: 40 },
          vigor:   data.resources?.vigor   ?? { value: 10, max: 10 },
          resolve: data.resources?.resolve ?? 0,
        },
      },
    };

    if (data.img) actorData.img = data.img;

    const actor = await Actor.create(actorData);
    if (!actor) return ui.notifications.error("Failed to create actor.");

    // ── Helpers ──────────────────────────────────────────────────────────

    const resolveByName = async (type, name) => {
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
    };

    // ── Embed jobs ───────────────────────────────────────────────────────
    const jobEntries = [];
    let mainJobId = null;

    for (const jobDef of (data.jobs ?? [])) {
      const source = await resolveByName("job", jobDef.name);
      if (!source) {
        ui.notifications.warn(`Job not found in compendiums: "${jobDef.name}"`);
        continue;
      }
      const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
      jobEntries.push({ id: created.id, level: jobDef.level ?? 1 });
      if (jobDef.isMain) mainJobId = created.id;
    }

    if (jobEntries.length && !mainJobId) mainJobId = jobEntries[0].id;

    // ── Embed abilities ──────────────────────────────────────────────────
    const abilityIds = [];
    for (const abilityName of (data.abilities ?? [])) {
      const source = await resolveByName("ability", abilityName);
      if (!source) {
        ui.notifications.warn(`Ability not found in compendiums: "${abilityName}"`);
        continue;
      }
      const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
      abilityIds.push(created.id);
    }

    // ── Embed talents ────────────────────────────────────────────────────
    const talentIds = [];
    for (const talentName of (data.talents ?? [])) {
      const source = await resolveByName("talent", talentName);
      if (!source) {
        ui.notifications.warn(`Talent not found in compendiums: "${talentName}"`);
        continue;
      }
      const [created] = await actor.createEmbeddedDocuments("Item", [source.toObject()]);
      talentIds.push(created.id);
    }

    // ── Wire up combat references ────────────────────────────────────────
    await actor.update({
      "system.combat.jobs":            jobEntries,
      "system.combat.mainJobId":       mainJobId ?? "",
      "system.combat.activeAbilities": abilityIds,
      "system.combat.selectedTalents": talentIds,
    });

    ui.notifications.info(`"${actor.name}" imported successfully!`);
    actor.sheet.render(true);
    return actor;
  }
}
