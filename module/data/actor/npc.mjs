const { SchemaField, StringField, NumberField, ArrayField, HTMLField } = foundry.data.fields;

export class NpcDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      resources: new SchemaField({
        hp: new SchemaField({
          value: new NumberField({ initial: 20, min: 0, integer: true }),
          max:   new NumberField({ initial: 20, min: 0, integer: true }),
        }),
      }),
      defense:   new NumberField({ initial: 0, min: 0, integer: true }),
      freeMove:  new NumberField({ initial: 4, min: 0, integer: true }),
      conditions: new ArrayField(new StringField()),
      notes: new HTMLField({ initial: "" }),
      abilities: new ArrayField(new SchemaField({
        name:   new StringField({ required: true }),
        cost:   new StringField({ initial: "" }),
        effect: new StringField({ initial: "" }),
      })),
    };
  }

  prepareDerivedData() {
    this.resources.hp.value = Math.clamp(this.resources.hp.value, 0, this.resources.hp.max);
  }
}
