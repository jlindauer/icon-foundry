const { SchemaField, StringField, NumberField, ArrayField, BooleanField, HTMLField } =
  foundry.data.fields;

export class CharacterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // ── Narrative ──────────────────────────────────────────────────────────
      narrative: new SchemaField({
        kin: new StringField({ initial: "", label: "ICON.Field.Kin" }),
        culture: new StringField({ initial: "", label: "ICON.Field.Culture" }),
        bondId: new StringField({ initial: "", label: "ICON.Field.Bond" }),
        bondActionChoice: new StringField({ initial: "", label: "ICON.Field.BondAction" }),
        selectedPowers: new ArrayField(new StringField()),
        selectedGearKit: new StringField({ initial: "" }),
        actionRatings: new SchemaField({
          sneak:    new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          traverse: new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          sense:    new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          study:    new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          charm:    new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          command:  new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          tinker:   new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          excel:    new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          smash:    new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
          endure:   new NumberField({ initial: 0, min: 0, max: 5, integer: true }),
        }),
      }),

      // ── Progression ───────────────────────────────────────────────────────
      progression: new SchemaField({
        level: new NumberField({ initial: 0, min: 0, max: 12, integer: true }),
        currentXp: new NumberField({ initial: 0, min: 0, integer: true }),
        checkedXpTriggers: new ArrayField(new NumberField({ integer: true })),
        combatXpTriggers: new ArrayField(new NumberField({ integer: true })),
      }),

      // ── Combat ────────────────────────────────────────────────────────────
      combat: new SchemaField({
        jobClassId: new StringField({ initial: "" }),
        mainJobId: new StringField({ initial: "" }),
        jobs: new ArrayField(new SchemaField({
          id:    new StringField({ required: true }),
          level: new NumberField({ initial: 1, min: 1, max: 4, integer: true }),
        })),
        activeAbilities: new ArrayField(new StringField(), { label: "ICON.Field.ActiveAbilities" }),
        selectedTalents: new ArrayField(new StringField(), { label: "ICON.Field.SelectedTalents" }),
      }),

      // ── Resources ─────────────────────────────────────────────────────────
      resources: new SchemaField({
        hp: new SchemaField({
          value: new NumberField({ initial: 40, min: 0, integer: true }),
          max:   new NumberField({ initial: 40, min: 0, integer: true }),
        }),
        vigor: new SchemaField({
          value: new NumberField({ initial: 10, min: 0, integer: true }),
          max:   new NumberField({ initial: 10, min: 0, integer: true }),
        }),
        resolve: new NumberField({ initial: 0, min: 0, integer: true }),
      }),

      // ── Narrative resources ───────────────────────────────────────────────
      strain: new SchemaField({
        current: new NumberField({ initial: 0, min: 0, integer: true }),
        effort:  new NumberField({ initial: 0, min: 0, integer: true }),
      }),

      burdens: new ArrayField(new SchemaField({
        id:        new StringField({ required: true }),
        name:      new StringField({ initial: "" }),
        clockSize: new NumberField({ initial: 4, choices: [4, 6, 10], integer: true }),
        ticked:    new NumberField({ initial: 0, min: 0, integer: true }),
      })),

      // ── State ─────────────────────────────────────────────────────────────
      state: new SchemaField({
        conditions:  new ArrayField(new StringField()),
        description: new StringField({ initial: "" }),
        sessionNotes: new ArrayField(new SchemaField({
          id:      new StringField({ required: true }),
          date:    new StringField({ initial: "" }),
          content: new StringField({ initial: "" }),
        })),
      }),
    };
  }

  prepareDerivedData() {
    // Clamp HP/vigor to their max values
    this.resources.hp.value    = Math.clamp(this.resources.hp.value, 0, this.resources.hp.max);
    this.resources.vigor.value = Math.clamp(this.resources.vigor.value, 0, this.resources.vigor.max);
  }

  get isBloodied() {
    return this.resources.hp.value <= this.resources.hp.max / 2;
  }

  get isInCrisis() {
    return this.resources.hp.value <= this.resources.hp.max / 4;
  }

  get xpForNextLevel() {
    return this.progression.level + 3;
  }

  get abilitySlots() {
    const lvl = this.progression.level;
    return lvl === 0 ? 2 : Math.min(6, lvl + 2);
  }

  get talentSlots() {
    return Math.floor(this.progression.level / 2);
  }
}
