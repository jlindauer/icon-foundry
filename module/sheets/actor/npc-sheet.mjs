const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class IconNpcSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icon", "actor", "npc"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      toggleCondition: IconNpcSheet.#onToggleCondition,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/icon/templates/actor/npc-sheet.hbs",
      scrollable: [""],
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    return {
      ...context,
      actor,
      system: actor.system,
      isEditable: this.isEditable,
    };
  }

  static async #onToggleCondition(event, target) {
    const id = target.dataset.conditionId;
    if (id) await this.document.toggleCondition(id);
  }
}
