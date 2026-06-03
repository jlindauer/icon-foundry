export class IconItem extends Item {
  get isAbility()   { return this.type === "ability"; }
  get isTalent()    { return this.type === "talent"; }
  get isBond()      { return this.type === "bond"; }
  get isJob()       { return this.type === "job"; }
  get isCondition() { return this.type === "condition"; }
}
