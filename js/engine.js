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

  let simTables = null;
  function ensureSimTables() {
    if (simTables) return simTables;
    const max = D.MAX_LEVEL;
    const rateOff = new Float64Array(max);
    const rateOn = new Float64Array(max);
    const drop = new Int8Array(max);
    const dead = new Uint8Array(max);
    for (let i = 0; i < max; i++) {
      rateOff[i] = D.BASE_SUCCESS[i];
      rateOn[i] = clamp(D.BASE_SUCCESS[i] + D.charmBonus(i), 0, 100);
      const rule = D.failRule(i);
      if (rule.type === "destroy") dead[i] = 1;
      else if (rule.type === "downgrade") drop[i] = rule.drop || 0;
    }
    const cfg = global.DNFConfig;
    simTables = {
      rateOff,
      rateOn,
      drop,
      dead,
      cryW: D.CRYSTAL_WEAPON,
      cryG: D.CRYSTAL_GEAR,
      goldPer: (cfg && cfg.goldPerCrystal) || 2000,
      charmMin: (cfg && cfg.charm && cfg.charm.minLevel) || 4,
    };
    return simTables;
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
      charmFrom = 0,
      maxEmbryo = Infinity,
      rng = Math.random,
    } = opts;

    if (target <= start) {
      return emptySim(start, target);
    }

    const T = ensureSimTables();
    const cry = isWeapon ? T.cryW : T.cryG;
    const charmFloor = useCharm ? Math.max(charmFrom, T.charmMin) : 1e9;
    let level = start;
    let embryoUsed = 1;
    let attempts = 0;
    let success = 0;
    let downgrade = 0;
    let destroy = 0;
    let crystal = 0;
    let charm = 0;
    let peak = start;

    while (level < target) {
      const charmOn = level >= charmFloor;
      crystal += cry[level] || 0;
      if (charmOn) charm += 1;
      attempts += 1;
      if (rng() * 100 < (charmOn ? T.rateOn[level] : T.rateOff[level])) {
        success += 1;
        level += 1;
        if (level > peak) peak = level;
      } else if (T.dead[level]) {
        destroy += 1;
        if (embryoUsed >= maxEmbryo) {
          return packSim(start, target, level, peak, attempts, success, downgrade, destroy, embryoUsed, crystal, charm, T.goldPer, true);
        }
        embryoUsed += 1;
        level = 0;
      } else {
        const d = T.drop[level];
        if (d) {
          downgrade += 1;
          level = clamp(level - d, 0, D.MAX_LEVEL);
        }
      }
    }

    return packSim(start, target, level, peak, attempts, success, downgrade, destroy, embryoUsed, crystal, charm, T.goldPer, false);
  }

  function packSim(start, target, finalLevel, peak, attempts, success, downgrade, destroy, embryoUsed, crystal, charm, goldPer, aborted) {
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
      gold: crystal * goldPer,
      charm,
      start,
      target,
    };
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

  function solveLinear(A, b) {
    const n = A.length;
    const M = A.map((row, i) => row.slice().concat([b[i]]));
    for (let i = 0; i < n; i++) {
      let piv = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
      }
      if (Math.abs(M[piv][i]) < 1e-12) return new Array(n).fill(NaN);
      if (piv !== i) {
        const tmp = M[i];
        M[i] = M[piv];
        M[piv] = tmp;
      }
      const div = M[i][i];
      for (let c = i; c <= n; c++) M[i][c] /= div;
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const f = M[r][i];
        if (!f) continue;
        for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
      }
    }
    return M.map((row) => row[n]);
  }

  /** 从 start 冲到 target 的精确期望（破坏回 0）。 */
  function expectedToTarget(opts) {
    const {
      start = 0,
      target = 10,
      isWeapon = true,
      useCharm = true,
      charmFrom = 0,
    } = opts;
    if (target <= start) return { crystal: 0, charm: 0, gold: 0 };
    const n = target;
    const A = [];
    const bc = [];
    const bh = [];
    const bg = [];
    for (let level = 0; level < n; level++) {
      const row = new Array(n).fill(0);
      const charmOn = useCharm && level >= charmFrom;
      const p = successRate(level, charmOn) / 100;
      const cost = attemptCost(level, isWeapon, charmOn);
      row[level] += 1;
      const next = level + 1;
      if (next < n) row[next] -= p;
      const rule = D.failRule(level);
      let failTo = level;
      if (rule.type === "downgrade") failTo = clamp(level - rule.drop, 0, D.MAX_LEVEL);
      else if (rule.type === "destroy") failTo = 0;
      const q = 1 - p;
      if (q > 0 && failTo < n) row[failTo] -= q;
      A.push(row);
      bc.push(cost.crystal);
      bh.push(cost.charm);
      bg.push(cost.gold);
    }
    const xc = solveLinear(A, bc);
    const xh = solveLinear(A, bh);
    const xg = solveLinear(A, bg);
    return {
      crystal: xc[start],
      charm: xh[start],
      gold: xg[start],
    };
  }

  function pieceTera(ev, prices) {
    return ev.crystal * prices.crystal + ev.charm * prices.charm;
  }

  /**
   * 按件数、类型、起始→目标比较开符档。
   * 置换成功后胚子变回 start，下一件从 start 接着打；
   * 破坏后新胚子从 0 重来。
   */
  function adviseSet(opts) {
    const start = Math.max(0, Number(opts.start) || 0);
    const target = opts.target;
    const isWeapon = !!opts.isWeapon;
    const count = Math.max(1, Number(opts.count) || 1);
    const prices = {
      crystal: opts.crystalTera,
      charm: opts.charmTera,
    };
    const cfg = global.DNFConfig;
    const charmMin = (cfg && cfg.charm && cfg.charm.minLevel) || 4;

    const plans = [{ useCharm: false, charmFrom: target, kind: "none" }];
    if (target > charmMin) {
      for (let m = charmMin; m < target; m++) {
        plans.push({ useCharm: true, charmFrom: m, kind: "from" });
      }
    }

    const rows = plans.map((p) => {
      const piece = expectedToTarget({
        start, target, isWeapon, useCharm: p.useCharm, charmFrom: p.charmFrom,
      });
      return {
        useCharm: p.useCharm,
        charmFrom: p.charmFrom,
        kind: p.kind,
        tera: pieceTera(piece, prices) * count,
        piece,
      };
    });

    let best = rows[0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].tera < best.tera) best = rows[i];
    }
    const allCharm = rows.find((r) => r.useCharm && r.charmFrom === charmMin) || null;
    const noCharm = rows.find((r) => !r.useCharm) || rows[0];
    const mustCharm = best.kind === "from" && start >= best.charmFrom;
    return {
      start,
      target,
      isWeapon,
      count,
      prices,
      charmMin,
      best,
      allCharm,
      noCharm,
      mustCharm,
      rows,
    };
  }

  function summarizeMonteCarlo(samples) {
    const n = samples.length;
    let reach = 0;
    const crystals = new Array(n);
    const embryos = new Array(n);
    const attempts = new Array(n);
    const destroys = new Array(n);
    const charms = new Array(n);
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      if (s.reached) reach += 1;
      crystals[i] = s.crystal;
      embryos[i] = s.embryoUsed;
      attempts[i] = s.attempts;
      destroys[i] = s.destroy;
      charms[i] = s.charm;
    }
    crystals.sort((a, b) => a - b);
    embryos.sort((a, b) => a - b);
    attempts.sort((a, b) => a - b);
    destroys.sort((a, b) => a - b);
    charms.sort((a, b) => a - b);
    const mean = (arr) => {
      let s = 0;
      for (let i = 0; i < arr.length; i++) s += arr[i];
      return s / arr.length;
    };
    return {
      runs: n,
      reachRate: n ? reach / n : 0,
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
      charm: {
        mean: mean(charms),
        p50: percentile(charms, 0.5),
        p90: percentile(charms, 0.9),
      },
    };
  }

  function monteCarlo(opts) {
    const n = opts.runs || (global.DNFConfig && global.DNFConfig.monteCarlo.defaultRuns) || 2000;
    const samples = new Array(n);
    for (let i = 0; i < n; i++) samples[i] = simulateToTarget(opts);
    return summarizeMonteCarlo(samples);
  }

  function monteCarloAsync(opts, onProgress) {
    const n = opts.runs || (global.DNFConfig && global.DNFConfig.monteCarlo.defaultRuns) || 2000;
    const samples = new Array(n);
    let i = 0;
    return new Promise((resolve) => {
      function step() {
        const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
        while (i < n) {
          samples[i] = simulateToTarget(opts);
          i += 1;
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          if (now - t0 >= 8) break;
        }
        if (onProgress) onProgress(i / n);
        if (i < n) {
          setTimeout(step, 0);
          return;
        }
        resolve(summarizeMonteCarlo(samples));
      }
      step();
    });
  }

  global.DNFEngine = {
    successRate,
    roll,
    attemptCost,
    canAfford,
    pay,
    simulateToTarget,
    expectedToTarget,
    adviseSet,
    monteCarlo,
    monteCarloAsync,
  };
})(window);
