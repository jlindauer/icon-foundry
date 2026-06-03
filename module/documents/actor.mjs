export class IconActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    this.system.prepareDerivedData?.();
  }

  // ── Convenience getters ──────────────────────────────────────────────────

  get isCharacter() { return this.type === "character"; }
  get isNpc()       { return this.type === "npc"; }

  // ── HP / Vigor helpers ───────────────────────────────────────────────────

  async applyDamage(amount) {
    if (this.type !== "character") {
      return this.update({ "system.resources.hp.value": Math.max(0, this.system.resources.hp.value - amount) });
    }

    // Damage first soaks through vigor, then HP
    let remaining = amount;
    const vigor = this.system.resources.vigor;
    const hp = this.system.resources.hp;

    const vigorLost = Math.min(remaining, vigor.value);
    remaining -= vigorLost;

    const updates = {};
    if (vigorLost > 0) updates["system.resources.vigor.value"] = vigor.value - vigorLost;
    if (remaining > 0) updates["system.resources.hp.value"] = Math.max(0, hp.value - remaining);

    return this.update(updates);
  }

  async applyHealing(amount) {
    const hp = this.system.resources.hp;
    return this.update({
      "system.resources.hp.value": Math.min(hp.max, hp.value + amount),
    });
  }

  async gainVigor(amount) {
    const vigor = this.system.resources.vigor;
    return this.update({
      "system.resources.vigor.value": Math.min(vigor.max, vigor.value + amount),
    });
  }

  // ── Condition helpers ────────────────────────────────────────────────────

  hasCondition(id) {
    return this.system.state?.conditions?.includes(id) ?? false;
  }

  async toggleCondition(id) {
    const conditions = [...(this.system.state?.conditions ?? [])];
    const idx = conditions.indexOf(id);
    if (idx === -1) conditions.push(id);
    else conditions.splice(idx, 1);
    return this.update({ "system.state.conditions": conditions });
  }

  // ── XP / Leveling ────────────────────────────────────────────────────────

  async gainXp(amount = 1) {
    if (this.type !== "character") return;
    const { level, currentXp } = this.system.progression;
    let newXp = currentXp + amount;
    let newLevel = level;

    while (newXp >= newLevel + 3 && newLevel < 12) {
      newXp -= newLevel + 3;
      newLevel++;
    }

    return this.update({
      "system.progression.level": newLevel,
      "system.progression.currentXp": newXp,
    });
  }
}
