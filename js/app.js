(function () {
  const C = window.DNFConfig;
  const D = window.DNFData;
  const E = window.DNFEngine;
  const STORAGE_KEY = "dnf-zengfu-sim-v2";

  const state = {
    bag: [],
    selectedId: null,
    bagFilter: "all",
    selectedSlot: "weapon",
    gear: Object.fromEntries(D.SLOTS.map((s) => [s.id, 0])),
    auto: false,
    fusing: false,
    useCharm: false,
    mcCharm: false,
    spent: { crystal: 0, charm: 0 },
  };

  function uid() {
    return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function makeEmbryo(weapon, level) {
    const lv = Number(level);
    return {
      id: uid(),
      weapon: !!weapon,
      level: Number.isNaN(lv) ? 0 : lv,
      crystal: 0,
      charm: 0,
      broken: false,
    };
  }

  function isLive(e) {
    return e && !e.broken;
  }

  function selected() {
    const cur = state.bag.find((e) => e.id === state.selectedId) || null;
    return isLive(cur) ? cur : null;
  }

  function $(sel, root = document) {
    return root.querySelector(sel);
  }
  function $$(sel, root = document) {
    return [...root.querySelectorAll(sel)];
  }
  function byId(id) {
    return document.getElementById(id);
  }

  function sfx(name, a, b) {
    const api = window.Sfx;
    if (api && typeof api[name] === "function") api[name](a, b);
  }

  function toast(msg, kind) {
    const el = byId("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2200);
    if (kind === "deny") sfx("deny");
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("zh-CN");
  }

  function iconSvg(weapon, empty) {
    if (empty) {
      return '<defs><radialGradient id="eg" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#3a3224"/><stop offset="1" stop-color="#141018"/></radialGradient></defs>' +
        '<circle cx="48" cy="48" r="30" fill="url(#eg)" stroke="#8a6a2a" stroke-width="1.4" opacity="0.7"/>' +
        '<path d="M48 22v12M48 62v12M22 48h12M62 48h12" stroke="#d6b15a" stroke-width="1.6" opacity="0.55"/>' +
        '<path d="M33 33l8 8M55 55l8 8M33 63l8-8M55 41l8-8" stroke="#9a8d74" stroke-width="1.2" opacity="0.45"/>' +
        '<circle cx="48" cy="48" r="8" fill="none" stroke="#d6b15a" stroke-width="1.4" opacity="0.5"/>';
    }
    if (weapon) {
      return '<defs>' +
        '<linearGradient id="blade" x1="48" y1="6" x2="48" y2="54"><stop offset="0" stop-color="#f7eed4"/><stop offset=".45" stop-color="#e8d08a"/><stop offset="1" stop-color="#8a6a2a"/></linearGradient>' +
        '<linearGradient id="grip" x1="40" y1="56" x2="56" y2="80"><stop offset="0" stop-color="#4a2e18"/><stop offset="1" stop-color="#1c120c"/></linearGradient>' +
        '<radialGradient id="gem" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ff9a6a"/><stop offset="1" stop-color="#c43a1a"/></radialGradient>' +
        '</defs>' +
        '<ellipse cx="48" cy="52" rx="16" ry="26" fill="#d6b15a" opacity="0.08"/>' +
        '<path d="M48 8c3 8 7 22 8.6 36.5L48 52l-8.6-7.5C41 30 45 16 48 8z" fill="url(#blade)" stroke="#f3d98a" stroke-width="1.2"/>' +
        '<path d="M48 14v34" stroke="#8a6a2a" stroke-width="1.15" opacity="0.7"/>' +
        '<path d="M27 51.5c14-6 28-6 42 0l-3.2 5.2c-12-4.2-23.6-4.2-35.6 0z" fill="#2a1c0c" stroke="#d6b15a" stroke-width="1.4"/>' +
        '<path d="M31 53.2h34" stroke="#f3d98a" stroke-width="0.8" opacity="0.55"/>' +
        '<rect x="43.5" y="56" width="9" height="17" rx="1.4" fill="url(#grip)" stroke="#d6b15a" stroke-width="1.1"/>' +
        '<path d="M45 59.5h6M45 63.5h6M45 67.5h6" stroke="#8a6a2a" stroke-width="1"/>' +
        '<circle cx="48" cy="78.5" r="6.2" fill="#2a1c0c" stroke="#d6b15a" stroke-width="1.3"/>' +
        '<circle cx="48" cy="78.5" r="2.8" fill="url(#gem)"/>';
    }
    return '<defs>' +
      '<linearGradient id="plate" x1="48" y1="10" x2="48" y2="86"><stop offset="0" stop-color="#3a3348"/><stop offset=".5" stop-color="#1a1624"/><stop offset="1" stop-color="#0e0c14"/></linearGradient>' +
      '<linearGradient id="rim" x1="20" y1="12" x2="76" y2="84"><stop offset="0" stop-color="#f3d98a"/><stop offset="1" stop-color="#8a6a2a"/></linearGradient>' +
      '</defs>' +
      '<path d="M48 12l30 10.5v24c0 20-13.5 34.5-30 41.5C31.5 81 18 66.5 18 46.5v-24z" fill="url(#plate)" stroke="url(#rim)" stroke-width="2"/>' +
      '<path d="M48 20l21 7.2v19.2c0 14.5-9.6 25-21 30.2-11.4-5.2-21-15.7-21-30.2V27.2z" fill="none" stroke="#d6b15a" stroke-width="1.1" opacity="0.45"/>' +
      '<path d="M48 30l7 7-7 16-7-16z" fill="#2a1c0c" stroke="#d6b15a" stroke-width="1.3"/>' +
      '<circle cx="48" cy="36" r="2.1" fill="#f3d98a"/>' +
      '<path d="M30 40h8M58 40h8M33 54h6M57 54h6" stroke="#9a8d74" stroke-width="1.2" opacity="0.55"/>';
  }

  function vfxClass(level) {
    let cls = "";
    C.altarGlow.forEach((g) => {
      if (level >= g.min) cls = g.cls;
    });
    return cls;
  }

  function attrText(level, isWeapon) {
    const skill = D.skillAtk(level);
    if (isWeapon) {
      return "物攻/魔攻 +" + D.weaponDualAtk(level) + (skill ? " · 技攻 +" + skill + "%" : "");
    }
    return "力量/智力 +" + D.gearStrInt(level) + " · 抗魔 +" + D.gearMagicResist(level) +
      (skill ? " · 技攻 +" + skill + "%" : "");
  }

  function log(html) {
    const box = byId("log");
    const line = document.createElement("div");
    line.innerHTML = html;
    box.prepend(line);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bag: state.bag,
      selectedId: state.selectedId,
      bagFilter: state.bagFilter,
      gear: state.gear,
      useCharm: state.useCharm,
      mcCharm: state.mcCharm,
      spent: state.spent,
    }));
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw || !Array.isArray(raw.bag)) return false;
      state.bag = raw.bag.map((e) => ({
        id: e.id || uid(),
        weapon: !!e.weapon,
        level: Math.max(0, Math.min(D.MAX_LEVEL, Number(e.level) || 0)),
        crystal: Math.max(0, Number(e.crystal) || 0),
        charm: Math.max(0, Number(e.charm) || 0),
        broken: !!e.broken,
      }));
      state.selectedId = raw.selectedId || (state.bag[0] && state.bag[0].id) || null;
      state.bagFilter = raw.bagFilter || "all";
      state.gear = { ...state.gear, ...(raw.gear || {}) };
      state.useCharm = !!raw.useCharm;
      state.mcCharm = !!raw.mcCharm;
      if (raw.spent) {
        state.spent = {
          crystal: Math.max(0, Number(raw.spent.crystal) || 0),
          charm: Math.max(0, Number(raw.spent.charm) || 0),
        };
      } else {
        state.spent = {
          crystal: state.bag.reduce((n, e) => n + (e.crystal || 0), 0),
          charm: state.bag.reduce((n, e) => n + (e.charm || 0), 0),
        };
      }
      return true;
    } catch {
      return false;
    }
  }

  function visibleBag() {
    return state.bag.filter((e) => {
      if (state.bagFilter === "weapon") return e.weapon;
      if (state.bagFilter === "gear") return !e.weapon;
      return true;
    }).sort((a, b) => Number(!!a.broken) - Number(!!b.broken) || b.level - a.level || Number(b.weapon) - Number(a.weapon));
  }

  function renderBag() {
    const list = visibleBag();
    const w = state.bag.filter((e) => e.weapon).length;
    const g = state.bag.length - w;
    const broken = state.bag.filter((e) => e.broken).length;
    byId("bagSummary").textContent = state.bag.length + " 件 · 武 " + w + " · 防 " + g + (broken ? " · 损 " + broken : "");
    const dropBrokenBtn = byId("btnDropBroken");
    if (dropBrokenBtn) {
      dropBrokenBtn.disabled = !broken;
      dropBrokenBtn.textContent = broken ? "分解损坏（" + broken + "）" : "分解损坏";
    }
    $$("[data-bag-filter]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.bagFilter === state.bagFilter);
    });
    if (!list.length) {
      byId("inventory").innerHTML = '<p class="hint">背包是空的。点上面的按钮生成武器或非武器胚子。</p>';
      return;
    }
    byId("inventory").innerHTML = list.map((e) => {
      const dead = !!e.broken;
      const on = !dead && e.id === state.selectedId;
      const vfx = D.vfxStage(e.level);
      const pickBtn = dead
        ? ""
        : `<button type="button" class="btn ${on ? "gold" : ""}" data-act="pick" data-id="${e.id}">${on ? "已上增幅机" : "放进增幅机"}</button>`;
      return `<article class="embryo ${e.weapon ? "weapon" : ""} ${on ? "selected" : ""} ${dead ? "broken" : ""}" data-id="${e.id}">
        ${dead ? '<div class="embryo-ribbon dead">已破坏</div>' : on ? '<div class="embryo-ribbon">已选中</div>' : ""}
        <div class="embryo-name">${e.weapon ? "次元灵驿 · 武器" : "次元灵驿 · 非武器"}</div>
        <div class="embryo-lv-row">
          <div class="embryo-lv num">+${e.level}</div>
          <div class="embryo-cost">
            <span>已耗矛盾 <b class="num">${fmt(e.crystal || 0)}</b></span>
            <span>已耗幸运符 <b class="num">${fmt(e.charm || 0)}</b></span>
          </div>
        </div>
        <div class="embryo-meta">${dead ? "已破坏" : attrText(e.level, e.weapon)}${!dead && vfx ? " · " + vfx.name : ""}</div>
        <div class="embryo-actions">
          ${pickBtn}
          <button type="button" class="btn danger" data-act="drop" data-id="${e.id}">分解</button>
        </div>
      </article>`;
    }).join("");
  }

  function renderSlots() {
    byId("slotGrid").innerHTML = D.SLOTS.map((s) => {
      const on = state.selectedSlot === s.id ? " active" : "";
      const lv = state.gear[s.id] || 0;
      return `<article class="slot${on}" data-slot="${s.id}">
        <div class="n">${s.name}</div>
        <label class="slot-lv">
          <span>+</span>
          <input type="number" min="0" max="${D.MAX_LEVEL}" value="${lv}" data-gear-lv="${s.id}" />
        </label>
        <button type="button" class="btn gold" data-slot-pick="${s.id}">置换</button>
      </article>`;
    }).join("");
    const hint = byId("swapPickHint");
    if (hint) hint.textContent = "点每个部位上的「置换」从背包选胚子。等级可直接改。";
  }

  function renderCharmButtons(usable) {
    const altar = byId("btnCharm");
    const calc = byId("btnMcCharm");
    if (usable) {
      altar.disabled = false;
      altar.className = "btn" + (state.useCharm ? " gold" : "");
      altar.textContent = state.useCharm
        ? "使用幸运符 · 开（+" + D.charmBonus(selected() ? selected().level : C.charm.minLevel) + "%）"
        : "使用幸运符 · 关";
    } else {
      altar.disabled = true;
      altar.className = "btn";
      altar.textContent = "使用幸运符 · +" + C.charm.minLevel + " 起可用";
    }
    calc.className = "btn" + (state.mcCharm ? " gold" : "");
    calc.textContent = state.mcCharm ? "演算用幸运符 · 开" : "演算用幸运符 · 关";
    const mcWrap = byId("mcCharmFromWrap");
    if (mcWrap) mcWrap.hidden = !state.mcCharm;
    const autoWrap = byId("autoCharmFromWrap");
    if (autoWrap) autoWrap.hidden = !state.useCharm;
  }

  function renderStage() {
    const cur = selected();
    const charmOn = state.useCharm;

    if (state.fusing && byId("ampOverlay") && byId("ampOverlay").hidden) state.fusing = false;
    if (!cur) {
      byId("eqSvg").innerHTML = iconSvg(true, true);
      byId("eqIcon").className = "altar empty";
      byId("ampLv").textContent = "未选择";
      byId("ampSub").innerHTML = "从左侧背包点一件次元灵驿放进增幅机";
      byId("rateNow").textContent = "—";
      byId("rateBase").textContent = "—";
      byId("failTxt").textContent = "—";
      byId("failHint").textContent = "先选胚子";
      byId("costRow").innerHTML = '<div class="cost">增幅机是空的</div>';
      byId("btnAmp").disabled = true;
      renderCharmButtons(false);
      return;
    }

    const from = cur.level;
    const usable = D.canUseCharm(from);
    const rate = E.successRate(from, charmOn);
    const base = D.BASE_SUCCESS[from] || 0;
    const bonus = charmOn && usable ? D.charmBonus(from) : 0;
    const vfx = D.vfxStage(from);

    byId("eqSvg").innerHTML = iconSvg(cur.weapon, false);
    byId("eqIcon").className = "altar " + (cur.weapon ? "weapon " : "gear ") + vfxClass(from) + " " + successGlowClass(from);
    byId("ampLv").textContent = "+" + from;
    byId("ampSub").innerHTML =
      "次元灵驿（" + (cur.weapon ? "武器" : "非武器") + "）" +
      (vfx ? " · <em>" + vfx.name + "</em>" : "") +
      "<br>" + attrText(from, cur.weapon);

    byId("rateNow").textContent = from >= D.MAX_LEVEL ? "—" : rate + "%";
    byId("rateBase").textContent = from >= D.MAX_LEVEL ? "—" : base + "%" + (bonus ? " +" + bonus + "%" : "");

    if (from >= D.MAX_LEVEL) {
      byId("failTxt").textContent = "满级";
      byId("failHint").textContent = "无法再增幅";
    } else {
      const rule = D.failRule(from);
      byId("failTxt").textContent = D.failLabel(from);
      byId("failHint").textContent =
        rule.type === "destroy" ? "失败则破坏，留下但不能再放入增幅器" :
        rule.type === "downgrade" ? "失败则掉级" : "本档必成";
    }

    renderCharmButtons(usable);

    const cost = E.attemptCost(from, cur.weapon, charmOn && usable);
    byId("costRow").innerHTML = from >= D.MAX_LEVEL
      ? '<div class="cost">已达增幅上限 ' + D.MAX_LEVEL + "</div>"
      : `<div class="cost">矛盾 <strong class="num">${fmt(cost.crystal)}</strong></div>
         <div class="cost">金币 <strong class="num">${fmt(cost.gold)}</strong></div>
         <div class="cost">幸运符 <strong class="num">${cost.charm}</strong></div>`;

    if (state.fusing && byId("ampOverlay") && byId("ampOverlay").hidden) state.fusing = false;
    byId("btnAmp").disabled = from >= D.MAX_LEVEL || state.fusing || state.auto;
  }

  function renderTable() {
    const rows = ["<thead><tr><th>等级</th><th>基础</th><th>幸运符</th><th>带符</th><th>失败结果</th><th>武器矛盾</th><th>非武器矛盾</th><th>武器金币</th><th>技攻</th></tr></thead><tbody>"];
    for (let i = 0; i < D.MAX_LEVEL; i++) {
      const charm = D.charmBonus(i);
      const src = D.CRYSTAL_SOURCE[i] === "scaled" ? " scaled" : "";
      rows.push(`<tr>
        <td>+${i} → +${i + 1}</td>
        <td class="num">${D.BASE_SUCCESS[i]}%</td>
        <td>${charm ? "+" + charm + "%" : "不可用"}</td>
        <td class="num">${E.successRate(i, true)}%</td>
        <td>${D.failDetail(i)}</td>
        <td class="num${src}">${D.CRYSTAL_WEAPON[i]}</td>
        <td class="num${src}">${D.CRYSTAL_GEAR[i]}</td>
        <td class="num${src}">${fmt(D.goldCost(i, true))}</td>
        <td class="num">${D.skillAtk(i + 1) ? D.skillAtk(i + 1) + "%" : "—"}</td>
      </tr>`);
    }
    rows.push("</tbody>");
    byId("offTable").innerHTML = rows.join("");
  }

  function renderSpent() {
    const crystal = byId("spentCrystal");
    const charm = byId("spentCharm");
    const teraEl = byId("spentTera");
    const rmbEl = byId("spentRmb");
    const cry = state.spent.crystal || 0;
    const ch = state.spent.charm || 0;
    const prices = C.tera || { crystal: 200, charm: 13000, rmbPerTera: 1.8 };
    const tera = cry * prices.crystal + ch * prices.charm;
    const rmb = tera / (prices.rmbPerTera || 1.8);
    if (crystal) crystal.textContent = fmt(cry);
    if (charm) charm.textContent = fmt(ch);
    if (teraEl) teraEl.textContent = fmt(tera);
    if (rmbEl) rmbEl.textContent = rmb.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function render() {
    renderBag();
    renderSlots();
    renderStage();
    renderSpent();
    const cur = selected();
    if (cur) renderCharmButtons(D.canUseCharm(cur.level));
    save();
  }

  function closeAmpOverlay() {
    const overlay = byId("ampOverlay");
    overlay.hidden = true;
    overlay.className = "amp-overlay";
    overlay._payload = null;
    hideMax20Flash();
    sfx("stopCharge");
    byId("ampAnim").hidden = false;
    byId("ampResult").hidden = true;
    state.fusing = false;
    clearTimeout(closeAmpOverlay._t);
    render();
  }

  function successGlowClass(from) {
    return D.pickByFrom(C.resultGlow, from).cls;
  }

  function resultSeal(kind) {
    if (kind === "success") {
      return '<svg viewBox="0 0 46 46" fill="none"><circle cx="23" cy="23" r="20" stroke="currentColor" stroke-width="1.6"/><path d="M13 24l7 7 14-16" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (kind === "destroy") {
      return '<svg viewBox="0 0 46 46" fill="none"><path d="M23 6l16 9v16l-16 9-16-9V15z" stroke="currentColor" stroke-width="1.6"/><path d="M16 16l14 14M30 16L16 30" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M23 8l3 10-8 4 12 3-6 9" stroke="currentColor" stroke-width="1.1" opacity="0.7"/></svg>';
    }
    return '<svg viewBox="0 0 46 46" fill="none"><circle cx="23" cy="23" r="20" stroke="currentColor" stroke-width="1.6"/><path d="M23 12v14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M16 24l7 9 7-9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function fillBurstLayer(el, count, shardRatio) {
    if (!el) return;
    const bits = [];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.55;
      const dist = 26 + Math.random() * 68;
      const tx = (Math.cos(ang) * dist).toFixed(1);
      const ty = (Math.sin(ang) * dist).toFixed(1);
      const delay = (Math.random() * 0.28).toFixed(2);
      const dur = (0.55 + Math.random() * 0.95).toFixed(2);
      const shard = Math.random() < (shardRatio || 0.22);
      const w = shard ? (2 + Math.random() * 3).toFixed(1) : (3 + Math.random() * 9).toFixed(1);
      const h = shard ? (16 + Math.random() * 34).toFixed(1) : w;
      bits.push(
        '<i class="fx-spark' + (shard ? " shard" : "") +
        '" style="--tx:' + tx + "vmin;--ty:" + ty + "vmin;--rot:" +
        ((ang * 180) / Math.PI).toFixed(1) + "deg;width:" + w + "px;height:" + h +
        "px;animation-delay:" + delay + "s;animation-duration:" + dur + 's"></i>'
      );
    }
    el.innerHTML = bits.join("");
  }

  function hideMax20Flash() {
    const el = byId("max20Flash");
    if (!el) return;
    el.classList.remove("show");
    el.hidden = true;
    const sparks = byId("max20Sparks");
    if (sparks) sparks.innerHTML = "";
    clearTimeout(hideMax20Flash._t);
  }

  function flashMax20() {
    const el = byId("max20Flash");
    if (!el) return;
    fillBurstLayer(byId("max20Sparks"), 56, 0.22);
    el.hidden = false;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    sfx("stamp");
    clearTimeout(hideMax20Flash._t);
    hideMax20Flash._t = setTimeout(hideMax20Flash, 2200);
  }

  function showAmpResult(payload) {
    const overlay = byId("ampOverlay");
    const kind = payload.result;
    const glow = kind === "success" ? successGlowClass(payload.to) : C.failGlow;
    overlay.className = "amp-overlay show " + glow + (kind === "destroy" ? " dead" : "");
    byId("ampAnim").hidden = true;
    byId("ampResult").hidden = false;
    const card = byId("ampResultCard");
    card.className = "amp-result-card " + glow + (kind === "destroy" ? " dead" : "");
    byId("ampResultSeal").innerHTML = resultSeal(kind);
    byId("ampResultEyebrow").textContent = payload.tag || "增幅结果";
    byId("ampResultTitle").textContent = payload.title;
    byId("ampResultFrom").textContent = payload.fromText;
    byId("ampResultArrow").textContent = payload.arrow || "→";
    byId("ampResultTo").textContent = payload.toText;
    byId("ampResultMeta").innerHTML = payload.meta;
    sfx("stopCharge");
    state.fusing = false;
    if (kind === "success" && payload.to >= D.MAX_LEVEL) flashMax20();
    render();
  }

  function playAmpSequence(payload) {
    const overlay = byId("ampOverlay");
    overlay.hidden = false;
    overlay.className = "amp-overlay show";
    byId("ampAnim").hidden = false;
    byId("ampResult").hidden = true;
    byId("ampAnimMeta").textContent = payload.animMeta;
    sfx("unlock");
    sfx("charge", C.anim.chargeMs);
    sfx("armResult", payload.result, C.anim.chargeMs);
    clearTimeout(closeAmpOverlay._t);
    closeAmpOverlay._t = setTimeout(() => showAmpResult(payload), C.anim.chargeMs);
    overlay._payload = payload;
  }

  function skipAmpAnim() {
    if (byId("ampResult").hidden === false) return;
    clearTimeout(closeAmpOverlay._t);
    sfx("stopCharge");
    const payload = byId("ampOverlay")._payload;
    if (payload) {
      sfx("playResult", payload.result);
      showAmpResult(payload);
    }
  }

  function pickEmbryo(id) {
    const item = state.bag.find((e) => e.id === id);
    if (!item) return;
    if (item.broken) {
      toast("这件已破坏，不能放进增幅机", "deny");
      return;
    }
    state.selectedId = id;
    sfx("tab");
    render();
  }

  function dropEmbryo(id) {
    const item = state.bag.find((e) => e.id === id);
    if (!item) return;
    state.bag = state.bag.filter((e) => e.id !== id);
    if (state.selectedId === id) state.selectedId = state.bag[0] ? state.bag[0].id : null;
    log("分解了一件 " + (item.weapon ? "武器" : "非武器") + " +" + item.level + "（几乎不返还）");
    toast("已分解 +" + item.level);
    sfx("downgrade");
    render();
  }

  function dropBroken() {
    const n = state.bag.filter((e) => e.broken).length;
    if (!n) {
      toast("没有已破坏的胚子", "deny");
      return;
    }
    state.bag = state.bag.filter((e) => !e.broken);
    if (state.selectedId && !state.bag.some((e) => e.id === state.selectedId)) {
      const live = state.bag.find((e) => !e.broken) || state.bag[0];
      state.selectedId = live ? live.id : null;
    }
    log("分解了 " + n + " 件已破坏胚子");
    toast("已分解损坏 " + n + " 件");
    sfx("downgrade");
    render();
  }

  function retireDestroyed() {
    const cur = state.bag.find((e) => e.id === state.selectedId);
    if (!cur) return;
    cur.broken = true;
    const kind = cur.weapon;
    if (!selectNext(kind)) {
      const live = state.bag.find((e) => !e.broken);
      state.selectedId = live ? live.id : null;
    }
    return kind;
  }

  function selectNext(weapon) {
    const live = state.bag.filter((e) => !e.broken);
    const same = live.filter((e) => e.weapon === weapon);
    const pool = same.length ? same : live;
    const next = pool.slice().sort((a, b) => a.level - b.level)[0];
    if (!next) return false;
    state.selectedId = next.id;
    return true;
  }

  function amplifyOnce(opts) {
    const silent = opts && opts.silent;
    if (!silent) sfx("unlock");
    if (!silent && state.fusing) {
      if (byId("ampOverlay") && !byId("ampOverlay").hidden) return { result: "busy" };
      state.fusing = false;
    }
    const cur = selected();
    if (!cur) {
      toast("先在背包里选一件放进增幅机", "deny");
      return { result: "dead" };
    }
    if (cur.level >= D.MAX_LEVEL) {
      toast("已经满级", "deny");
      return { result: "full" };
    }
    const from = cur.level;
    const kindName = cur.weapon ? "武器" : "非武器";
    const wantCharm = opts && Object.prototype.hasOwnProperty.call(opts, "useCharm")
      ? !!opts.useCharm
      : state.useCharm;
    const charm = wantCharm && D.canUseCharm(from);
    const cost = E.attemptCost(from, cur.weapon, charm);
    cur.crystal = (cur.crystal || 0) + cost.crystal;
    cur.charm = (cur.charm || 0) + (cost.charm || 0);
    state.spent.crystal = (state.spent.crystal || 0) + cost.crystal;
    state.spent.charm = (state.spent.charm || 0) + (cost.charm || 0);

    const out = E.roll(from, charm);
    let payload = null;
    if (out.result === "success") {
      cur.level = out.to;
      log(`<span class="ok">成功</span> ${kindName} +${from} → +${out.to}　矛盾 -${fmt(cost.crystal)}　${charm ? "幸运符 -1　" : ""}成功率 ${out.rate}%`);
      payload = {
        result: "success",
        title: "成功",
        tag: "增幅成功",
        from: from,
        to: out.to,
        fromText: "+" + from,
        toText: "+" + out.to,
        arrow: "→",
        meta: kindName + "次元灵驿　成功率 " + out.rate + "%<br>矛盾 -" + fmt(cost.crystal) + (charm ? "　幸运符 -1" : ""),
        animMeta: kindName + " +" + from + " → +" + (from + 1),
      };
    } else if (out.result === "downgrade") {
      cur.level = out.to;
      log(`<span class="down">降级</span> ${kindName} +${from} → +${out.to}（-${out.drop}）　成功率 ${out.rate}%`);
      payload = {
        result: "downgrade",
        title: "失败",
        tag: "增幅失败 · 降级",
        from: from,
        fromText: "+" + from,
        toText: "+" + out.to,
        arrow: "↘",
        meta: "降 " + out.drop + " 级　成功率 " + out.rate + "%<br>矛盾已消耗，不返还",
        animMeta: kindName + " +" + from + " → +" + (from + 1),
      };
    } else if (out.result === "destroy") {
      log(`<span class="dead">破坏</span> ${kindName} +${from} 留下，不能再放入增幅器　成功率 ${out.rate}%`);
      payload = {
        result: "destroy",
        title: "破坏",
        tag: "增幅失败 · 胚子破坏",
        from: from,
        fromText: "+" + from,
        toText: "破碎",
        arrow: "×",
        meta: kindName + "次元灵驿留下，不能再放入增幅器　成功率 " + out.rate + "%<br>材料不返还",
        animMeta: kindName + " +" + from + " → +" + (from + 1),
      };
      retireDestroyed();
    }
    if (!silent && payload) state.fusing = true;
    render();
    if (!silent && payload) playAmpSequence(payload);
    return out;
  }

  function closeSwapPick() {
    const overlay = byId("swapOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList.remove("show");
  }

  function openSwapPick(slotId) {
    const slot = D.SLOTS.find((s) => s.id === slotId);
    if (!slot) return;
    state.selectedSlot = slotId;
    const gearLv = state.gear[slot.id] || 0;
    const kind = slot.weapon ? "武器" : "非武器";
    byId("swapPickTitle").textContent = "置换" + slot.name;
    byId("swapPickSub").textContent = "身上 +" + gearLv + " · 选一件更高的" + kind + "胚子";
    const list = state.bag
      .filter((e) => isLive(e) && e.weapon === slot.weapon && e.level > gearLv)
      .sort((a, b) => b.level - a.level || (b.crystal || 0) - (a.crystal || 0));
    const box = byId("swapPickList");
    if (!list.length) {
      box.innerHTML = '<p class="hint">没有高于 +' + gearLv + " 的" + kind + "胚子。损坏件和等级不够的都不会出现。</p>";
    } else {
      box.innerHTML = list.map((e) => {
        return `<article class="embryo ${e.weapon ? "weapon" : ""}" data-swap-id="${e.id}">
          <div class="embryo-name">${e.weapon ? "次元灵驿 · 武器" : "次元灵驿 · 非武器"}</div>
          <div class="embryo-lv-row">
            <div class="embryo-lv num">+${e.level}</div>
            <div class="embryo-cost">换上后胚子变 +${gearLv}</div>
          </div>
          <div class="embryo-actions">
            <button type="button" class="btn gold" data-swap-do="${e.id}">置换</button>
          </div>
        </article>`;
      }).join("");
    }
    const overlay = byId("swapOverlay");
    overlay.hidden = false;
    overlay.classList.add("show");
    sfx("tab");
    renderSlots();
  }

  function swapWith(embryoId) {
    const cur = state.bag.find((e) => e.id === embryoId);
    const slot = D.SLOTS.find((s) => s.id === state.selectedSlot);
    if (!cur || cur.broken) {
      toast("这件不能置换", "deny");
      return;
    }
    if (!slot) return;
    if (slot.weapon !== cur.weapon) {
      toast("部位不对：武器胚子只能换武器", "deny");
      return;
    }
    if (cur.level <= state.gear[slot.id]) {
      toast("胚子必须高于 " + slot.name + " +" + state.gear[slot.id], "deny");
      return;
    }
    const old = cur.level;
    const target = state.gear[slot.id];
    state.gear[slot.id] = old;
    cur.level = target;
    cur.crystal = 0;
    cur.charm = 0;
    state.selectedId = cur.id;
    sfx("success");
    log(`<span class="swap">置换</span> ${slot.name} 变为 +${old}，背包胚子变为 +${target}`);
    toast(slot.name + " +" + old);
    closeSwapPick();
    render();
  }

  function craftEmbryo(weapon) {
    const level = clampNum(byId("genLevel").value, 0, D.MAX_LEVEL);
    byId("genLevel").value = level;
    const item = makeEmbryo(weapon, level);
    state.bag.unshift(item);
    if (!selected()) state.selectedId = item.id;
    toast("已生成 +" + level + " " + (weapon ? "武器" : "非武器") + "胚子");
    sfx("tab");
    render();
    return item;
  }

  let autoTimer = 0;
  function stopAuto() {
    state.auto = false;
    clearTimeout(autoTimer);
    byId("btnAuto").textContent = "开始自动";
    render();
  }

  function clampNum(v, a, b) {
    const n = Number(v);
    if (Number.isNaN(n)) return a;
    return Math.max(a, Math.min(b, n));
  }

  function autoTick() {
    if (!state.auto) return;
    const target = clampNum(byId("autoTarget").value, 1, D.MAX_LEVEL);
    const cur = selected();
    if (cur && cur.level >= target) {
      toast("已达到 +" + target);
      stopAuto();
      return;
    }
    if (!cur) {
      toast("背包里没有选中的胚子", "deny");
      stopAuto();
      return;
    }
    const kind = cur.weapon;
    const charmFrom = clampNum(byId("autoCharmFrom").value, 0, D.MAX_LEVEL);
    const out = amplifyOnce({
      silent: true,
      useCharm: state.useCharm && cur.level >= charmFrom,
    });
    if (out.result === "poor" || out.result === "full") {
      stopAuto();
      return;
    }
    if (out.result === "destroy") {
      if (byId("autoDestroy").value === "stop") {
        stopAuto();
        return;
      }
      if (!selectNext(kind)) {
        toast("没有同类型备用胚子，请先生成", "deny");
        stopAuto();
        return;
      }
    }
    autoTimer = setTimeout(autoTick, clampNum(byId("autoDelay").value, 0, C.auto.maxDelay));
  }

  let mcBusy = false;

  function setMcBusy(on) {
    mcBusy = on;
    const btn = byId("btnMc");
    if (btn) {
      btn.disabled = on;
      btn.textContent = on ? "计算中…" : "计算期望";
    }
  }

  function runMonteCarlo() {
    if (mcBusy) return;
    const isWeapon = byId("mcType").value === "weapon";
    const start = clampNum(byId("mcStart").value, 0, D.MAX_LEVEL - 1);
    const target = clampNum(byId("mcTarget").value, 1, D.MAX_LEVEL);
    const count = clampNum(byId("mcCount").value, 1, C.monteCarlo.maxCount || 12);
    const runs = clampNum(byId("mcRuns").value, C.monteCarlo.minRuns, C.monteCarlo.maxRuns);
    const charmFrom = state.mcCharm ? clampNum(byId("mcCharmFrom").value, 0, D.MAX_LEVEL) : 0;
    if (target <= start) {
      toast("目标必须高于起始等级", "deny");
      return;
    }
    byId("mcStart").value = start;
    byId("mcTarget").value = target;
    byId("mcCount").value = count;
    byId("mcOut").innerHTML = "<p class='hint'>计算中… 0%</p>";
    const adviceBox = byId("mcAdvice");
    adviceBox.hidden = true;
    adviceBox.innerHTML = "";
    sfx("calc");
    setMcBusy(true);

    const paint = (r) => {
      const n = count;
      const piece = n > 1 ? n + "件" : "";
      const many = n > 1 ? "按 " + n + " 件合计。" : "";
      byId("mcOut").innerHTML = [
        ["达成率", (r.reachRate * 100).toFixed(1) + "%", "这么多次独立模拟里，最终打到目标等级的比例。会一直打到目标，所以一般是 100%。"],
        [piece + "矛盾中位数", fmt(r.crystal.p50 * n), "一半的模拟消耗的矛盾不超过这个数，比平均数更接近普通人的花费。" + many],
        [piece + "矛盾期望", fmt(r.crystal.mean * n), "所有模拟消耗矛盾的平均值。极欧或极非会把这个数拉高或拉低。" + many],
        [piece + "矛盾 P90", fmt(r.crystal.p90 * n), "90% 的模拟消耗不超过这个数。剩下 10% 更倒霉，用来看最坏情况要准备多少。" + many],
        [piece + "幸运符中位数", fmt(r.charm.p50 * n), "一半的模拟用掉的幸运符不超过这个数。没开符或该档不用符时是 0。" + many],
        [piece + "幸运符期望", fmt(r.charm.mean * n), "所有模拟消耗幸运符的平均值。" + many],
        [piece + "胚子中位数", (r.embryo.p50 * n).toFixed(1), "一半的模拟用掉的胚子数（含第一件；破坏后换新也算）。置换下来的那件不另计一件。" + many],
        [piece + "胚子期望", (r.embryo.mean * n).toFixed(2), "平均要用掉几件胚子。破坏越多，这个数越大。" + many],
        [piece + "尝试中位数", fmt(r.attempt.p50 * n), "一半的模拟里，点「增幅」的次数不超过这个数。" + many],
        [piece + "破坏中位数", (r.destroy.p50 * n).toFixed(1), "一半的模拟里，胚子被破坏的次数不超过这个数。" + many],
      ].map(([k, v, tip]) =>
        `<div class="cell"><span>${k}</span><b class="num">${v}</b><small>${tip}</small></div>`
      ).join("");
      renderMcAdvice(start, target, isWeapon, count);
    };

    const work = E.monteCarloAsync
      ? E.monteCarloAsync({
        start, target, isWeapon, useCharm: state.mcCharm, charmFrom, runs,
      }, (p) => {
        byId("mcOut").innerHTML = "<p class='hint'>计算中… " + Math.round(p * 100) + "%</p>";
      })
      : Promise.resolve(E.monteCarlo({
        start, target, isWeapon, useCharm: state.mcCharm, charmFrom, runs,
      }));

    Promise.resolve(work).then(paint).catch((err) => {
      console.error(err);
      byId("mcOut").innerHTML = "<p class='hint'>计算失败，请再试一次。</p>";
    }).then(() => setMcBusy(false));
  }

  function fmtTera(n) {
    if (!Number.isFinite(n)) return "—";
    if (n >= 10000) return (n / 10000).toFixed(1) + " 万泰拉";
    return fmt(n) + " 泰拉";
  }

  function savePct(a, b) {
    if (!b || !Number.isFinite(a) || !Number.isFinite(b)) return null;
    return ((b - a) / b) * 100;
  }

  function renderMcAdvice(start, target, isWeapon, count) {
    const box = byId("mcAdvice");
    const prices = C.tera || { crystal: 200, charm: 13000 };
    const advice = E.adviseSet({
      start,
      target,
      isWeapon,
      count,
      crystalTera: prices.crystal,
      charmTera: prices.charm,
    });
    const best = advice.best;
    const kindName = isWeapon ? "武器" : "非武器";
    const gate = best.charmFrom;
    let headline;
    let how;
    if (target <= advice.charmMin) {
      headline = "还在必成附近，幸运符基本用不上。";
      how = "从 +" + start + " 打到 +" + target + " 不必带符。破坏后从 0 重来也一样。";
    } else if (best.kind === "none") {
      headline = "全程不使用幸运符最合适。";
      how = "从 +" + start + " 打到 +" + target + " 都不用符。破坏后新胚子从 0 重来，也全程不带符。";
    } else if (advice.mustCharm) {
      headline = "当前从 +" + start + " 起步必须使用幸运符；破坏后从 0 重来，增幅到 " + gate + " 级后再用符。";
      how = "手头这件已经到 +" + start + "，一上来就带符。胚子破坏后新胚子从 0 打起，增幅到 +" + gate + " 才开始用幸运符。";
    } else {
      headline = "增幅到 " + gate + " 级后才使用幸运符最合适。";
      how = "从 +" + start + " 打到 +" + target + "，+" + gate + " 级前不用符。破坏后新胚子从 0 重来，同样是增幅到 +" + gate + " 后再用符。";
    }

    const vsAll = advice.allCharm ? savePct(best.tera, advice.allCharm.tera) : null;
    const vsNone = savePct(best.tera, advice.noCharm.tera);
    const cmp = [];
    if (advice.allCharm && best !== advice.allCharm && vsAll != null && vsAll > 0.3) {
      cmp.push("比从 +" + advice.charmMin + " 起全程带符大约省 " + vsAll.toFixed(1) + "%");
    }
    if (best !== advice.noCharm && vsNone != null && vsNone > 0.3) {
      cmp.push("比全程不用符大约省 " + vsNone.toFixed(1) + "%");
    }

    box.hidden = false;
    box.innerHTML =
      '<div class="mc-advice-kicker">AI 评测</div>' +
      '<div class="mc-advice-title">' + headline + "</div>" +
      "<p>按你填的 <b>" + count + " 件" + kindName + "</b>，从 +" + start + " 打到 +" + target +
      "。" + how +
      "置换后胚子变回 +" + start + "，下一件从 +" + start + " 接着打。" +
      "矛盾 <b>" + fmt(prices.crystal) + "</b> 泰拉一个、幸运符 <b>" + fmt(prices.charm) +
      "</b> 泰拉一个折算。合计期望约 <b class=\"num\">" + fmtTera(best.tera) + "</b>。</p>" +
      (cmp.length ? "<p>" + cmp.join("；") + "。</p>" : "") +
      '<p class="hint">按期望值扫开符档，和上面抽样表不是同一套数字。行情按矛盾 ' +
      fmt(prices.crystal) + "、幸运符 " + fmt(prices.charm) + " 泰拉。</p>";
  }

  function goTab(name) {
    $$(".tabs button").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
    sfx("tab");
  }

  function applyConfigUI() {
    const mc = C.monteCarlo;
    const max = D.MAX_LEVEL;
    const start = byId("mcStart");
    start.min = 0;
    start.max = max - 1;
    start.value = mc.defaultStart;
    const target = byId("mcTarget");
    target.min = 1;
    target.max = max;
    target.value = mc.defaultTarget;
    const mcf = byId("mcCharmFrom");
    mcf.min = 0;
    mcf.max = max;
    mcf.value = mc.defaultCharmFrom;
    const cnt = byId("mcCount");
    cnt.min = 1;
    cnt.max = mc.maxCount || 12;
    cnt.value = mc.defaultCount || 1;
    byId("mcRuns").innerHTML = mc.runOptions.map((n) =>
      "<option" + (n === mc.defaultRuns ? " selected" : "") + ">" + n + "</option>"
    ).join("");
    byId("mcPresets").innerHTML = mc.presets.map((p) =>
      '<button type="button" class="btn preset' + (p.gold ? " gold" : "") +
      '" data-mc="' + p.start + "," + p.target + '">' + p.label + "</button>"
    ).join("");
    const at = byId("autoTarget");
    at.min = 1;
    at.max = max;
    at.value = C.auto.defaultTarget;
    const ad = byId("autoDelay");
    ad.min = 0;
    ad.max = C.auto.maxDelay;
    ad.value = C.auto.defaultDelay;
    const ac = byId("autoCharmFrom");
    ac.min = 0;
    ac.max = max;
    ac.value = C.auto.defaultCharmFrom;
    const gl = byId("genLevel");
    gl.min = 0;
    gl.max = max;
  }

  function bindClamp(id, min, max) {
    const el = byId(id);
    if (!el) return;
    const apply = () => { el.value = clampNum(el.value, min, max); };
    el.addEventListener("change", apply);
    el.addEventListener("blur", apply);
    el.addEventListener("input", () => {
      if (el.value === "" || el.value === "-") return;
      const n = Number(el.value);
      if (!Number.isNaN(n) && n > max) el.value = max;
    });
  }

  function bind() {
    applyConfigUI();
    bindClamp("mcTarget", 1, D.MAX_LEVEL);
    bindClamp("mcStart", 0, D.MAX_LEVEL - 1);
    bindClamp("mcCharmFrom", 0, D.MAX_LEVEL);
    bindClamp("mcCount", 1, C.monteCarlo.maxCount || 12);
    bindClamp("autoTarget", 1, D.MAX_LEVEL);
    bindClamp("autoCharmFrom", 0, D.MAX_LEVEL);
    byId("btnAmp").onclick = () => amplifyOnce();
    byId("btnSkipAnim").onclick = skipAmpAnim;
    byId("btnCloseResult").onclick = closeAmpOverlay;
    byId("btnCloseResult").addEventListener("touchend", (ev) => {
      ev.preventDefault();
      closeAmpOverlay();
    }, { passive: false });
    byId("ampOverlayBg").onclick = () => {
      if (byId("ampResult").hidden) skipAmpAnim();
      else closeAmpOverlay();
    };
    byId("btnCloseSwapPick").onclick = closeSwapPick;
    byId("swapOverlayBg").onclick = closeSwapPick;
    byId("swapPickList").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-swap-do]");
      const card = ev.target.closest("[data-swap-id]");
      const id = (btn && btn.dataset.swapDo) || (card && card.dataset.swapId);
      if (!id || (btn && btn.disabled)) return;
      const item = state.bag.find((e) => e.id === id);
      const slot = D.SLOTS.find((s) => s.id === state.selectedSlot);
      if (!item || !slot || item.level <= (state.gear[slot.id] || 0)) {
        toast("这件等级不够", "deny");
        return;
      }
      swapWith(id);
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && byId("swapOverlay") && !byId("swapOverlay").hidden) closeSwapPick();
    });
    byId("btnCharm").onclick = () => {
      const cur = selected();
      if (!cur || !D.canUseCharm(cur.level)) {
        toast("从 +" + C.charm.minLevel + " 起才能使用幸运符", "deny");
        return;
      }
      state.useCharm = !state.useCharm;
      sfx("tab");
      render();
    };
    byId("btnMcCharm").onclick = () => {
      state.mcCharm = !state.mcCharm;
      sfx("tab");
      renderCharmButtons(selected() && D.canUseCharm(selected().level));
    };
    byId("btnGenW").onclick = () => craftEmbryo(true);
    byId("btnGenG").onclick = () => craftEmbryo(false);
    byId("btnMc").onclick = runMonteCarlo;
    byId("btnStop").onclick = stopAuto;
    byId("btnAuto").onclick = () => {
      if (state.auto) { stopAuto(); return; }
      if (!selected()) { toast("先选一件胚子", "deny"); return; }
      state.auto = true;
      byId("btnAuto").textContent = "自动中";
      render();
      autoTick();
    };
    byId("btnDropBroken").onclick = dropBroken;
    byId("btnClear").onclick = () => {
      if (!confirm("清空背包、身上增幅和消耗统计？")) return;
      state.bag = [];
      state.selectedId = null;
      state.spent = { crystal: 0, charm: 0 };
      state.gear = Object.fromEntries(D.SLOTS.map((s) => [s.id, 0]));
      byId("log").innerHTML = "";
      render();
      toast("已清空");
    };

    byId("inventory").addEventListener("click", (ev) => {
      const act = ev.target.closest("[data-act]");
      const card = ev.target.closest(".embryo");
      if (act && act.dataset.act === "drop") {
        ev.stopPropagation();
        dropEmbryo(act.dataset.id);
        return;
      }
      const id = (act && act.dataset.id) || (card && card.dataset.id);
      const item = id && state.bag.find((e) => e.id === id);
      if (item && item.broken) return;
      if (id) pickEmbryo(id);
    });

    byId("slotGrid").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-slot-pick]");
      if (!btn) return;
      openSwapPick(btn.dataset.slotPick);
    });
    byId("slotGrid").addEventListener("change", (ev) => {
      const input = ev.target.closest("[data-gear-lv]");
      if (!input) return;
      const id = input.dataset.gearLv;
      const lv = clampNum(input.value, 0, D.MAX_LEVEL);
      state.gear[id] = lv;
      input.value = lv;
      save();
    });

    $$("[data-bag-filter]").forEach((btn) => {
      btn.onclick = () => {
        state.bagFilter = btn.dataset.bagFilter;
        sfx("tab");
        render();
      };
    });

    $$(".tabs button").forEach((tab) => {
      tab.onclick = () => goTab(tab.dataset.tab);
    });
    $$("[data-go-tab]").forEach((btn) => {
      btn.onclick = () => goTab(btn.dataset.goTab);
    });
    $$("[data-mc]").forEach((btn) => {
      btn.onclick = () => {
        const [a, b] = btn.dataset.mc.split(",");
        byId("mcStart").value = clampNum(a, 0, D.MAX_LEVEL - 1);
        byId("mcTarget").value = clampNum(b, 1, D.MAX_LEVEL);
        sfx("tab");
        runMonteCarlo();
      };
    });

    const sfxBtn = byId("btn-sfx");
    sfxBtn.textContent = window.Sfx ? window.Sfx.label() : "音效 开";
    sfxBtn.classList.toggle("is-off", window.Sfx && window.Sfx.isOff());
    sfxBtn.onclick = () => {
      if (!window.Sfx) return;
      sfxBtn.textContent = window.Sfx.cycle();
      sfxBtn.classList.toggle("is-off", window.Sfx.isOff());
    };
    document.addEventListener("pointerdown", () => {
      if (!window.Sfx) return;
      window.Sfx.unlock();
      window.Sfx.tab();
    }, { once: true });
  }

  bind();
  load();
  renderTable();
  render();
  log("点背包里的胚子放进增幅机，再增幅。破坏后这件留下，但不能再放入增幅器。");
})();
