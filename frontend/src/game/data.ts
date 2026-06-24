// ============================================================
// BRAINROT RPG — Static Data (rarity, traits, layers, NPCs)
// ============================================================

import type {
  Character,
  HellLayer,
  NpcDialogue,
  Rarity,
  TitleTrait,
} from "./engine";

// ---------- DROP RATES (must sum to 100) ----------
export const RarityRates: Record<Rarity, number> = {
  Common: 40,
  Uncommon: 30,
  Knight: 20.9,
  Noble: 1.0,
  Monarch: 0.7,
  // 0.7 + 1 + 20.9 + 30 + 40 = 92.6 -> remainder padded into Common
};
// Helper: actual roll table uses the above directly; any rounding error rolls to Common.

// ---------- EVOLUTION CHAIN ----------
// Brainrots evolve UP one rarity using N duplicates / materials.
export const EvolveCost: Record<Exclude<Rarity, "Monarch">, number> = {
  Common: 4,
  Uncommon: 3,
  Knight: 2,
  Noble: 2,
};
export const EvolveOrder: Rarity[] = [
  "Common",
  "Uncommon",
  "Knight",
  "Noble",
  "Monarch",
];

// ---------- BASE STAT CURVE BY RARITY ----------
const baseFor = (rarity: Rarity) => {
  switch (rarity) {
    case "Common":
      return { hp: 400, atk: 80, def: 50, heal: 40 };
    case "Uncommon":
      return { hp: 650, atk: 130, def: 80, heal: 70 };
    case "Knight":
      return { hp: 950, atk: 200, def: 130, heal: 110 };
    case "Noble":
      return { hp: 1400, atk: 310, def: 200, heal: 180 };
    case "Monarch":
      return { hp: 2100, atk: 480, def: 300, heal: 280 };
  }
};

const mk = (
  id: string,
  name: string,
  role: "Attack" | "Defense" | "Support",
  rarity: Rarity,
  skillName: string,
): Character => {
  const b = baseFor(rarity);
  return {
    id,
    name,
    role,
    rarity,
    maxHP: b.hp,
    currentHP: b.hp,
    attackPower: role === "Attack" ? b.atk * 1.2 : b.atk * 0.8,
    defensePower: role === "Defense" ? b.def * 1.4 : b.def * 0.8,
    healPower: role === "Support" ? b.heal * 1.5 : b.heal * 0.5,
    skillName,
    level: 1,
    grade: "C",
    title: null,
  };
};

// ---------- BRAINROT POOLS BY RARITY ----------
// Used by Support/Defense/Attack banner — banner just filters the role.
const ALL_BRAINROTS: Character[] = [
  // ----- COMMONS -----
  mk("c-1", "Tiny Tralala", "Attack", "Common", "Pebble Toss"),
  mk("c-2", "Mini Patapim", "Defense", "Common", "Twig Shield"),
  mk("c-3", "Burnt Espresso", "Support", "Common", "Lukewarm Sip"),
  mk("c-4", "Doughy Goblin", "Attack", "Common", "Sticky Slap"),
  mk("c-5", "Saucy Sprite", "Support", "Common", "Marinara Drizzle"),
  // ----- UNCOMMONS -----
  mk("u-1", "Trippi Troppi", "Support", "Uncommon", "Aquatic Cleanse"),
  mk("u-2", "Brr Brr Patapim", "Defense", "Uncommon", "Bark Shield"),
  mk("u-3", "Frothy Fiend", "Attack", "Uncommon", "Foam Smother"),
  mk("u-4", "Boneca Ambalabu", "Support", "Uncommon", "Doll's Lullaby"),
  // ----- KNIGHTS -----
  mk("k-1", "Tralalero Tralala", "Defense", "Knight", "Triple-Sole Stomp"),
  mk("k-2", "Lirilì Larilà", "Support", "Knight", "Desert Lullaby"),
  mk("k-3", "Bombardiero Crocodilo", "Attack", "Knight", "Aerial Bombing Run"),
  mk("k-4", "Glorbo Fruttodrillo", "Attack", "Knight", "Fruit Punch"),
  // ----- NOBLES -----
  mk("n-1", "Ballerina Cappuccina", "Support", "Noble", "Pirouette of Espresso"),
  mk("n-2", "Base Form Tung Tung Sahur", "Defense", "Noble", "Wooden Bat Bulwark"),
  mk("n-3", "Cappuccino Assassino", "Attack", "Noble", "Twin Blade Frappé"),
  // ----- MONARCHS (Heavenly Virtues) -----
  mk("m-1", "Angel Sahur", "Attack", "Monarch", "Divine Drumstrike"), // primary
  mk("m-2", "Seraph Cappuccina", "Support", "Monarch", "Hymn of Crema"),
  mk("m-3", "Archon Tung Tung", "Defense", "Monarch", "Heavenly Bulwark"),
];

// Returns a fresh copy so inventory adds don't share refs.
export const getRarityPool = (rarity: Rarity, role?: Character["role"]) =>
  ALL_BRAINROTS.filter(
    (c) => c.rarity === rarity && (!role || c.role === role),
  ).map((c) => ({ ...c }));

// Look up a base brainrot by id for evolution targeting.
export const findBaseById = (id: string) =>
  ALL_BRAINROTS.find((c) => c.id === id);

