const { StringField, HTMLField } = foundry.data.fields;

export class TalentDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      effect: new HTMLField({ initial: "" }),
      jobId:  new StringField({ initial: "" }),
    };
  }
}
