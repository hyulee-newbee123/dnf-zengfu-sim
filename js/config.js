/* ============================================================
 * 增幅模拟器 · 数值配置（只改这一个文件）
 * 下标一律按「当前等级」：第 0 项 = +0 打 +1
 * ============================================================ */
window.DNFConfig = {

  /* 增幅上限 */
  maxLevel: 20,

  /* ---------- 成功率（%） ---------- */
  baseSuccess: [
    100, 100, 100, 100,   /* +0 ~ +3 */
    80, 70, 60,           /* +4 ~ +6 */
    70, 60, 50,           /* +7 ~ +9 */
    40, 30,               /* +10 ~ +11 */
    20, 20, 20, 20, 20, 20, 20, 20,  /* +12 ~ +19 */
  ],

  /* ---------- 失败后果 ---------- */
  /* 从低到高匹配：当前等级 >= from 时采用该条，后一条覆盖前一条 */
  failRules: [
    { from: 0, type: "none" },                 /* 必成 */
    { from: 4, type: "downgrade", drop: 1 },   /* 降 1 级 */
    { from: 7, type: "downgrade", drop: 3 },   /* 降 3 级 */
    { from: 10, type: "destroy" },             /* 破坏 */
  ],

  /* ---------- 幸运符 ---------- */
  charm: {
    minLevel: 4,          /* 从此档起才能用 */
    bonus: [              /* 成功率额外 +% ，同样按 from 覆盖 */
      { from: 4, percent: 5 },
      { from: 12, percent: 2 },
    ],
  },

  /* ---------- 矛盾消耗 ---------- */
  /* 前 crystalIngameUntil 档为表内确认值，其后在规则表里显示为灰色估算 */
  crystalIngameUntil: 12,
  goldPerCrystal: 2000,
  crystalWeapon: [
    35, 53, 73, 97, 126, 164, 203, 280, 357, 472, 587, 646,
    711, 782, 860, 946, 1041, 1145, 1260, 1386,
  ],
  crystalGear: [
    26, 39, 54, 72, 94, 123, 152, 210, 268, 354, 440, 485,
    533, 587, 645, 710, 781, 859, 945, 1040,
  ],

  /* ---------- 部位（置换页） ---------- */
  slots: [
    { id: "weapon", name: "武器", weapon: true },
    { id: "coat", name: "上衣", weapon: false },
    { id: "shoulder", name: "头肩", weapon: false },
    { id: "pants", name: "下装", weapon: false },
    { id: "belt", name: "腰带", weapon: false },
    { id: "shoes", name: "鞋", weapon: false },
    { id: "bracelet", name: "手镯", weapon: false },
    { id: "necklace", name: "项链", weapon: false },
    { id: "ring", name: "戒指", weapon: false },
    { id: "support", name: "辅助装备", weapon: false },
  ],

  /* ---------- 属性公式：a * 等级 + b * 等级² ---------- */
  attr: {
    weaponDualAtk: { a: 20, b: 1.8 },
    gearStrInt: { a: 9, b: 0.75 },
    gearMagicResist: { a: 9.5, b: 0.375 },
    /* 技攻%：键是增幅后的等级 */
    skillAtk: {
      8: 1, 9: 2, 10: 3, 11: 4, 12: 6, 13: 8, 14: 10,
      15: 12, 16: 14, 17: 15, 18: 17, 19: 18, 20: 20,
    },
  },

  /* ---------- 增幅机炫光（装备外观档） ---------- */
  vfxStage: [
    { min: 7, max: 9, name: "一阶炫光" },
    { min: 10, max: 12, name: "二阶炫光" },
    { min: 13, max: 15, name: "三阶炫光" },
    { min: 16, max: 18, name: "四阶炫光" },
    { min: 19, max: 20, name: "五阶炫光" },
  ],
  /* 增幅机窗口光晕 CSS 档，按 min 覆盖 */
  altarGlow: [
    { min: 7, cls: "s1" },
    { min: 10, cls: "s2" },
    { min: 13, cls: "s3" },
    { min: 16, cls: "s4" },
    { min: 19, cls: "s5" },
  ],

  /* ---------- 增幅结果弹窗光色 ---------- */
  /* 成功：按打到的等级匹配，后一条覆盖前一条 */
  resultGlow: [
    { from: 0, cls: "glow-green" },   /* 到 +1~+7 绿 */
    { from: 8, cls: "glow-violet" },  /* 到 +8~+9 紫 */
    { from: 10, cls: "glow-pink" },   /* 到 +10~+11 粉 */
    { from: 12, cls: "glow-gold" },   /* 到 +12~+14 黄（含 11上12） */
    { from: 15, cls: "glow-prism" },  /* 到 +15+ 彩 */
  ],
  failGlow: "glow-ash",               /* 失败灰白 */

  /* ---------- 过程动画 ---------- */
  anim: {
    chargeMs: 1400,                   /* 增幅中时长，点跳过会立刻出结果 */
  },

  /* ---------- 演算 ---------- */
  monteCarlo: {
    defaultStart: 0,
    defaultTarget: 10,
    defaultRuns: 3000,
    runOptions: [1000, 3000, 10000],
    minRuns: 200,
    maxRuns: 20000,
    presets: [
      { start: 0, target: 4, label: "0 → 4 · 平民必成线" },
      { start: 0, target: 7, label: "0 → 7 · 红七公", gold: true },
      { start: 0, target: 10, label: "0 → 10 · 破坏门槛前" },
      { start: 0, target: 12, label: "0 → 12 · 会碎胚子" },
    ],
  },

  /* ---------- 自动增幅 ---------- */
  auto: {
    defaultTarget: 7,
    defaultDelay: 180,
    maxDelay: 2000,
  },
};
