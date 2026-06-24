// ============================================================
// BRAINROT RPG — Core State Engine v3
// + Elements, counter matrix, dynamic gacha pools
// + Side quests, hub maps, currentLayer state
// ============================================================

import {
  ALL_ATTACK,
  EvolveCost,
  EvolveOrder,
  GradeOrder,
  LayerElement,
  LayersOfHell,
  PullCost,
  QUESTS,
  RarityRates,
  TitleDropRates,
  Titles,
  TraitPullCost,
  findBaseById,
  getActivePool,
  getRarityPoolByLayer,
  gradeMultiplier,
} from "./data";

// ---------- TYPES ----------
export type Role = "Attack" | "Defense" | "Support";
export type Rarity = "Common" | "Uncommon" | "Knight" | "Noble" | "Monarch";
export type Element = "Nature" | "Ground" | "Fire" | "Water" | "Light" | "Dark";

export interface TitleTrait {
  name: string;
  description: string;
  ability: string;
  code: "redistribute_damage" | "absorb_status" | "coin_boost" | "luck_boost";
}

export interface Character {
  id: string;
  name: string;
  role: Role;
  rarity: Rarity;
  element: Element;
  stat: number; // 1..100 base
  maxHP: number;
  currentHP: number;
  attackPower: number;
  defensePower: number;
  healPower: number;
  skillName: string;
  level: number;
  grade: string;
  title: TitleTrait | null;
}

export interface BossPhase {
  hpThreshold: number;
  name: string;
  atkBonus: number;
  message: string;
}

export interface HellLayer {
  layer: number;
  title: string;
  enemies: Character[];
  isFinal?: boolean;
  bossPhases?: BossPhase[];
}

export interface NpcDialogue {
  npc: string;
  portrait: string;
  lines: string[];
}

export interface HubMapDef {
  id: number;
  name: string;
  element: Element;
  bgColor: string;
  accent: string;
  cols: number;
  rows: number;
  exit: { col: number; row: number };
  villagers: {
    id: string;
    name: string;
    col: number;
    row: number;
    color: string;
    questId?: string;
    lines: string[];
  }[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  requiredLayer: number;
  targetNPC: string;
  targetObjective: string;
  reward: number;
  isAccepted: boolean;
  isCompleted: boolean;
  isClaimed?: boolean;
}

// ---------- GAME STATE ----------
export type Scene =
  | "overworld"
  | "gacha"
  | "trait_gacha"
  | "dialog"
  | "villager_dialog"
  | "inventory"
  | "combat"
  | "travel"
  | "victory"
  | "defeat";

export interface CombatState {
  layer: number;
  enemy: Character;
  enemyMaxHP: number;
  primary: Character;
  attackSlot: Character | null;
  supportSlot: Character | null;
  log: string[];
  awaiting: "menu" | "fight" | "act" | "item" | "mercy";
  currentPhase: number;
  spared: boolean;
  ended: "win" | "lose" | null;
}

export interface GameState {
  spaghettiCoins: number;
  inventory: Character[];
  attackSlot: Character | null;
  supportSlot: Character | null;
  highestLayerCleared: number;
  currentLayer: number; // 1..9, target layer (drives gacha pool)
  // Map navigation
  currentMap: number; // 1 = realm, 10..13 = hubs
  // Scene control
  scene: Scene;
  gachaBanner: Role | null;
  dialogNpc: string | null;
  villagerId: string | null;
  combat: CombatState | null;
  flash: string | null;
  // Quests
  quests: Quest[];
}

export const createGameState = (): GameState => ({
  spaghettiCoins: 100,
  inventory: [seedAngel()],
  attackSlot: null,
  supportSlot: null,
  highestLayerCleared: 0,
  currentLayer: 1,
  currentMap: 1,
  scene: "overworld",
  gachaBanner: null,
  dialogNpc: null,
  villagerId: null,
  combat: null,
  flash: null,
  quests: QUESTS.map((q) => ({ ...q })),
});

const seedAngel = (): Character => {
  // Angel Sahur is the first ATK Monarch entry.
  const angel = ALL_ATTACK.find((c) => c.name === "Angel Sahur")!;
  return {
    ...angel,
    id: `${angel.id}#primary`,
    currentHP: angel.maxHP,
    level: 5,
    grade: "B",
    title: null,
  };
};

export const getPrimary = (state: GameState): Character =>
  state.inventory.find((c) => c.id.endsWith("#primary")) ?? seedAngel();

// ---------- EFFECTIVE STATS ----------
const clone = (c: Character): Character => ({ ...c, currentHP: c.maxHP });

const effectiveAtk = (c: Character) =>
  Math.round(c.attackPower * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.1));
