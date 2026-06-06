const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export class FoeImportApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "icon-foe-import",
    classes: ["icon", "foe-import"],
    window: { title: "Import Foes — ICON 2e" },
    position: { width: 520, height: "auto" },
    actions: {
      doImport: FoeImportApp.#onImport,
    },
  };

  static PARTS = {
    form: { template: "systems/icon/templates/apps/foe-import.hbs" },
  };

  async _prepareContext(options) {
    return await super._prepareContext(options);
  }

  static async #onImport(event, target) {
    const textarea = this.element.querySelector(".foe-json-input");
    const raw = textarea?.value?.trim();
    if (!raw) { ui.notifications.warn("Paste foe export JSON first."); return; }

    let data;
    try { data = JSON.parse(raw); }
    catch { ui.notifications.error("Invalid JSON — could not parse."); return; }

    if (data.version !== "1.0" || data.system !== "icon-2e") {
      ui.notifications.error("Expected version 1.0 and system icon-2e — not an ICON 2e foe export.");
      return;
    }

    const foes = data.foes ?? [];
    if (!foes.length) { ui.notifications.warn("No foes found in this export."); return; }

    let created = 0;
    let skipped = 0;

    for (const foe of foes) {
      const existing = game.actors.find((a) => a.getFlag("icon2e", "sourceId") === foe.id);
      if (existing) { skipped++; continue; }

      const isMob    = foe.specialClass === "mob";
      const isLegend = foe.specialClass === "legend";
      const hp       = (isMob || isLegend) ? 0 : (foe.hp ?? 0);

      await Actor.create({
        name: foe.name,
        type: "foe",
        flags:  { icon2e: { sourceId: foe.id } },
        prototypeToken: {
          width:       foe.size ?? 1,
          height:      foe.size ?? 1,
          name:        foe.name,
          disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
        },
        system: {
          externalId:       foe.id            ?? "",
          flavor:           foe.flavor         ?? "",
          chapter:          foe.chapter        ?? 1,
          size:             foe.size           ?? 1,
          foeClass:         foe.class          ?? "heavy",
          specialClass:     foe.specialClass   ?? "normal",
          resources:        { hp: { value: hp, max: hp } },
          crisis:           foe.crisis         ?? 0,
          defense:          foe.defense        ?? 0,
          freeMove:         foe.freeMove       ?? 4,
          hpPerPlayer:      foe.hpPerPlayer      ?? 0,
          minHp:            foe.minHp            ?? 0,
          membersPerPlayer: foe.membersPerPlayer  ?? 0,
          hitsPerMember:    foe.hitsPerMember     ?? 0,
          classTrait:    foe.classTrait    ?? { name: "", description: "" },
          specialTraits: foe.specialTraits ?? [],
          traits:        foe.traits        ?? [],
          actions:       foe.actions       ?? [],
          notes:         foe.notes         ?? "",
          conditions:    [],
        },
      });
      created++;
    }

    ui.notifications.info(
      `Import complete: ${created} foe${created !== 1 ? "s" : ""} created, ${skipped} skipped (already exist).`
    );
    this.close();
  }
}
