const { createContext, runInContext } = require("vm");
const fs = require("fs");
const path = require("path");

const sandbox = { console };
sandbox.window = sandbox;
const ctx = createContext(sandbox);
runInContext(fs.readFileSync(path.join(__dirname, "config.js"), "utf8"), ctx);
runInContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), ctx);
runInContext(fs.readFileSync(path.join(__dirname, "engine.js"), "utf8"), ctx);

const D = sandbox.window.DNFData;
const E = sandbox.window.DNFEngine;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

assert(D.BASE_SUCCESS[0] === 100 && D.BASE_SUCCESS[3] === 100, "0-3 is 100%");
assert(D.BASE_SUCCESS[4] === 80 && D.BASE_SUCCESS[10] === 40, "4 and 10 base rates");
assert(D.BASE_SUCCESS[12] === 20 && D.BASE_SUCCESS[19] === 20, "12+ is 20%");
assert(D.charmBonus(3) === 0 && D.charmBonus(4) === 5 && D.charmBonus(11) === 5, "charm +5% before 12");
assert(D.charmBonus(12) === 2, "charm +2% from 12");
assert(E.successRate(4, true) === 85, "4→5 with charm 85%");
assert(E.successRate(12, true) === 22, "12→13 with charm 22%");
assert(E.successRate(10, false) === 40, "10→11 no charm 40%");
assert(D.failRule(6).type === "downgrade" && D.failRule(6).drop === 1, "6 fail -1");
assert(D.failRule(7).drop === 3 && D.failRule(9).drop === 3, "7-9 fail -3");
assert(D.failRule(10).type === "destroy", "10+ destroy");
assert(D.CRYSTAL_WEAPON[0] === 35 && D.CRYSTAL_WEAPON[3] === 97, "weapon 1-4 crystals");
assert(D.CRYSTAL_GEAR[0] === 26 && D.CRYSTAL_GEAR[3] === 72, "gear 1-4 crystals");
assert(D.weaponDualAtk(4) === 109, "weapon +4 dual atk 109");
assert(D.gearStrInt(4) === 48, "gear +4 str/int 48");
assert(D.gearMagicResist(1) === 10 && D.gearMagicResist(4) === 44, "magic resist anchors");
assert(D.skillAtk(7) === 0 && D.skillAtk(20) === 20, "skill atk unlock / cap");

const always = E.roll(0, false, () => 0.999);
assert(always.result === "success" && always.to === 1, "0→1 always success");

const down = E.roll(5, false, () => 0.999);
assert(down.result === "downgrade" && down.to === 4, "5 fail → 4");

const down3 = E.roll(8, false, () => 0.999);
assert(down3.result === "downgrade" && down3.to === 5, "8 fail → 5");

const dead = E.roll(11, false, () => 0.999);
assert(dead.result === "destroy", "11 fail destroy");

let i = 0;
const seq = [0.99, 0.01];
const sim = E.simulateToTarget({
  start: 0,
  target: 4,
  useCharm: false,
  rng: () => seq[Math.min(i++, seq.length - 1)],
});
assert(sim.reached && sim.crystal === 35 + 53 + 73 + 97, "0→4 guaranteed crystal 258");

const mc = E.monteCarlo({ start: 0, target: 4, useCharm: false, runs: 200 });
assert(mc.reachRate === 1, "0→4 always reaches");
assert(Math.round(mc.crystal.mean) === 258, "0→4 mean crystals 258");
assert(mc.charm.mean === 0, "0→4 no charm");

const alwaysOk = () => 0.001;
const evSafe = E.expectedToTarget({ start: 0, target: 4, isWeapon: true, useCharm: false });
assert(Math.round(evSafe.crystal) === 258 && evSafe.charm === 0, "EV 0→4 crystal 258");

const advice = E.adviseFullSet({
  target: 10,
  crystalTera: 200,
  charmTera: 13000,
  weaponSlots: 1,
  gearSlots: 11,
});
assert(advice.best && Number.isFinite(advice.best.tera), "full-set advice has tera");
assert(advice.best.tera <= advice.noCharm.tera, "best is not worse than no charm");

const skipCharm = E.simulateToTarget({
  start: 0, target: 5, useCharm: true, charmFrom: 5, rng: alwaysOk,
});
assert(skipCharm.reached && skipCharm.charm === 0, "charmFrom 5 skips 4→5");

const fromFive = E.simulateToTarget({
  start: 0, target: 6, useCharm: true, charmFrom: 5, rng: alwaysOk,
});
assert(fromFive.reached && fromFive.charm === 1, "charmFrom 5 uses once at 5→6");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("engine tests passed");
