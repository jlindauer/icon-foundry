const { SchemaField, StringField, NumberField, ArrayField, BooleanField } = foundry.data.fields;

export class BondDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // Two action options the player chooses from for +2 rating
      actionOptions: new ArrayField(new StringField()),
      // Three ideals used as XP triggers
      ideals: new ArrayField(new StringField()),
      effort: new NumberField({ initial: 0, min: 0, integer: true }),
      strain: new NumberField({ initial: 0, min: 0, integer: true }),
      secondWind: new StringField({ initial: "" }),
      specialAbility: new SchemaField({
        name:   new StringField({ initial: "" }),
        effect: new StringField({ initial: "" }),
      }),
      powers: new ArrayField(new SchemaField({
        id:        new StringField({ required: true }),
        name:      new StringField({ initial: "" }),
        description: new StringField({ initial: "" }),
        isGambit:  new BooleanField({ initial: false }),
      })),
      gearKits: new ArrayField(new SchemaField({
        id:    new StringField({ required: true }),
        name:  new StringField({ initial: "" }),
        items: new ArrayField(new StringField()),
      })),
    };
  }
}
