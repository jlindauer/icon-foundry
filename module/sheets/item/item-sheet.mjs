import { ICON } from "../../config.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class IconItemSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icon", "item"],
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
  };

  static PARTS = {
    sheet: {
      template: "systems/icon/templates/item/item-sheet.hbs",
      scrollable: [""],
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    return {
      ...context,
      item,
      system: item.system,
      config: ICON,
      isEditable: this.isEditable,
    };
  }
}
