// ============================================================
// BRAINROT RPG — Core State Engine
// ============================================================

import {
  AttackBanner,
  DefenseBanner,
  PullCost,
  SupportBanner,
  LayersOfHell,
} from "./data";

// ---------- TYPES ----------
export type Role = "Attack" | "Defense" | "Support";

export interface Character {
  id: string;
  name: string;
  role: Role;
  maxHP: number;
  currentHP: number;
  attackPower: number;
  defensePower: number;
  skillName: string;
}

export interface HellLayer {
  layer: number;
  title: string;
  enemies: Character[];
}

export interface NpcDialogue {
  npc: string;
  lines: string[];
}

export type BannerType = "Support" | "Defense" | "Attack";

export interface BattleResult {
  winner: "Player" | "Enemy" | "Draw";
  rounds: number;
  log: string[];
}

export interface GachaResult {
  success: boolean;
  message: string;
  character?: Character;
}

// ---------- GAME STATE ----------
export interface GameState {
  spaghettiCoins: number;
  playerTeam: Character[]; // max 3 active
  inventory: Character[];
}

export const createGameState = (startingCoins = 50): GameState => ({
  spaghettiCoins: startingCoins,
  playerTeam: [],
  inventory: [],
});

const MAX_TEAM_SIZE = 3;

// ---------- HELPERS ----------
const clone = (c: Character): Character => ({ ...c, currentHP: c.maxHP });
const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getBannerPool = (bannerType: BannerType): Character[] => {
  switch (bannerType) {
    case "Support":
      return SupportBanner;
    case "Defense":
      return DefenseBanner;
    case "Attack":
      return AttackBanner;
  }
};

// ---------- GACHA ----------
export const pullGacha = (
  state: GameState,
  bannerType: BannerType,
): GachaResult => {
  if (state.spaghettiCoins < PullCost) {
    return {
      success: false,
      message: `Not enough Spaghetti Coins. Need ${PullCost}, have ${state.spaghettiCoins}.`,
    };
  }
  state.spaghettiCoins -= PullCost;
  const pool = getBannerPool(bannerType);
  const drawn = clone(rand(pool));
  // Give unique inventory id so duplicates stack
  drawn.id = `${drawn.id}#${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  state.inventory.push(drawn);
  return {
    success: true,
    character: drawn,
    message: `[${bannerType} Banner] Pulled ${drawn.name} (${drawn.role}) — HP ${drawn.maxHP}, ATK ${drawn.attackPower}, DEF ${drawn.defensePower}, Skill: "${drawn.skillName}".`,
  };
};

// ---------- TEAM MANAGEMENT ----------
export const addToTeam = (
  state: GameState,
  characterId: string,
): { ok: boolean; message: string } => {
  if (state.playerTeam.length >= MAX_TEAM_SIZE) {
    return { ok: false, message: "Team is full (max 3 active)." };
  }
  const idx = state.inventory.findIndex((c) => c.id === characterId);
  if (idx === -1) return { ok: false, message: "Character not in inventory." };
  state.playerTeam.push(state.inventory[idx]);
  return {
    ok: true,
    message: `${state.inventory[idx].name} added to PlayerTeam.`,
  };
};

// ---------- BATTLE ----------
// Picks the first alive unit in a squad.
const firstAlive = (squad: Character[]): Character | undefined =>
  squad.find((c) => c.currentHP > 0);

const damageOf = (attacker: Character, defender: Character): number => {
  // Damage = Attack - Defense, min 1 so combat always progresses.
  return Math.max(1, attacker.attackPower - defender.defensePower);
};

export const startBattle = (
  playerSquad: Character[],
  enemySquad: Character[],
): BattleResult => {
  // Work on fresh copies so source data is not mutated.
  const player = playerSquad.map(clone);
  const enemy = enemySquad.map(clone);
  const log: string[] = [];
  let round = 0;
  const MAX_ROUNDS = 50;

  log.push(
    `⚔️  BATTLE START — Player(${player.length}) vs Enemy(${enemy.length})`,
  );

  while (round < MAX_ROUNDS) {
    round += 1;
    const pHero = firstAlive(player);
    const eHero = firstAlive(enemy);
    if (!pHero || !eHero) break;

    // Player turn
    const dmgToEnemy = damageOf(pHero, eHero);
    eHero.currentHP = Math.max(0, eHero.currentHP - dmgToEnemy);
    log.push(
      `R${round} • ${pHero.name} uses "${pHero.skillName}" → ${eHero.name} takes ${dmgToEnemy} dmg (HP ${eHero.currentHP}/${eHero.maxHP})`,
    );
    if (eHero.currentHP <= 0) {
      log.push(`   ☠️  ${eHero.name} defeated.`);
      if (!firstAlive(enemy)) break;
      continue;
    }

    // Enemy turn (same active enemy)
    const dmgToPlayer = damageOf(eHero, pHero);
    pHero.currentHP = Math.max(0, pHero.currentHP - dmgToPlayer);
    log.push(
      `R${round} • ${eHero.name} retaliates with "${eHero.skillName}" → ${pHero.name} takes ${dmgToPlayer} dmg (HP ${pHero.currentHP}/${pHero.maxHP})`,
    );
    if (pHero.currentHP <= 0) {
      log.push(`   💀 ${pHero.name} has fallen.`);
      if (!firstAlive(player)) break;
    }
  }

  const playerAlive = !!firstAlive(player);
  const enemyAlive = !!firstAlive(enemy);
  let winner: BattleResult["winner"] = "Draw";
  if (playerAlive && !enemyAlive) winner = "Player";
  else if (!playerAlive && enemyAlive) winner = "Enemy";

  log.push(
    `🏁 BATTLE END — Winner: ${winner} after ${round} round${round === 1 ? "" : "s"}.`,
  );
  return { winner, rounds: round, log };
};

// ---------- LAYER PROGRESSION ----------
export const getLayer = (n: number): HellLayer | undefined =>
  LayersOfHell.find((l) => l.layer === n);

export const allLayers = (): HellLayer[] => LayersOfHell;
