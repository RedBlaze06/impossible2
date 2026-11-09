const $ = id => document.getElementById(id);
const SAVE_KEY = "infiniteAscensionSave_v1";

const freshState = () => ({
  level: 1, xp: 0, hp: 100, maxHp: 100, attack: 12,
  gold: 0, kills: 0, bosses: 0, best: 1, energy: 100,
  maxEnergy: 100, potions: 3, attackRank: 0, hpRank: 0,
  energyRank: 0, enemyHp: 35, enemyMaxHp: 35, enemyName: "",
  enemyBoss: false
});

let state = loadState();
let busy = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    return saved ? { ...freshState(), ...saved } : freshState();
  } catch { return freshState(); }
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    $("saveState").textContent = "● SAUVEGARDE ACTIVE";
  } catch { $("saveState").textContent = "● SAUVEGARDE INDISPONIBLE"; }
}
function fmt(n) { return Math.floor(n).toLocaleString("fr-FR"); }
function xpNeeded() { return Math.floor(100 * Math.pow(state.level, 1.24)); }
function enemyMax(level) {
  // Croissance volontairement très forte, mais les calculs restent gérés en nombres JavaScript.
  return Math.floor(25 + 10 * level + 2.2 * Math.pow(level, 1.48));
}
function enemyDamage(level) { return Math.max(3, Math.floor(3 + Math.pow(level, 0.72) * 1.35)); }
function enemyReward(level) { return Math.floor(12 + level * 4 + Math.pow(level, 1.18)); }
function rankName(level) {
  if (level >= 10000) return "TRANSCENDANT";
  if (level >= 5000) return "ÉTERNEL";
  if (level >= 1000) return "DIVIN";
  if (level >= 500) return "LÉGENDAIRE";
  if (level >= 100) return "MYTHIQUE";
  if (level >= 50) return "ÉLITE";
  if (level >= 20) return "VÉTÉRAN";
  if (level >= 10) return "EXPLORATEUR";
  return "NOVICE";
}
function spawnEnemy() {
  state.enemyBoss = state.level % 10 === 0;
  state.enemyMaxHp = enemyMax(state.level) * (state.enemyBoss ? 3 : 1);
  state.enemyHp = state.enemyMaxHp;
  const common = ["Sentinelle oubliée", "Gardien des brumes", "Éclaireur du néant", "Ombre errante", "Chevalier fracturé"];
  const bosses = ["Roi du crépuscule", "Colosse abyssal", "Architecte du néant", "Dévoreur d'étoiles"];
  const names = state.enemyBoss ? bosses : common;
  state.enemyName = names[Math.floor(Math.random() * names.length)];
  render();
}
function log(message) { $("battleLog").textContent = message; }
function render() {
  $("level").textContent = fmt(state.level);
  $("rank").textContent = rankName(state.level);
  $("xpText").textContent = `${fmt(state.xp)} / ${fmt(xpNeeded())} XP`;
  $("xpBar").style.width = `${Math.min(100, state.xp / xpNeeded() * 100)}%`;
  $("hpText").textContent = `${fmt(Math.max(0,state.hp))} / ${fmt(state.maxHp)}`;
  $("hpBar").style.width = `${Math.max(0,Math.min(100,state.hp/state.maxHp*100))}%`;
  $("attackText").textContent = fmt(state.attack);
  $("goldText").textContent = fmt(state.gold);
  $("killsText").textContent = fmt(state.kills);
  $("enemyName").textContent = state.enemyName;
  $("enemyLevel").textContent = `NIV. ${fmt(state.level)}`;
  $("enemyType").textContent = state.enemyBoss ? "BOSS • MENACE MAJEURE" : "ENNEMI COMMUN";
  $("enemyHpText").textContent = `${fmt(Math.max(0,state.enemyHp))} / ${fmt(state.enemyMaxHp)}`;
  $("enemyHpBar").style.width = `${Math.max(0,state.enemyHp/state.enemyMaxHp*100)}%`;
  $("enemyArt").classList.toggle("boss", state.enemyBoss);
  $("enemyArt").innerHTML = `<span>${state.enemyBoss ? "♛" : "✧"}</span>`;
  $("goldText").textContent = fmt(state.gold);
  $("bestText").textContent = fmt(state.best);
  $("bossText").textContent = fmt(state.bosses);
  $("energyText").textContent = `${fmt(state.energy)} / ${fmt(state.maxEnergy)}`;
  $("potionStat").textContent = fmt(state.potions);
  $("potionCount").textContent = `${fmt(state.potions)} disponibles`;
  $("attackUpgradeLevel").textContent = `Rang ${state.attackRank}`;
  $("hpUpgradeLevel").textContent = `Rang ${state.hpRank}`;
  $("energyUpgradeLevel").textContent = `Rang ${state.energyRank}`;
  $("specialCost").textContent = `Coût : 30 énergie`;
  $("buyAttack").textContent = `${fmt(50 * (state.attackRank+1))} ◈`;
  $("buyHp").textContent = `${fmt(50 * (state.hpRank+1))} ◈`;
  $("buyEnergy").textContent = `${fmt(75 * (state.energyRank+1))} ◈`;
  $("buyAttack").disabled = state.gold < 50 * (state.attackRank+1);
  $("buyHp").disabled = state.gold < 50 * (state.hpRank+1);
  $("buyEnergy").disabled = state.gold < 75 * (state.energyRank+1);
  $("specialBtn").disabled = state.energy < 30 || busy;
  $("potionBtn").disabled = state.potions < 1 || state.hp >= state.maxHp || busy;
  $("attackBtn").disabled = busy;
}
function enemyHit() {
  const damage = enemyDamage(state.level) * (state.enemyBoss ? 1.5 : 1);
  const actual = Math.floor(damage * (0.85 + Math.random() * 0.3));
  state.hp = Math.max(0, state.hp - actual);
  if (state.hp <= 0) {
    log(`Tu as été vaincu au niveau ${fmt(state.level)}. Tu peux recommencer cette ascension.`);
    $("attackBtn").textContent = "RECOMMENCER";
    $("attackBtn").disabled = false;
    busy = true;
    $("attackBtn").onclick = revive;
  } else {
    log(`L'ennemi riposte et t'inflige ${fmt(actual)} dégâts.`);
  }
}
function damageEnemy(amount, label) {
  state.enemyHp = Math.max(0, state.enemyHp - amount);
  $("enemyArt").classList.remove("hit");
  void $("enemyArt").offsetWidth;
  $("enemyArt").classList.add("hit");
  if (state.enemyHp <= 0) {
    const reward = enemyReward(state.level) * (state.enemyBoss ? 3 : 1);
    const gainedXp = Math.floor(state.level * 18 * (state.enemyBoss ? 2.5 : 1));
    state.gold += reward;
    state.xp += gainedXp;
    state.kills++;
    if (state.enemyBoss) state.bosses++;
    log(`${label} ! Ennemi vaincu : +${fmt(reward)} cristaux et +${fmt(gainedXp)} XP.`);
    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      state.level++;
      state.best = Math.max(state.best, state.level);
      state.maxHp += 5;
      state.hp = Math.min(state.maxHp, state.hp + 20);
      state.attack += Math.max(1, Math.floor(state.level * 0.08));
      state.energy = Math.min(state.maxEnergy, state.energy + 10);
    }
    if (state.level % 10 === 0) log("Un boss approche... Prépare-toi !");
    spawnEnemy();
    return true;
  }
  log(`${label} : ${fmt(amount)} dégâts infligés.`);
  return false;
}
function attack() {
  if (busy || state.hp <= 0) return;
  const amount = Math.floor(state.attack * (0.85 + Math.random() * 0.3));
  const killed = damageEnemy(amount, "Attaque");
  if (!killed) enemyHit();
  save(); render();
}
function special() {
  if (busy || state.energy < 30 || state.hp <= 0) return;
  state.energy -= 30;
  const amount = Math.floor(state.attack * 2.8 + state.level * 1.5);
  const killed = damageEnemy(amount, "Frappe spéciale");
  if (!killed) enemyHit();
  save(); render();
}
function usePotion() {
  if (busy || state.potions < 1 || state.hp >= state.maxHp || state.hp <= 0) return;
  const amount = Math.floor(state.maxHp * 0.35);
  state.hp = Math.min(state.maxHp, state.hp + amount);
  state.potions--;
  log(`Potion utilisée : +${fmt(amount)} PV.`);
  enemyHit(); save(); render();
}
function revive() {
  state.hp = state.maxHp;
  state.energy = state.maxEnergy;
  state.potions = Math.max(1, state.potions);
  state.level = 1;
  state.xp = 0;
  state.attack = 12 + state.attackRank * 5;
  state.maxHp = 100 + state.hpRank * 25;
  state.maxEnergy = 100 + state.energyRank * 10;
  state.energy = state.maxEnergy;
  state.gold = Math.floor(state.gold * 0.75);
  busy = false;
  $("attackBtn").textContent = "⚔ ATTAQUER";
  $("attackBtn").onclick = attack;
  spawnEnemy();
  log("Nouvelle ascension ! Tes améliorations permanentes sont conservées.");
  save(); render();
}
function buy(kind) {
  const costs = {attack:50*(state.attackRank+1), hp:50*(state.hpRank+1), energy:75*(state.energyRank+1)};
  const cost = costs[kind];
  if (state.gold < cost) return;
  state.gold -= cost;
  if (kind === "attack") { state.attackRank++; state.attack += 5; }
  if (kind === "hp") { state.hpRank++; state.maxHp += 25; state.hp += 25; }
  if (kind === "energy") { state.energyRank++; state.maxEnergy += 10; state.energy += 10; }
  log("Amélioration achetée. Ta puissance augmente !");
  save(); render();
}

$("attackBtn").addEventListener("click", attack);
$("specialBtn").addEventListener("click", special);
$("potionBtn").addEventListener("click", usePotion);
$("buyAttack").addEventListener("click", () => buy("attack"));
$("buyHp").addEventListener("click", () => buy("hp"));
$("buyEnergy").addEventListener("click", () => buy("energy"));
$("resetBtn").addEventListener("click", () => {
  if (!confirm("Effacer toute ta progression et recommencer au niveau 1 ?")) return;
  state = freshState(); busy = false;
  $("attackBtn").textContent = "⚔ ATTAQUER";
  $("attackBtn").onclick = attack;
  spawnEnemy(); log("Nouvelle partie. L'ascension commence maintenant."); save(); render();
});
document.addEventListener("keydown", event => {
  if (event.code === "Space" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    if (state.hp <= 0) revive(); else attack();
  }
});
spawnEnemy();
render();
save();
