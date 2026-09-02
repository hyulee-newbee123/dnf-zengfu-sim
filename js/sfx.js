(() => {
  const KEY = "dnf-zengfu-sfx-level";
  const LEVELS = [
    { id: "off", label: "音效 关", vol: 0 },
    { id: "low", label: "音效 低", vol: 0.4 },
    { id: "on", label: "音效 开", vol: 0.88 },
  ];

  const BGM_SRC = "Eric W. Brown - Black Market.mp3";
  const BGM_VOL = [0, 0.14, 0.3];

  let audio = null;
  let master = null;
  let chargeNodes = [];
  let bgm = null;
  const saved = localStorage.getItem(KEY);
  let level = LEVELS.findIndex((x) => x.id === saved);
  if (level < 0) level = 2;

  function bgmVol() {
    return BGM_VOL[level] || 0;
  }

  function ensureBgm() {
    if (bgm) return bgm;
    bgm = new Audio(encodeURI(BGM_SRC));
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = bgmVol();
    return bgm;
  }

  function startBgm() {
    if (bgmVol() < 0.001) {
      if (bgm) bgm.pause();
      return;
    }
    const el = ensureBgm();
    el.volume = bgmVol();
    const play = el.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
  }

  function applyBgmVol() {
    if (!bgm) {
      if (bgmVol() > 0) startBgm();
      return;
    }
    bgm.volume = bgmVol();
    if (bgmVol() < 0.001) bgm.pause();
    else if (bgm.paused) startBgm();
  }

  function vol() {
    return LEVELS[level].vol;
  }

  function boot() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audio) {
      audio = new AC();
      master = audio.createGain();
      master.gain.value = vol();
      master.connect(audio.destination);
    }
    master.gain.setTargetAtTime(vol(), audio.currentTime, 0.02);
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  function whenReady(fn) {
    const c = boot();
    if (!c || vol() < 0.001) return;
    if (c.state === "suspended") {
      c.resume().then(() => { if (vol() > 0.001 && audio) fn(); }).catch(() => {});
      return;
    }
    fn();
  }

  function tone(type, freq, dur, peak) {
    whenReady(() => {
      const t = audio.currentTime + 0.01;
      const o = audio.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  function sweep(from, to, dur, peak) {
    whenReady(() => {
      const t = audio.currentTime + 0.01;
      const o = audio.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  function playNotes(list, gap, dur, peak, type) {
    whenReady(() => {
      const t0 = audio.currentTime + 0.012;
      list.forEach((freq, i) => {
        const t = t0 + i * gap;
        const o = audio.createOscillator();
        o.type = type || "triangle";
        o.frequency.setValueAtTime(freq, t);
        const g = audio.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + dur + 0.04);
      });
    });
  }

  function stopCharge() {
    if (!audio || !chargeNodes.length) return;
    const t = audio.currentTime;
    chargeNodes.forEach((n) => {
      try {
        if (n.gain) {
          n.gain.gain.cancelScheduledValues(t);
          n.gain.gain.setTargetAtTime(0.0001, t, 0.035);
        }
        if (n.osc) n.osc.stop(t + 0.1);
      } catch {
        /* already stopped */
      }
    });
    chargeNodes = [];
  }

  function charge(durMs) {
    whenReady(() => {
      stopCharge();
      const dur = Math.max(0.35, (Number(durMs) || 1400) / 1000);
      const t = audio.currentTime + 0.02;
      const end = t + dur;

      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 7;
      filter.frequency.setValueAtTime(360, t);
      filter.frequency.exponentialRampToValueAtTime(2200, end);

      const drone = audio.createOscillator();
      drone.type = "sawtooth";
      drone.frequency.setValueAtTime(78, t);
      drone.frequency.exponentialRampToValueAtTime(196, end);

      const over = audio.createOscillator();
      over.type = "triangle";
      over.frequency.setValueAtTime(156, t);
      over.frequency.exponentialRampToValueAtTime(392, end);

      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.09);
      g.gain.linearRampToValueAtTime(0.15, end - 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, end);

      drone.connect(filter);
      over.connect(filter);
      filter.connect(g);
      g.connect(master);
      drone.start(t);
      over.start(t);
      drone.stop(end + 0.04);
      over.stop(end + 0.04);

      const nodes = [
        { osc: drone, gain: g },
        { osc: over, gain: g },
      ];

      const step = 0.155;
      let i = 0;
      for (let p = t + 0.06; p < end - 0.07; p += step, i += 1) {
        const tick = audio.createOscillator();
        tick.type = "square";
        tick.frequency.setValueAtTime(300 + i * 26, p);
        const tg = audio.createGain();
        tg.gain.setValueAtTime(0.0001, p);
        tg.gain.exponentialRampToValueAtTime(0.042, p + 0.012);
        tg.gain.exponentialRampToValueAtTime(0.0001, p + 0.068);
        tick.connect(tg);
        tg.connect(master);
        tick.start(p);
        tick.stop(p + 0.08);
        nodes.push({ osc: tick, gain: tg });
      }

      chargeNodes = nodes;
    });
  }

  function levelUp() {
    playNotes([523.25, 659.25, 783.99, 1046.5], 0.085, 0.32, 0.17, "triangle");
    whenReady(() => {
      const t = audio.currentTime + 0.28;
      const o = audio.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(1046.5, t);
      o.frequency.exponentialRampToValueAtTime(1568, t + 0.22);
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.38);
    });
  }

  function sadDown(heavy) {
    const seq = heavy
      ? [311.13, 246.94, 196, 146.83]
      : [392, 329.63, 261.63, 196];
    playNotes(seq, 0.18, 0.48, heavy ? 0.15 : 0.13, "sine");
    whenReady(() => {
      const t = audio.currentTime + 0.52;
      const o = audio.createOscillator();
      o.type = heavy ? "sawtooth" : "triangle";
      o.frequency.setValueAtTime(heavy ? 92 : 147, t);
      o.frequency.exponentialRampToValueAtTime(heavy ? 48 : 98, t + 0.46);
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(heavy ? 0.14 : 0.08, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.6);
    });
  }

  const Sfx = {
    label() { return LEVELS[level].label; },
    isOff() { return LEVELS[level].id === "off"; },
    unlock() {
      boot();
      startBgm();
    },
    cycle() {
      level = (level + 1) % LEVELS.length;
      localStorage.setItem(KEY, LEVELS[level].id);
      if (master && audio) master.gain.setTargetAtTime(vol(), audio.currentTime, 0.02);
      applyBgmVol();
      return Sfx.label();
    },
    success() { levelUp(); },
    downgrade() { sadDown(false); },
    destroy() { sadDown(true); },
    tab() { tone("sine", 620, 0.08, 0.08); },
    deny() { tone("square", 160, 0.12, 0.1); },
    calc() { sweep(300, 520, 0.16, 0.1); },
    skip() { stopCharge(); },
    charge,
    stopCharge,
  };

  window.Sfx = Sfx;
})();
