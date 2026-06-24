// ============================================================
// BRAINROT RPG — Static Data
// ============================================================

import type { Character, HellLayer, NpcDialogue } from "./engine";

// ---------- GACHA POOLS ----------
export const SupportBanner: Character[] = [
  {
    id: "sup-001",
    name: "Ballerina Cappuccina",
    role: "Support",
    maxHP: 850,
    currentHP: 850,
    attackPower: 120,
    defensePower: 90,
    skillName: "Pirouette of Espresso",
  },
  {
    id: "sup-002",
    name: "Lirilì Larilà",
    role: "Support",
    maxHP: 780,
    currentHP: 780,
    attackPower: 100,
    defensePower: 80,
    skillName: "Desert Lullaby",
  },
  {
    id: "sup-003",
    name: "Trippi Troppi",
    role: "Support",
    maxHP: 820,
    currentHP: 820,
    attackPower: 110,
    defensePower: 85,
    skillName: "Aquatic Cleanse",
  },
];

export const DefenseBanner: Character[] = [
  {
    id: "def-001",
    name: "Base Form Tung Tung Sahur",
    role: "Defense",
    maxHP: 1400,
    currentHP: 1400,
    attackPower: 130,
    defensePower: 220,
    skillName: "Wooden Bat Bulwark",
  },
  {
    id: "def-002",
    name: "Brr Brr Patapim",
    role: "Defense",
    maxHP: 1300,
    currentHP: 1300,
    attackPower: 110,
    defensePower: 200,
    skillName: "Bark Shield",
  },
  {
    id: "def-003",
    name: "Tralalero Tralala",
    role: "Defense",
    maxHP: 1250,
    currentHP: 1250,
    attackPower: 140,
    defensePower: 180,
    skillName: "Triple-Sole Stomp",
  },
];

export const AttackBanner: Character[] = [
  {
    id: "atk-001",
    name: "Bombardiero Crocodilo",
    role: "Attack",
    maxHP: 950,
    currentHP: 950,
    attackPower: 260,
    defensePower: 90,
    skillName: "Aerial Bombing Run",
  },
  {
    id: "atk-002",
    name: "Cappuccino Assassino",
    role: "Attack",
    maxHP: 900,
    currentHP: 900,
    attackPower: 280,
    defensePower: 70,
    skillName: "Twin Blade Frappé",
  },
  {
    id: "atk-003",
    name: "Angel Sahur",
    role: "Attack",
    maxHP: 1000,
    currentHP: 1000,
    attackPower: 300,
    defensePower: 100,
    skillName: "Divine Drumstrike",
  },
];

// ---------- LAYERS OF HELL ----------
// Helper to spawn enemy at a given layer scaling
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
  maxHP: hp,
  currentHP: hp,
  attackPower: atk,
  defensePower: def,
  skillName: skill,
});

export const LayersOfHell: HellLayer[] = [
  {
    layer: 1,
    title: "Limbo of the Loud",
    enemies: [
      enemy("e1-1", "Tiny Tralala", 300, 60, 30, "Squeak"),
      enemy("e1-2", "Mini Patapim", 320, 65, 35, "Twig Toss"),
    ],
  },
  {
    layer: 2,
    title: "Echoing Pasta Plains",
    enemies: [
      enemy("e2-1", "Spaghetti Sprite", 450, 80, 50, "Noodle Whip"),
      enemy("e2-2", "Saucy Goblin", 470, 85, 55, "Marinara Splash"),
    ],
  },
  {
    layer: 3,
    title: "Caffeinated Chasm",
    enemies: [
      enemy("e3-1", "Espresso Imp", 600, 110, 70, "Bean Barrage"),
      enemy("e3-2", "Frothy Fiend", 620, 115, 75, "Foam Smother"),
    ],
  },
  {
    layer: 4,
    title: "Dunes of Distortion",
    enemies: [
      enemy("e4-1", "Sand Sahur", 780, 140, 95, "Drum Quake"),
      enemy("e4-2", "Mirage Lirilì", 760, 135, 90, "Hallucinate"),
    ],
  },
  {
    layer: 5,
    title: "The Crocodile Crater",
    enemies: [
      enemy("e5-1", "Croc Recruit", 950, 170, 120, "Snap"),
      enemy("e5-2", "Bombardier Cub", 980, 175, 125, "Mini Bomb"),
    ],
  },
  {
    layer: 6,
    title: "Shark Sneaker Sea",
    enemies: [
      enemy("e6-1", "Tralalero Twin A", 1150, 200, 145, "Triple Kick"),
      enemy("e6-2", "Tralalero Twin B", 1150, 200, 145, "Triple Kick"),
    ],
  },
  {
    layer: 7,
    title: "Ballet of Burning Beans",
    enemies: [
      enemy("e7-1", "Dark Ballerina", 1350, 235, 170, "Cursed Pirouette"),
      enemy("e7-2", "Roasted Reaper", 1380, 240, 175, "Bean Scythe"),
    ],
  },
  {
    layer: 8,
    title: "Assassin's Cafe",
    enemies: [
      enemy("e8-1", "Cappuccino Cultist", 1600, 280, 200, "Bitter Brew"),
      enemy("e8-2", "Shadow Sahur", 1650, 285, 205, "Silent Beat"),
    ],
  },
  {
    layer: 9,
    title: "Throne of the Brainrot King",
    enemies: [
      enemy(
        "boss-final",
        "Evil Tung Tung Sahur",
        10000,
        420,
        260,
        "Apocalypse Bat",
      ),
    ],
  },
];

// ---------- NPC DIALOGUE ----------
export const NpcDialogues: NpcDialogue[] = [
  {
    npc: "Spaghetti Merchant",
    lines: [
      "Psst… 10 Spaghetti Coins for a pull. Bargain!",
      "I once pulled an Angel Sahur. Then I sold him. Regret.",
    ],
  },
  {
    npc: "Ballerina Cappuccina",
    lines: [
      "Tip-tap, tip-tap… the rhythm of the foam guides us.",
      "Don't trust the Cappuccino Assassino. He skims the cream.",
    ],
  },
  {
    npc: "Layer Guardian",
    lines: [
      "You stand before the Throne. Turn back, mortal brainrot.",
      "Evil Tung Tung Sahur hears every drumbeat of your heart.",
    ],
  },
];

export const PullCost = 10;