// ---------- TRAITS ----------
// Numeric Grade Modifier — flat % between -20% and +20%.
// 16 grades, evenly spaced from -20 to +20 -> step ≈ 2.6667%
export const GradeOrder: string[] = [
  "F-",
  "F",
  "D-",
  "D",
  "D+",
  "C-",
  "C",
  "C+",
  "B-",
  "B",
  "B+",
  "A-",
  "A",
  "A+",
  "S",
  "Z",
];

export const gradeMultiplier = (grade: string): number => {
  const idx = GradeOrder.indexOf(grade);
  if (idx < 0) return 1.0;
  // map 0..15 -> -20..+20
  const pct = -20 + (40 * idx) / (GradeOrder.length - 1);
  return 1 + pct / 100;
};

// Title Traits — unique passive mechanics.
export const Titles: TitleTrait[] = [
  {
    name: "Little King",
    description: "A child in a king's body.",
    ability:
      "Takes incoming damage and redistributes it equally to all active roles/stats/enemies.",
    code: "redistribute_damage",
  },
  {
    name: "Cor Leonis",
    description: "Take others' pain and bear it yourself.",
    ability: "Redirects and absorbs team status damage.",
    code: "absorb_status",
  },
  {
    name: "The Noble-man",
    description: "Born of gilded blood.",
    ability: "Increases post-combat Spaghetti Coin rewards by +25%.",
    code: "coin_boost",
  },
  {
    name: "The Dazzling Prince",
    description: "Fortune favors the radiant.",
    ability: "Multiplies luck in character and trait gacha spins (x1.5).",
    code: "luck_boost",
  },
];

// Drop weights for the Trait pull (titles vs blank).
export const TitleDropRates = {
  none: 70, // no title applied
  "Little King": 8,
  "Cor Leonis": 8,
  "The Noble-man": 8,
  "The Dazzling Prince": 6,
};

// ---------- LAYERS OF HELL ----------
const enemy = (
  id: string,
  name: string,
  hp: number,
  atk: number,
  def: number,
  skill: string,
): Character => ({
  id,
  name,
  role: "Attack",
  rarity: "Common",
  maxHP: hp,
  currentHP: hp,
  attackPower: atk,
  defensePower: def,
  healPower: 0,
  skillName: skill,
  level: 1,
  grade: "C",
  title: null,
});

export const LayersOfHell: HellLayer[] = [
  { layer: 1, title: "Limbo of the Loud", enemies: [enemy("e1", "Tiny Tralala", 300, 60, 30, "Squeak")] },
  { layer: 2, title: "Echoing Pasta Plains", enemies: [enemy("e2", "Spaghetti Sprite", 500, 90, 55, "Noodle Whip")] },
  { layer: 3, title: "Caffeinated Chasm", enemies: [enemy("e3", "Espresso Imp", 720, 130, 80, "Bean Barrage")] },
  { layer: 4, title: "Dunes of Distortion", enemies: [enemy("e4", "Sand Sahur", 950, 170, 110, "Drum Quake")] },
  { layer: 5, title: "The Crocodile Crater", enemies: [enemy("e5", "Croc Recruit", 1250, 215, 145, "Snap")] },
  { layer: 6, title: "Shark Sneaker Sea", enemies: [enemy("e6", "Tralalero Twin", 1600, 260, 180, "Triple Kick")] },
  { layer: 7, title: "Ballet of Burning Beans", enemies: [enemy("e7", "Dark Ballerina", 2000, 305, 220, "Cursed Pirouette")] },
  { layer: 8, title: "Assassin's Cafe", enemies: [enemy("e8", "Shadow Sahur", 2500, 360, 260, "Silent Beat")] },
  {
    layer: 9,
    title: "Throne of the Brainrot King",
    isFinal: true,
    enemies: [
      enemy("boss", "Evil Tung Tung Sahur", 10000, 420, 280, "Apocalypse Bat"),
    ],
    bossPhases: [
      { hpThreshold: 0.66, name: "Rage", atkBonus: 50, message: "EVIL TUNG TUNG'S EYES GLOW RED." },
      { hpThreshold: 0.33, name: "Wrath", atkBonus: 120, message: "THE BAT CRACKS THE FLOOR OF HELL." },
    ],
  },
];

// ---------- NPC DIALOGUES ----------
export const NpcDialogues: Record<string, NpcDialogue> = {
  npc1: {
    npc: "Spaghetti Merchant",
    portrait: "merchant",
    lines: [
      "Oh! A halo'd traveler. Welcome to my humble noodle stand.",
      "Pulls cost 10 Spaghetti Coins. Bargain prices, friend.",
      "Rumor says only Monarchs can stand against Evil Tung Tung Sahur…",
      "Heard about Traits? Grades change your stats by ±20%. Z is the dream.",
    ],
  },
  npc2: {
    npc: "Layer Guardian",
    portrait: "guardian",
    lines: [
      "* You feel a guardian's presence.",
      "Nine layers descend below us. Evil Tung Tung waits at the throne.",
      "Bring an Attack Brainrot. Bring a Support. The rest is rhythm.",
      "Try the FIGHT command. Or ACT, if you wish to spare them.",
    ],
  },
};

export const PullCost = 10;
export const TraitPullCost = 25;
