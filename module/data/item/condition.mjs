const { StringField, BooleanField, HTMLField } = foundry.data.fields;

export class ConditionDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      isPositive: new BooleanField({ initial: false }),
      keyword:    new StringField({ initial: "" }),
      effect:     new HTMLField({ initial: "" }),
    };
  }
}
