// ============================================================
// BRAINROT RPG — Core State Engine v2
// Rarity gacha, traits, evolution, Undertale-style combat
// ============================================================

import {
  EvolveCost,
  EvolveOrder,
  GradeOrder,
  LayersOfHell,
  PullCost,
  RarityRates,
  TitleDropRates,
  Titles,
  TraitPullCost,
  findBaseById,
  getRarityPool,
  gradeMultiplier,
} from "./data";

// ---------- TYPES ----------
export type Role = "Attack" | "Defense" | "Support";
export type Rarity = "Common" | "Uncommon" | "Knight" | "Noble" | "Monarch";

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
  maxHP: number;
  currentHP: number;
  attackPower: number;
  defensePower: number;
  healPower: number;
  skillName: string;
  level: number;
  grade: string;        // "F-" .. "Z"
  title: TitleTrait | null;
}

export interface BossPhase {
  hpThreshold: number; // ratio of currentHP/maxHP that triggers
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

// ---------- GAME STATE ----------
export type Scene =
  | "overworld"
  | "gacha"
  | "trait_gacha"
  | "dialog"
  | "inventory"
  | "combat"
  | "victory"
  | "defeat";

export interface CombatState {
  layer: number;
  enemy: Character;
  enemyMaxHP: number;
  primary: Character;       // Angel Sahur (player avatar)
  attackSlot: Character | null;
  supportSlot: Character | null;
  log: string[];
  awaiting: "menu" | "fight" | "act" | "item" | "mercy";
  currentPhase: number; // index into bossPhases that has triggered
  spared: boolean;
  ended: "win" | "lose" | null;
}

export interface GameState {
  spaghettiCoins: number;
  inventory: Character[];
  // Squad slots for Angel Sahur (primary) combat.
  attackSlot: Character | null;
  supportSlot: Character | null;
  highestLayerCleared: number;
  // Scene control
  scene: Scene;
  gachaBanner: Role | null;
  dialogNpc: string | null;
  combat: CombatState | null;
  // Toast / overlay message
  flash: string | null;
}

export const createGameState = (): GameState => ({
  spaghettiCoins: 100,
  inventory: [seedAngel()], // Angel Sahur is always the primary; in inventory for completeness
  attackSlot: null,
  supportSlot: null,
  highestLayerCleared: 0,
  scene: "overworld",
  gachaBanner: null,
  dialogNpc: null,
  combat: null,
  flash: null,
});

const seedAngel = (): Character => {
  const angel = findBaseById("m-1")!;
  return {
    ...angel,
    id: `m-1#primary`,
    currentHP: angel.maxHP,
    level: 5,
    grade: "B",
    title: null,
  };
};

export const getPrimary = (state: GameState): Character => {
  return (
    state.inventory.find((c) => c.id.startsWith("m-1#")) ?? seedAngel()
  );
};

// ---------- HELPERS ----------
const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const clone = (c: Character): Character => ({ ...c, currentHP: c.maxHP });

// Effective stat after grade + level scaling.
const effectiveAtk = (c: Character) =>
  Math.round(c.attackPower * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.1));
const effectiveDef = (c: Character) =>
  Math.round(c.defensePower * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.1));
const effectiveHeal = (c: Character) =>
  Math.round(c.healPower * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.1));
const effectiveMaxHP = (c: Character) =>
  Math.round(c.maxHP * gradeMultiplier(c.grade) * (1 + (c.level - 1) * 0.08));