const effectiveDef = (c: Character) =>
  Math.round(c.defensePower * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.1));
const effectiveHeal = (c: Character) =>
  Math.round(c.healPower * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.1));
const effectiveMaxHP = (c: Character) =>
  Math.round(c.maxHP * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.08));

// ---------- ELEMENTAL COUNTER MATRIX ----------
// Returns: { attackerMult, defenderMult } applied to outgoing damage.
// Light vs Dark/Boss = 2.0x.
export const elementMultiplier = (
  attacker: Element,
  defender: Element,
  isBoss = false,
): { mult: number; tag: "advantage" | "resist" | "neutral" | "super" } => {
  if (attacker === "Light" && (defender === "Dark" || isBoss)) {
    return { mult: 2.0, tag: "super" };
  }
  const counters: Partial<Record<Element, Element>> = {
    Nature: "Ground",
    Ground: "Fire",
    Fire: "Water",
    Water: "Nature",
  };
  if (counters[attacker] === defender) return { mult: 1.5, tag: "advantage" };
  if (counters[defender] === attacker) return { mult: 0.7, tag: "resist" };
  return { mult: 1.0, tag: "neutral" };
};

// ---------- RARITY ROLL ----------
const rollRarity = (luckMultiplier = 1): Rarity => {
  const base = { ...RarityRates } as Record<Rarity, number>;
  base.Monarch *= luckMultiplier;
  base.Noble *= luckMultiplier;
  base.Knight *= luckMultiplier;
  const total = Object.values(base).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  const order: Rarity[] = ["Monarch", "Noble", "Knight", "Uncommon", "Common"];
  for (const r of order) {
    if (roll < base[r]) return r;
    roll -= base[r];
  }
  return "Common";
};

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ---------- GACHA: characters (now layer-aware) ----------
export interface GachaResult {
  success: boolean;
  message: string;
  character?: Character;
  rarity?: Rarity;
  element?: Element;
}

