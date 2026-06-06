import { ICON } from "../../config.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class IconFoeSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["icon", "actor", "foe"],
    position: { width: 580, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      toggleCondition: IconFoeSheet.#onToggleCondition,
      rollFoeAction:   IconFoeSheet.#onRollFoeAction,
    },
  };

  static PARTS = {
    sheet: {
      template: "systems/icon/templates/actor/foe-sheet.hbs",
      scrollable: [".foe-body"],
    },
  };

  get title() { return this.document.name; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor   = this.document;
    const system  = actor.system;

    const active     = new Set(system.conditions ?? []);
    const conditions = ICON.CONDITIONS.map((id) => ({
      id,
      label:  `ICON.Condition.${id.charAt(0).toUpperCase() + id.slice(1)}`,
      active: active.has(id),
    }));

    // Merge classTrait → specialTraits → custom traits into a single ordered list
    const allTraits = [
      system.classTrait?.name ? { name: system.classTrait.name, description: system.classTrait.description, badge: "class" } : null,
      ...(system.specialTraits ?? []).map((t) => ({ ...t, badge: "special" })),
      ...(system.traits ?? []).map((t) => ({ ...t, badge: null })),
    ].filter(Boolean);

    const sizeLabels = ["", "Normal", "Large", "Huge"];

    return {
      ...context,
      actor,
      system,
      isEditable:  this.isEditable,
      conditions,
      allTraits,
      isMob:       system.isMob,
      isLegend:    system.isLegend,
      isElite:     system.isElite,
      isBloodied:  system.isBloodied,
      isInCrisis:  system.isInCrisis,
      sizeLabel:   sizeLabels[system.size] ?? "Normal",
    };
  }

  _onRender(context, options) {
    this.element.querySelectorAll(".foe-hp-val[data-field]").forEach((el) => {
      el.addEventListener("click", (ev) => {
        const field = ev.currentTarget.dataset.field;
        const input = document.createElement("input");
        input.type      = "number";
        input.value     = ev.currentTarget.textContent.trim();
        input.className = "foe-hp-input";
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
    const id         = target.dataset.conditionId;
    const conditions = [...(this.document.system.conditions ?? [])];
    const idx        = conditions.indexOf(id);
    if (idx >= 0) conditions.splice(idx, 1);
    else conditions.push(id);
    await this.document.update({ "system.conditions": conditions });
  }

  static async #onRollFoeAction(event, target) {
    const idx    = parseInt(target.dataset.actionIndex);
    const action = this.document.system.actions?.[idx];
    if (!action) return;

    const actor    = this.document;
    const tagStr   = action.tags ?? "";
    const tags     = tagStr.split(",").map((t) => t.trim()).filter(Boolean);
    const isAttack = tags.some((t) => t.toLowerCase().includes("attack"));

    const seen = new Set();
    const rollableFormulas = [];
    for (const m of (action.description ?? "").matchAll(/\b(\d+d\d+(?:[+-]\d+)?)\b/gi)) {
      const f = m[1];
      if (!seen.has(f.toLowerCase())) { seen.add(f.toLowerCase()); rollableFormulas.push(f); }
    }

    const content = await renderTemplate("systems/icon/templates/chat/ability-card.hbs", {
      name:   action.name,
      cost:   tagStr,
      tags,
      effect: action.description,
      actorName: actor.name,
      actorId:   actor.id,
      isAttack,
      rollableFormulas,
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
    });
  }
}
