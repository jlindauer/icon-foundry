const { SchemaField, StringField, ArrayField, HTMLField } = foundry.data.fields;

export class AbilityDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tier:   new StringField({ initial: "apprentice", choices: ["apprentice", "I", "II", "IV"] }),
      cost:   new StringField({ initial: "" }),
      tags:   new ArrayField(new StringField()),
      flavor: new StringField({ initial: "" }),
      effect: new HTMLField({ initial: "" }),
      jobId:  new StringField({ initial: "" }),
    };
  }
}