export const pullGacha = (state: GameState, banner: Role): GachaResult => {
  if (state.spaghettiCoins < PullCost) {
    return { success: false, message: `Not enough coins. Need ${PullCost}.` };
  }
  state.spaghettiCoins -= PullCost;

  const primary = getPrimary(state);
  const luck = primary.title?.code === "luck_boost" ? 1.5 : 1;

  // Special rules
  let rarity = rollRarity(luck);
  let pool = getRarityPoolByLayer(rarity, banner, state.currentLayer);

  // L9 forces Light → only Monarchs exist in pool
  if (LayerElement[state.currentLayer] === "Light") {
    rarity = "Monarch";
    pool = getRarityPoolByLayer("Monarch", banner, state.currentLayer);
  }

  // Fallback if pool empty at this rarity, downgrade
  while (pool.length === 0) {
    const i = EvolveOrder.indexOf(rarity);
    if (i <= 0) {
      pool = getActivePool(banner, state.currentLayer);
      rarity = "Common";
      break;
    }
    rarity = EvolveOrder[i - 1];
    pool = getRarityPoolByLayer(rarity, banner, state.currentLayer);
  }

  const drawn = clone(rand(pool));
  drawn.id = `${drawn.id}#${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  state.inventory.push(drawn);
  return {
    success: true,
    rarity,
    element: drawn.element,
    character: drawn,
    message: `[${rarity}|${drawn.element}] ${drawn.name} — ${drawn.role}. HP ${drawn.maxHP} · ATK ${effectiveAtk(drawn)} · "${drawn.skillName}"`,
  };
};

// ---------- GACHA: traits ----------
export interface TraitResult {
  success: boolean;
  message: string;
  grade?: string;
  title?: TitleTrait | null;
  targetId?: string;
}

const rollGrade = (luck = 1): string => {
  const weights: Record<string, number> = {
    "F-": 4, F: 6, "D-": 8, D: 10, "D+": 10, "C-": 12, C: 14, "C+": 12,
    "B-": 10, B: 8, "B+": 6, "A-": 4, A: 3, "A+": 2, S: 0.7 * luck, Z: 0.3 * luck,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const g of GradeOrder) {
    if (r < weights[g]) return g;
    r -= weights[g];
  }
  return "C";
};

const rollTitle = (luck = 1): TitleTrait | null => {
  const rates = { ...TitleDropRates } as Record<string, number>;
  rates["Little King"] *= luck;
  rates["Cor Leonis"] *= luck;
  rates["The Noble-man"] *= luck;
  rates["The Dazzling Prince"] *= luck;
  const total = Object.values(rates).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const key of Object.keys(rates)) {
    if (r < rates[key]) {
      if (key === "none") return null;
      return Titles.find((t) => t.name === key) ?? null;
    }
    r -= rates[key];
  }
  return null;
};

export const pullTrait = (state: GameState, targetId: string): TraitResult => {
  if (state.spaghettiCoins < TraitPullCost) {
    return { success: false, message: `Trait pull costs ${TraitPullCost} coins.` };
  }
  const target = state.inventory.find((c) => c.id === targetId);
  if (!target) return { success: false, message: "Target not in inventory." };
  state.spaghettiCoins -= TraitPullCost;

  const primary = getPrimary(state);
  const luck = primary.title?.code === "luck_boost" ? 1.5 : 1;
  const grade = rollGrade(luck);
  const title = rollTitle(luck);
  target.grade = grade;
  target.title = title;
  return {
    success: true,
    targetId,
    grade,
    title,
    message: title
      ? `Trait roll → Grade ${grade} · Title: "${title.name}"`
      : `Trait roll → Grade ${grade} · No title.`,
  };
};

// ---------- EVOLUTION ----------
const baseIdOf = (id: string) => id.split("#")[0];

export interface EvolveResult { success: boolean; message: string }

export const evolveCharacter = (state: GameState, targetId: string): EvolveResult => {
  const target = state.inventory.find((c) => c.id === targetId);
  if (!target) return { success: false, message: "Target not found." };
  if (target.rarity === "Monarch") return { success: false, message: "Monarchs cannot evolve further." };
  const cost = EvolveCost[target.rarity as Exclude<Rarity, "Monarch">];
  const sameBase = state.inventory.filter(
    (c) => c.id !== targetId && baseIdOf(c.id) === baseIdOf(target.id),
  );
  if (sameBase.length < cost) {
    return { success: false, message: `Need ${cost} duplicates. Have ${sameBase.length}.` };
  }
  const consumeIds = new Set(sameBase.slice(0, cost).map((c) => c.id));
  state.inventory = state.inventory.filter((c) => !consumeIds.has(c.id));

  // Promote: find a higher-rarity character of the same banner role
  const nextRarity = EvolveOrder[EvolveOrder.indexOf(target.rarity) + 1];
  // Search global pool for an entry of same role + next rarity
  const findBase = findBaseById(target.id);
  if (!findBase) return { success: false, message: "Base not found." };
  // Simple: keep same name, just bump rarity stats by +25% and tag
  target.rarity = nextRarity;
  target.stat = Math.min(100, Math.round(target.stat * 1.25));
  target.maxHP = Math.round(target.maxHP * 1.35);
  target.attackPower = Math.round(target.attackPower * 1.3);
  target.defensePower = Math.round(target.defensePower * 1.3);
  target.healPower = Math.round(target.healPower * 1.3);
  target.level = Math.min(99, target.level + 2);
  target.currentHP = target.maxHP;
  return { success: true, message: `EVOLVED → ${target.name} [${nextRarity}] (Lv ${target.level}).` };
};

// ---------- SLOTS ----------
export const setAttackSlot = (state: GameState, id: string | null) => {
  if (id === null) { state.attackSlot = null; return; }
  const c = state.inventory.find((x) => x.id === id);
  if (c && c.role === "Attack") state.attackSlot = c;
};
export const setSupportSlot = (state: GameState, id: string | null) => {
  if (id === null) { state.supportSlot = null; return; }
  const c = state.inventory.find((x) => x.id === id);
  if (c && c.role === "Support") state.supportSlot = c;
};

// ---------- LAYER / MAP NAV ----------
export const setCurrentLayer = (state: GameState, layer: number) => {
  state.currentLayer = Math.max(1, Math.min(9, layer));
};
export const setCurrentMap = (state: GameState, mapId: number) => {
  state.currentMap = mapId;
  state.scene = "overworld";
};

// ---------- COMBAT ----------
export const startCombat = (state: GameState, layerNum: number): boolean => {
  const layer = LayersOfHell.find((l) => l.layer === layerNum);
  if (!layer) return false;
  const enemyBase = layer.enemies[0];
  const enemy: Character = { ...enemyBase, currentHP: enemyBase.maxHP };
  const primary = { ...getPrimary(state) };
  primary.currentHP = effectiveMaxHP(primary);
  state.currentLayer = layerNum;
  state.combat = {
    layer: layerNum,
    enemy,
    enemyMaxHP: enemy.maxHP,
    primary,
    attackSlot: state.attackSlot ? { ...state.attackSlot } : null,
    supportSlot: state.supportSlot ? { ...state.supportSlot } : null,
    log: [
      `* You descend into Layer ${layer.layer}: ${layer.title}.`,
      `* The air carries ${enemy.element.toUpperCase()} essence.`,
      `* ${enemy.name} [${enemy.element}] blocks your path!`,
    ],
    awaiting: "menu",
    currentPhase: -1,
    spared: false,
    ended: null,
  };
  state.scene = "combat";
  return true;
};

const pushLog = (cs: CombatState, line: string) => {
  cs.log.push(line);
  if (cs.log.length > 80) cs.log.splice(0, cs.log.length - 80);
};

const enemyAttack = (state: GameState) => {
  const cs = state.combat!;
  // Enemy element vs primary element (Angel Sahur = Light, will resist Dark less)
  const m = elementMultiplier(cs.enemy.element, cs.primary.element);
  let raw = Math.max(1, cs.enemy.attackPower - effectiveDef(cs.primary));
  let dmg = Math.round(raw * m.mult);
  if (cs.primary.title?.code === "redistribute_damage") {
    const targets = [cs.primary, cs.attackSlot, cs.supportSlot].filter(Boolean) as Character[];
    const each = Math.ceil(dmg / targets.length);
    targets.forEach((t) => (t.currentHP = Math.max(0, t.currentHP - each)));
    pushLog(cs, `* ${cs.enemy.name} strikes! ${dmg} dmg split ${each} each (Little King).`);
    dmg = 0;
  }
  if (dmg > 0) {
    cs.primary.currentHP = Math.max(0, cs.primary.currentHP - dmg);
    const tag = m.tag === "advantage" ? " [enemy advantage]" : m.tag === "resist" ? " [you resist]" : m.tag === "super" ? " [SUPER]" : "";
    pushLog(cs, `* ${cs.enemy.name} "${cs.enemy.skillName}" → Angel Sahur takes ${dmg} dmg${tag}.`);
  }
  if (cs.primary.currentHP <= 0) {
    cs.ended = "lose";
    pushLog(cs, `* GAME OVER. Angel Sahur has fallen.`);
    state.scene = "defeat";
  }
};

const checkBossPhase = (state: GameState) => {
  const cs = state.combat!;
  const layer = LayersOfHell.find((l) => l.layer === cs.layer);
  if (!layer?.bossPhases) return;
  const ratio = cs.enemy.currentHP / cs.enemyMaxHP;
  layer.bossPhases.forEach((p, idx) => {
    if (idx > cs.currentPhase && ratio <= p.hpThreshold) {
      cs.currentPhase = idx;
      cs.enemy.attackPower += p.atkBonus;
      pushLog(cs, `⚠️  PHASE ${idx + 1} — ${p.name}: ${p.message}`);
    }
  });
};

export const combatFight = (state: GameState) => {
  const cs = state.combat;
  if (!cs || cs.ended) return;
  if (!cs.attackSlot) { pushLog(cs, `* No Attack Brainrot equipped.`); return; }
  const isBoss = LayersOfHell.find((l) => l.layer === cs.layer)?.isFinal === true;
  const m = elementMultiplier(cs.attackSlot.element, cs.enemy.element, isBoss);
  const raw = Math.max(1, effectiveAtk(cs.attackSlot) - cs.enemy.defensePower);
  const dmg = Math.round(raw * m.mult);
  cs.enemy.currentHP = Math.max(0, cs.enemy.currentHP - dmg);
  const tag = m.tag === "super" ? " [LIGHT SUPER ×2.0]" : m.tag === "advantage" ? " [×1.5 advantage]" : m.tag === "resist" ? " [×0.7 resisted]" : "";
  pushLog(cs, `* ${cs.attackSlot.name} [${cs.attackSlot.element}] uses "${cs.attackSlot.skillName}" → ${dmg} dmg${tag}. (${cs.enemy.currentHP}/${cs.enemyMaxHP})`);
  if (cs.enemy.currentHP <= 0) { endCombat(state, true); return; }
  checkBossPhase(state);
  enemyAttack(state);
};

export const combatItem = (state: GameState) => {
  const cs = state.combat;
  if (!cs || cs.ended) return;
  if (!cs.supportSlot) { pushLog(cs, `* No Support Brainrot equipped.`); return; }
  const heal = effectiveHeal(cs.supportSlot);
  const maxhp = effectiveMaxHP(cs.primary);
  cs.primary.currentHP = Math.min(maxhp, cs.primary.currentHP + heal);
  pushLog(cs, `* ${cs.supportSlot.name} [${cs.supportSlot.element}] sings "${cs.supportSlot.skillName}". +${heal} HP. (${cs.primary.currentHP}/${maxhp})`);
  checkBossPhase(state);
  enemyAttack(state);
};

export const combatAct = (state: GameState) => {
  const cs = state.combat;
  if (!cs || cs.ended) return;
  const flavor = [
    `* You COMPLIMENT ${cs.enemy.name}. They look conflicted.`,
    `* You DRUM along to their rhythm. They tap a foot.`,
    `* You stare in silence. The void stares back.`,
    `* You offer them a sip of espresso. They consider it.`,
  ];
  pushLog(cs, rand(flavor));
  cs.spared = true;
  enemyAttack(state);
};

export const combatMercy = (state: GameState) => {
  const cs = state.combat;
  if (!cs || cs.ended) return;
  if (cs.spared) {
    pushLog(cs, `* You spared ${cs.enemy.name}. They bow and step aside.`);
    endCombat(state, true);
    return;
  }
  pushLog(cs, `* ${cs.enemy.name} refuses your mercy.`);
  enemyAttack(state);
};

const endCombat = (state: GameState, won: boolean) => {
  const cs = state.combat!;
  cs.ended = won ? "win" : "lose";
  if (won) {
    let reward = 15 + cs.layer * 5;
    const primary = getPrimary(state);
    if (primary.title?.code === "coin_boost") reward = Math.round(reward * 1.25);
    state.spaghettiCoins += reward;
    state.highestLayerCleared = Math.max(state.highestLayerCleared, cs.layer);
    setCurrentLayer(state, Math.min(9, state.highestLayerCleared + 1));
    pushLog(cs, `* VICTORY. +${reward} Spaghetti Coins.`);
    // Quest completion check
    const newlyCompleted = tryCompleteQuests(state, cs.layer);
    newlyCompleted.forEach((q) => pushLog(cs, `* Quest progress: "${q.title}" — ready to claim.`));
    state.scene = "victory";
  } else {
    state.scene = "defeat";
  }
};

export const closeCombat = (state: GameState) => {
  state.combat = null;
  state.scene = "overworld";
};

// ---------- QUESTS ----------
export const acceptQuest = (state: GameState, questId: string) => {
  const q = state.quests.find((x) => x.id === questId);
  if (q && !q.isAccepted) q.isAccepted = true;
};

export const tryCompleteQuests = (state: GameState, layerCleared: number) => {
  const completed: Quest[] = [];
  state.quests.forEach((q) => {
    if (q.isAccepted && !q.isCompleted && q.requiredLayer === layerCleared) {
      q.isCompleted = true;
      completed.push(q);
    }
  });
  return completed;
};

export const claimQuest = (state: GameState, questId: string): { ok: boolean; message: string } => {
  const q = state.quests.find((x) => x.id === questId);
  if (!q) return { ok: false, message: "Quest not found." };
  if (!q.isCompleted) return { ok: false, message: "Objective not yet complete." };
  if (q.isClaimed) return { ok: false, message: "Reward already claimed." };
  q.isClaimed = true;
  state.spaghettiCoins += q.reward;
  return { ok: true, message: `+${q.reward} ◆ from "${q.title}".` };
};

export const getQuestByNpc = (state: GameState, npcId: string): Quest | undefined =>
  state.quests.find((q) => q.targetNPC === npcId);

// ---------- DEBUG INSPECT ----------
export const inspect = (c: Character): string =>
  `${c.name} [${c.rarity}|${c.element}|${c.role}|Lv${c.level}|G:${c.grade}|S${c.stat}] HP ${effectiveMaxHP(c)} · ATK ${effectiveAtk(c)} · DEF ${effectiveDef(c)} · HEAL ${effectiveHeal(c)}${c.title ? ` · "${c.title.name}"` : ""}`;

export { effectiveAtk, effectiveDef, effectiveHeal, effectiveMaxHP };
