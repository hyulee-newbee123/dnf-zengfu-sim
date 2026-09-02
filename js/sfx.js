(() => {
  const KEY = "dnf-zengfu-sfx-level";
  const LEVELS = [
    { id: "off", label: "音效 关", vol: 0 },
    { id: "low", label: "音效 低", vol: 0.4 },
    { id: "on", label: "音效 开", vol: 0.88 },
  ];

  let audio = null;
  let master = null;
  const saved = localStorage.getItem(KEY);
  let level = LEVELS.findIndex((x) => x.id === saved);
  if (level < 0) level = 2;

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

  const Sfx = {
    label() { return LEVELS[level].label; },
    isOff() { return LEVELS[level].id === "off"; },
    cycle() {
      level = (level + 1) % LEVELS.length;
      localStorage.setItem(KEY, LEVELS[level].id);
      if (master && audio) master.gain.setTargetAtTime(vol(), audio.currentTime, 0.02);
      return Sfx.label();
    },
    success() { sweep(420, 880, 0.22, 0.18); },
    downgrade() { sweep(320, 140, 0.28, 0.16); },
    destroy() { sweep(180, 55, 0.45, 0.22); tone("sawtooth", 70, 0.35, 0.12); },
    tab() { tone("sine", 620, 0.08, 0.08); },
    deny() { tone("square", 160, 0.12, 0.1); },
    calc() { sweep(300, 520, 0.16, 0.1); },
    skip() { tone("sine", 480, 0.06, 0.07); },
    charge() { sweep(180, 420, 0.35, 0.1); },
  };

  window.Sfx = Sfx;
})();
