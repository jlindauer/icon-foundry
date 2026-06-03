import { ICON } from "../../config.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class IconNpcSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icon", "actor", "npc"],
    position: { width: 540, height: 560 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      toggleCondition: IconNpcSheet.#onToggleCondition,
      addAbility:      IconNpcSheet.#onAddAbility,
      removeAbility:   IconNpcSheet.#onRemoveAbility,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/icon/templates/actor/npc-sheet.hbs",
      scrollable: [".sheet-body"],
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system;
    return {
      ...context,
      actor,
      system,
      isEditable: this.isEditable,
      conditions: this._prepareConditions(system),
    };
  }

  _prepareConditions(system) {
    const active = new Set(system.conditions ?? []);
    const all = [...ICON.CONDITIONS_POSITIVE, ...ICON.CONDITIONS_NEGATIVE];
    return all.map((id) => ({
      id,
      label: `ICON.Condition.${id.charAt(0).toUpperCase() + id.slice(1)}`,
      active: active.has(id),
      isPositive: ICON.CONDITIONS_POSITIVE.includes(id),
    }));
  }

  _onRender(context, options) {
    // Inline HP editing on click
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

  static async #onToggleCondition(event, target) {
    const id = target.dataset.conditionId;
    if (id) await this.document.toggleCondition(id);
  }

  static async #onAddAbility(event, target) {
    const abilities = [...(this.document.system.abilities ?? []), { name: "New Ability", cost: "", effect: "" }];
    await this.document.update({ "system.abilities": abilities });
  }

  static async #onRemoveAbility(event, target) {
    const index = parseInt(target.dataset.index);
    const abilities = (this.document.system.abilities ?? []).filter((_, i) => i !== index);
    await this.document.update({ "system.abilities": abilities });
  }
}
