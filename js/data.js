/* 规则查询：数字全部来自 js/config.js */
(function (global) {
  const C = global.DNFConfig;
  if (!C) throw new Error("先加载 js/config.js");

  function pickByFrom(list, from) {
    let hit = list[0];
    for (let i = 0; i < list.length; i++) {
      if (from >= list[i].from) hit = list[i];
    }
    return hit;
  }

  function failRule(from) {
    const rule = pickByFrom(C.failRules, from);
    return { type: rule.type, drop: rule.drop };
  }

  function charmBonus(from) {
    if (from < C.charm.minLevel) return 0;
    return pickByFrom(C.charm.bonus, from).percent;
  }

  function canUseCharm(from) {
    return from >= C.charm.minLevel;
  }

  function goldCost(from, isWeapon) {
    const table = isWeapon ? C.crystalWeapon : C.crystalGear;
    return table[from] * C.goldPerCrystal;
  }

  function crystalCost(from, isWeapon) {
    return (isWeapon ? C.crystalWeapon : C.crystalGear)[from];
  }

  function vfxStage(level) {
    return C.vfxStage.find((s) => level >= s.min && level <= s.max) || null;
  }

  function quad(level, pack) {
    if (level <= 0) return 0;
    return Math.round(pack.a * level + pack.b * level * level);
  }

  function weaponDualAtk(level) {
    return quad(level, C.attr.weaponDualAtk);
  }

  function gearStrInt(level) {
    return quad(level, C.attr.gearStrInt);
  }

  function gearMagicResist(level) {
    return quad(level, C.attr.gearMagicResist);
  }

  function skillAtk(level) {
    return C.attr.skillAtk[level] || 0;
  }

  function failLabel(from) {
    const rule = failRule(from);
    if (rule.type === "none") return "必成";
    if (rule.type === "downgrade") return "降 " + rule.drop + " 级";
    return "破坏";
  }

  function failDetail(from) {
    const rule = failRule(from);
    if (rule.type === "none") return "本档 100% 成功";
    if (rule.type === "downgrade") return "失败降 " + rule.drop + " 级";
    return "破坏（留下但不能再放入增幅器，无返还）";
  }

  const CRYSTAL_SOURCE = C.crystalWeapon.map((_, i) =>
    i < C.crystalIngameUntil ? "ingame" : "scaled"
  );

  global.DNFData = {
    MAX_LEVEL: C.maxLevel,
    BASE_SUCCESS: C.baseSuccess,
    failRule,
    charmBonus,
    canUseCharm,
    CRYSTAL_WEAPON: C.crystalWeapon,
    CRYSTAL_GEAR: C.crystalGear,
    CRYSTAL_SOURCE,
    goldCost,
    crystalCost,
    SLOTS: C.slots,
    VFX_STAGE: C.vfxStage,
    vfxStage,
    weaponDualAtk,
    gearStrInt,
    gearMagicResist,
    skillAtk,
    failLabel,
    failDetail,
    pickByFrom,
  };
})(window);
