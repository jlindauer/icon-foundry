const { SchemaField, StringField, NumberField, ArrayField, HTMLField } = foundry.data.fields;

export class JobDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      jobType:     new StringField({ initial: "apprentice", choices: ["apprentice", "advanced"] }),
      soul:        new StringField({ initial: "" }),
      parentJobId: new StringField({ initial: "" }),

      stats: new SchemaField({
        hp:       new NumberField({ initial: 40, min: 0, integer: true }),
        defense:  new NumberField({ initial: 0, min: 0, integer: true }),
        freeMove: new NumberField({ initial: 4, min: 0, integer: true }),
      }),

      trait: new SchemaField({
        name:   new StringField({ initial: "" }),
        effect: new HTMLField({ initial: "" }),
      }),

      basicAttack: new SchemaField({
        name:   new StringField({ initial: "" }),
        cost:   new StringField({ initial: "1 action" }),
        tags:   new ArrayField(new StringField()),
        effect: new HTMLField({ initial: "" }),
      }),

      limitBreak: new SchemaField({
        name:   new StringField({ initial: "" }),
        cost:   new StringField({ initial: "1 action, 2 resolve" }),
        tags:   new ArrayField(new StringField()),
        effect: new HTMLField({ initial: "" }),
      }),

      // IDs of Ability items belonging to this job
      abilityIds: new ArrayField(new StringField()),
      // IDs of Talent items belonging to this job
      talentIds: new ArrayField(new StringField()),

      keywords: new ArrayField(new SchemaField({
        name:        new StringField({ initial: "" }),
        description: new StringField({ initial: "" }),
      })),
      description: new StringField({ initial: "" }),
    };
  }

  get vigor() {
    return Math.floor(this.stats.hp * 0.25);
  }
}
