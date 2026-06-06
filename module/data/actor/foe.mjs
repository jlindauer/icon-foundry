const { SchemaField, StringField, NumberField, ArrayField } = foundry.data.fields;

export class FoeDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      externalId:   new StringField({ initial: "" }),
      flavor:       new StringField({ initial: "" }),
      chapter:      new NumberField({ initial: 1, integer: true, min: 1, max: 3 }),
      size:         new NumberField({ initial: 1, integer: true, min: 1, max: 3 }),
      foeClass:     new StringField({ initial: "heavy" }),
      specialClass: new StringField({ initial: "normal" }),

      resources: new SchemaField({
        hp: new SchemaField({
          value: new NumberField({ initial: 0, integer: true, min: 0 }),
          max:   new NumberField({ initial: 0, integer: true, min: 0 }),
        }),
      }),
      crisis:   new NumberField({ initial: 0, integer: true, min: 0 }),
      defense:  new NumberField({ initial: 0, integer: true }),
      freeMove: new NumberField({ initial: 4, integer: true }),

      // Legend scaling
      hpPerPlayer: new NumberField({ initial: 0, integer: true }),
      minHp:       new NumberField({ initial: 0, integer: true }),

      // Mob scaling
      membersPerPlayer: new NumberField({ initial: 0, integer: true }),
      hitsPerMember:    new NumberField({ initial: 0, integer: true }),

      classTrait: new SchemaField({
        name:        new StringField({ initial: "" }),
        description: new StringField({ initial: "" }),
      }),
      specialTraits: new ArrayField(new SchemaField({
        name:        new StringField({ initial: "" }),
        description: new StringField({ initial: "" }),
      })),
      traits: new ArrayField(new SchemaField({
        name:        new StringField({ initial: "" }),
        description: new StringField({ initial: "" }),
      })),
      actions: new ArrayField(new SchemaField({
        name:        new StringField({ initial: "" }),
        tags:        new StringField({ initial: "" }),
        description: new StringField({ initial: "" }),
      })),

      conditions: new ArrayField(new StringField()),
      notes:      new StringField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    const hp = this.resources.hp;
    if (hp.max > 0) hp.value = Math.clamp(hp.value, 0, hp.max);
  }

  get isMob()    { return this.specialClass === "mob"; }
  get isLegend() { return this.specialClass === "legend"; }
  get isElite()  { return this.specialClass === "elite"; }

  get isBloodied() {
    if (this.isMob || this.isLegend) return false;
    const { value, max } = this.resources.hp;
    return max > 0 && value <= Math.floor(max * 0.5);
  }

  get isInCrisis() {
    if (this.isMob || this.isLegend) return false;
    return this.crisis > 0 && this.resources.hp.value <= this.crisis;
  }
}
