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
      { from: 11, percent: 3 },   /* 11→12 带符 30+3=33% */
      { from: 12, percent: 2 },
    ],
    cost: [               /* 每档消耗张数，按 from 覆盖 */
      { from: 0, count: 1 },
      { from: 10, count: 2 },
      { from: 12, count: 4 },
      { from: 16, count: 8 },
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
    26, 39, 54, 72, 94, 123, 152, 210, 268, 354, 440, 484,
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
    { id: "stone", name: "魔法石", weapon: false },
    { id: "earring", name: "耳环", weapon: false },
  ],

  /* ---------- 装备数值（下标 = 增幅后等级，0 不用） ---------- */
  attr: {
    weaponDualAtk: [
      0,
      22, 47, 76, 109, 147, 191, 242, 301, 369, 447,
      537, 641, 663, 685, 707, 729, 751, 773, 795, 817,
    ],
    gearStrInt: [
      0,
      10, 21, 34, 48, 64, 80, 99, 121, 146, 174,
      207, 245, 255, 265, 275, 285, 295, 305, 315, 325,
    ],
    /* 抗魔仍用 a * 等级 + b * 等级² */
    gearMagicResist: { a: 9.5, b: 0.375 },
    /* 技攻%：键是增幅后的等级 */
    skillAtk: {
      8: 0.5, 9: 1, 10: 2, 11: 3, 12: 4, 13: 6, 14: 8,
      15: 10, 16: 12, 17: 14, 18: 16, 19: 18, 20: 20,
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

  /* ---------- 拍卖行情默认值（界面可改，全局生效） ---------- */
  tera: {
    crystal: 200,        /* 矛盾价值泰拉 */
    charm: 11000,        /* 幸运符价值泰拉 */
    synth: 0,            /* 装扮合成器价值泰拉（拍卖标价） */
    synthIncomeRate: 0.9, /* 标价 × 此值 = 到手泰拉 */
  },

  /* ---------- 充值 / 商城（只改这里就能加档位和商品） ---------- */
  shop: {
    recharge: [
      { rmb: 1, coupon: 10 },
      { rmb: 6, coupon: 62 },
      { rmb: 30, coupon: 310 },
      { rmb: 68, coupon: 710 },
      { rmb: 128, coupon: 1340 },
      { rmb: 198, coupon: 2100 },
      { rmb: 328, coupon: 3520 },
      { rmb: 648, coupon: 6980, hot: true },
    ],
    goods: [
      {
        id: "synth",
        name: "装扮合成器",
        desc: "点券购买，可按行情兑泰拉",
        currency: "coupon",
        price: 50,
        give: { synth: 1 },
      },
      {
        id: "crystal",
        name: "矛盾",
        desc: "增幅必耗。单价按行情「矛盾价值泰拉」",
        currency: "tera",
        priceFrom: "crystal",
        give: { crystal: 1 },
      },
      {
        id: "charm",
        name: "幸运符",
        desc: "开符时消耗。单价按行情「幸运符价值泰拉」",
        currency: "tera",
        priceFrom: "charm",
        give: { charm: 1 },
      },
    ],
    maxBuy: 9999,
    maxExchange: 999,
  },

  /* ---------- 演算 ---------- */
  monteCarlo: {
    defaultStart: 0,
    defaultTarget: 10,
    defaultCount: 1,
    maxCount: 12,
    defaultCharmFrom: 4, /* 演算时低于此等级不消耗幸运符 */
    defaultRuns: 3000,
    runOptions: [1000, 3000, 10000],
    minRuns: 200,
    maxRuns: 20000,
    presets: [
      { embryo: 0, gear: 0, target: 7, label: "身上 0 → 7" },
      { embryo: 0, gear: 0, target: 10, label: "身上 0 → 10" },
      { embryo: 0, gear: 10, target: 11, label: "红10 → 11", gold: true },
      { embryo: 0, gear: 10, target: 12, label: "红10 → 12" },
    ],
  },

  /* ---------- 自动增幅 ---------- */
  auto: {
    defaultTarget: 7,
    defaultDelay: 180,
    maxDelay: 2000,
    defaultCharmFrom: 4, /* 自动时低于此等级不消耗幸运符 */
  },
};
