(function (global) {
  const D = global.DNFData;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function successRate(from, useCharm) {
    if (from >= D.MAX_LEVEL) return 0;
    const base = D.BASE_SUCCESS[from];
    const extra = useCharm && D.canUseCharm(from) ? D.charmBonus(from) : 0;
    return clamp(base + extra, 0, 100);
  }

  function roll(from, useCharm, rng) {
    const rate = successRate(from, useCharm);
    const r = (rng || Math.random)() * 100;
    if (r < rate) {
      return { result: "success", from, to: from + 1, rate, roll: r };
    }
    const rule = D.failRule(from);
    if (rule.type === "downgrade") {
      const to = clamp(from - rule.drop, 0, D.MAX_LEVEL);
      return { result: "downgrade", from, to, drop: rule.drop, rate, roll: r };
    }
    if (rule.type === "destroy") {
      return { result: "destroy", from, to: 0, rate, roll: r };
    }
    return { result: "keep", from, to: from, rate, roll: r };
  }

  function attemptCost(from, isWeapon, useCharm) {
    return {
      crystal: D.crystalCost(from, isWeapon),
      gold: D.goldCost(from, isWeapon),
      charm: useCharm && D.canUseCharm(from) ? 1 : 0,
    };
  }

  function canAfford(wallet, cost, infinite) {
    if (infinite) return true;
    if (wallet.crystal < cost.crystal) return "矛盾的结晶体不足";
    if (wallet.gold < cost.gold) return "金币不足";
    if (wallet.charm < cost.charm) return "幸运符不足";
    return true;
  }

  function pay(wallet, cost, infinite) {
    if (infinite) return;
    wallet.crystal -= cost.crystal;
    wallet.gold -= cost.gold;
    wallet.charm -= cost.charm;
  }

  /**
   * 从 start 冲到 target。破坏则换新胚子从 0 重来。
   * 返回统计，不修改外部状态（纯模拟）。
   */
  function simulateToTarget(opts) {
    const {
      start = 0,
      target = 10,
      isWeapon = true,
      useCharm = true,
      maxEmbryo = Infinity,
      rng = Math.random,
    } = opts;

    if (target <= start) {
      return emptySim(start, target);
    }

    let level = start;
    let embryoUsed = 1;
    let attempts = 0;
    let success = 0;
    let downgrade = 0;
    let destroy = 0;
    let crystal = 0;
    let gold = 0;
    let charm = 0;
    let peak = start;

    while (level < target) {
      const cost = attemptCost(level, isWeapon, useCharm);
      crystal += cost.crystal;
      gold += cost.gold;
      charm += cost.charm;
      attempts += 1;

      const out = roll(level, useCharm, rng);
      if (out.result === "success") {
        success += 1;
        level = out.to;
        if (level > peak) peak = level;
      } else if (out.result === "downgrade") {
        downgrade += 1;
        level = out.to;
      } else if (out.result === "destroy") {
        destroy += 1;
        if (embryoUsed >= maxEmbryo) {
          return finish(level, true);
        }
        embryoUsed += 1;
        level = 0;
      }
    }

    return finish(level, false);

    function finish(finalLevel, aborted) {
      return {
        reached: !aborted && finalLevel >= target,
        aborted,
        finalLevel,
        peak,
        attempts,
        success,
        downgrade,
        destroy,
        embryoUsed,
        crystal,
        gold,
        charm,
        start,
        target,
      };
    }
  }

  function emptySim(start, target) {
    return {
      reached: true,
      aborted: false,
      finalLevel: start,
      peak: start,
      attempts: 0,
      success: 0,
      downgrade: 0,
      destroy: 0,
      embryoUsed: 0,
      crystal: 0,
      gold: 0,
      charm: 0,
      start,
      target,
    };
  }

  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const i = (sorted.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    if (lo === hi) return sorted[lo];
    return sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
  }

  function monteCarlo(opts) {
    const n = opts.runs || (global.DNFConfig && global.DNFConfig.monteCarlo.defaultRuns) || 2000;
    const samples = [];
    let reach = 0;
    for (let i = 0; i < n; i++) {
      const s = simulateToTarget(opts);
      samples.push(s);
      if (s.reached) reach += 1;
    }
    const crystals = samples.map((s) => s.crystal).sort((a, b) => a - b);
    const embryos = samples.map((s) => s.embryoUsed).sort((a, b) => a - b);
    const attempts = samples.map((s) => s.attempts).sort((a, b) => a - b);
    const destroys = samples.map((s) => s.destroy).sort((a, b) => a - b);
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      runs: n,
      reachRate: reach / n,
      crystal: {
        mean: mean(crystals),
        p25: percentile(crystals, 0.25),
        p50: percentile(crystals, 0.5),
        p75: percentile(crystals, 0.75),
        p90: percentile(crystals, 0.9),
      },
      embryo: {
        mean: mean(embryos),
        p50: percentile(embryos, 0.5),
        p90: percentile(embryos, 0.9),
      },
      attempt: {
        mean: mean(attempts),
        p50: percentile(attempts, 0.5),
      },
      destroy: {
        mean: mean(destroys),
        p50: percentile(destroys, 0.5),
      },
    };
  }

  global.DNFEngine = {
    successRate,
    roll,
    attemptCost,
    canAfford,
    pay,
    simulateToTarget,
    monteCarlo,
  };
})(window);