// ---------- RARITY ROLL ----------
const rollRarity = (luckMultiplier = 1): Rarity => {
  // Multiply rare odds by luckMultiplier and re-normalize.
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

// ---------- GACHA: characters ----------
export interface GachaResult {
  success: boolean;
  message: string;
  character?: Character;
  rarity?: Rarity;
}

export const pullGacha = (
  state: GameState,
  banner: Role,
): GachaResult => {
  if (state.spaghettiCoins < PullCost) {
    return { success: false, message: `Not enough coins. Need ${PullCost}.` };
  }
  state.spaghettiCoins -= PullCost;

  // Apply Dazzling Prince luck boost if primary holds it
  const primary = getPrimary(state);
  const luck = primary.title?.code === "luck_boost" ? 1.5 : 1;
  let rarity = rollRarity(luck);
  let pool = getRarityPool(rarity, banner);
  // If banner+rarity is empty (e.g., no Noble Defense), downgrade rarity.
  while (pool.length === 0) {
    const i = EvolveOrder.indexOf(rarity);
    if (i <= 0) {
      pool = getRarityPool("Common", banner);
      rarity = "Common";
      break;
    }
    rarity = EvolveOrder[i - 1];
    pool = getRarityPool(rarity, banner);
  }
  const drawn = clone(rand(pool));
  drawn.id = `${drawn.id}#${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  state.inventory.push(drawn);
  return {
    success: true,
    rarity,
    character: drawn,
    message: `[${rarity}] ${drawn.name} — ${drawn.role}. HP ${drawn.maxHP} · ATK ${Math.round(drawn.attackPower)} · "${drawn.skillName}"`,
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
  // Heavily weight middle grades; rare grades S/Z if luck applies
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

export const pullTrait = (
  state: GameState,
  targetId: string,
): TraitResult => {
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
      ? `Trait roll → Grade ${grade} · Title: "${title.name}" (${title.ability})`
      : `Trait roll → Grade ${grade} · No title.`,
  };
};

// ---------- EVOLUTION ----------
// Consume N duplicates of same brainrot (by base id prefix) to evolve to next rarity.
export interface EvolveResult {
  success: boolean;
  message: string;
}

const baseIdOf = (id: string) => id.split("#")[0];

export const evolveCharacter = (
  state: GameState,
  targetId: string,
): EvolveResult => {
  const target = state.inventory.find((c) => c.id === targetId);
  if (!target) return { success: false, message: "Target not found." };
  if (target.rarity === "Monarch") {
    return { success: false, message: "Monarchs cannot evolve further." };
  }
  const cost = EvolveCost[target.rarity as Exclude<Rarity, "Monarch">];
  const sameBase = state.inventory.filter(
    (c) => c.id !== targetId && baseIdOf(c.id) === baseIdOf(target.id),
  );
  if (sameBase.length < cost) {
    return {
      success: false,
      message: `Need ${cost} duplicates of ${target.name}. You have ${sameBase.length}.`,
    };
  }
  // Consume duplicates
  const consumeIds = new Set(sameBase.slice(0, cost).map((c) => c.id));
  state.inventory = state.inventory.filter((c) => !consumeIds.has(c.id));

  // Promote to next rarity preserving role
  const nextRarity = EvolveOrder[EvolveOrder.indexOf(target.rarity) + 1];
  const candidates = getRarityPool(nextRarity, target.role);
  if (candidates.length === 0) {
    return { success: false, message: `No ${nextRarity} ${target.role} available.` };
  }
  const evolvedBase = candidates[0];
  target.id = `${evolvedBase.id}#${Date.now()}`;
  target.name = evolvedBase.name;
  target.rarity = nextRarity;
  target.maxHP = evolvedBase.maxHP;
  target.currentHP = evolvedBase.maxHP;
  target.attackPower = evolvedBase.attackPower;
  target.defensePower = evolvedBase.defensePower;
  target.healPower = evolvedBase.healPower;
  target.skillName = evolvedBase.skillName;
  target.level = Math.min(99, target.level + 2);
  return {
    success: true,
    message: `EVOLVED → ${target.name} [${nextRarity}] (Lv ${target.level}).`,
  };
};

// ---------- SQUAD MAPPING ----------
export const setAttackSlot = (state: GameState, id: string | null) => {
  if (id === null) {
    state.attackSlot = null;
    return;
  }
  const c = state.inventory.find((x) => x.id === id);
  if (c && c.role === "Attack") state.attackSlot = c;
};
export const setSupportSlot = (state: GameState, id: string | null) => {
  if (id === null) {
    state.supportSlot = null;
    return;
  }
  const c = state.inventory.find((x) => x.id === id);
  if (c && c.role === "Support") state.supportSlot = c;
};

// ---------- UNDERTALE COMBAT ----------
export const startCombat = (state: GameState, layerNum: number): boolean => {
  const layer = LayersOfHell.find((l) => l.layer === layerNum);
  if (!layer) return false;
  const enemyBase = layer.enemies[0];
  const enemy: Character = { ...enemyBase, currentHP: enemyBase.maxHP };
  const primary = { ...getPrimary(state) };
  primary.currentHP = effectiveMaxHP(primary);

  state.combat = {
    layer: layerNum,
    enemy,
    enemyMaxHP: enemy.maxHP,
    primary,
    attackSlot: state.attackSlot ? { ...state.attackSlot } : null,
    supportSlot: state.supportSlot ? { ...state.supportSlot } : null,
    log: [
      `* You descend into Layer ${layer.layer}: ${layer.title}.`,
      `* ${enemy.name} blocks your path!`,
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
  if (cs.log.length > 60) cs.log.splice(0, cs.log.length - 60);
};

const enemyAttack = (state: GameState) => {
  const cs = state.combat!;
  let dmg = Math.max(1, cs.enemy.attackPower - effectiveDef(cs.primary));
  // Apply title abilities defensively
  if (cs.primary.title?.code === "redistribute_damage") {
    // Spread damage across attack + support slots as well
    const targets = [cs.primary, cs.attackSlot, cs.supportSlot].filter(Boolean) as Character[];
    const each = Math.ceil(dmg / targets.length);
    targets.forEach((t) => (t.currentHP = Math.max(0, t.currentHP - each)));
    pushLog(cs, `* ${cs.enemy.name} strikes! Damage ${dmg} split ${each} each across the squad.`);
    dmg = 0;
  }
  if (dmg > 0) {
    cs.primary.currentHP = Math.max(0, cs.primary.currentHP - dmg);
    pushLog(cs, `* ${cs.enemy.name} uses "${cs.enemy.skillName}" → Angel Sahur takes ${dmg} dmg.`);
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
  if (!cs.attackSlot) {
    pushLog(cs, `* No Attack Brainrot equipped. Use the inventory house.`);
    return;
  }
  const dmg = Math.max(
    1,
    effectiveAtk(cs.attackSlot) - cs.enemy.defensePower,
  );
  cs.enemy.currentHP = Math.max(0, cs.enemy.currentHP - dmg);
  pushLog(
    cs,
    `* You call on ${cs.attackSlot.name}! "${cs.attackSlot.skillName}" → ${dmg} dmg. ${cs.enemy.name} HP ${cs.enemy.currentHP}/${cs.enemyMaxHP}.`,
  );
  if (cs.enemy.currentHP <= 0) {
    endCombat(state, true);
    return;
  }
  checkBossPhase(state);
  enemyAttack(state);
};

export const combatItem = (state: GameState) => {
  const cs = state.combat;
  if (!cs || cs.ended) return;
  if (!cs.supportSlot) {
    pushLog(cs, `* No Support Brainrot equipped.`);
    return;
  }
  const heal = effectiveHeal(cs.supportSlot);
  const maxhp = effectiveMaxHP(cs.primary);
  cs.primary.currentHP = Math.min(maxhp, cs.primary.currentHP + heal);
  pushLog(
    cs,
    `* ${cs.supportSlot.name} sings "${cs.supportSlot.skillName}". +${heal} HP. (${cs.primary.currentHP}/${maxhp})`,
  );
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
  cs.spared = true; // marks mercy as available
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
    if (primary.title?.code === "coin_boost") {
      reward = Math.round(reward * 1.25);
    }
    state.spaghettiCoins += reward;
    state.highestLayerCleared = Math.max(state.highestLayerCleared, cs.layer);
    pushLog(cs, `* VICTORY. +${reward} Spaghetti Coins.`);
    state.scene = "victory";
  } else {
    state.scene = "defeat";
  }
};

export const closeCombat = (state: GameState) => {
  state.combat = null;
  state.scene = "overworld";
};

// ---------- DEBUG: pretty stats ----------
export const inspect = (c: Character): string =>
  `${c.name} [${c.rarity}|${c.role}|Lv${c.level}|G:${c.grade}] HP ${effectiveMaxHP(c)} · ATK ${effectiveAtk(c)} · DEF ${effectiveDef(c)} · HEAL ${effectiveHeal(c)}${c.title ? ` · "${c.title.name}"` : ""}`;

export {
  effectiveAtk,
  effectiveDef,
  effectiveHeal,
  effectiveMaxHP,
};
