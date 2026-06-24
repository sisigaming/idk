// ============================================================
// BRAINROT RPG — Static data v3
// + Elements & Counter Matrix
// + 60-character explicit roster (3 banners × 20)
// + 4 overworld hub maps with villagers
// + Quest definitions
// ============================================================

import type {
  Character,
  Element,
  HellLayer,
  HubMapDef,
  NpcDialogue,
  Quest,
  Rarity,
  TitleTrait,
} from "./engine";

// ---------- RARITY ROLL TABLE ----------
export const RarityRates: Record<Rarity, number> = {
  Common: 40,
  Uncommon: 30,
  Knight: 20.9,
  Noble: 1.0,
  Monarch: 0.7,
};

// ---------- EVOLUTION ----------
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

// ---------- ELEMENTS & COUNTER MATRIX ----------
export const Elements: Element[] = [
  "Nature",
  "Ground",
  "Fire",
  "Water",
  "Light",
  "Dark",
];

// counters[A] = B  means A counters B (deals 1.5x to B, takes 0.7x from B)
export const Counters: Partial<Record<Element, Element>> = {
  Nature: "Ground",
  Ground: "Fire",
  Fire: "Water",
  Water: "Nature",
  // Light counters Dark/Boss with 2.0x — handled specially in combat
};

// Layer → element of enemies (player gacha pool follows the same)
export const LayerElement: Record<number, Element> = {
  1: "Nature",
  2: "Ground",
  3: "Ground",
  4: "Fire",
  5: "Fire",
  6: "Water",
  7: "Water",
  8: "Dark",
  9: "Light",
};

export const ElementColor: Record<Element, string> = {
  Nature: "#22c55e",
  Ground: "#a16207",
  Fire: "#ef4444",
  Water: "#3b82f6",
  Light: "#facc15",
  Dark: "#7c3aed",
};

// ---------- ROSTER DATA (60 entries) ----------
// stat is 1..100 — must follow rarity bands strictly.
// Roles are FIXED per banner; element is intrinsic to the character.
type RosterEntry = readonly [
  name: string,
  rarity: Rarity,
  element: Element,
  stat: number,
];

const ATTACK_ROSTER: RosterEntry[] = [
  // Monarch 95-100 (all Light → final-boss tier)
  ["Angel Sahur", "Monarch", "Light", 100],
  ["Bombardiro Crocodilo", "Monarch", "Light", 98],
  ["Cappuccino Assassino", "Monarch", "Light", 96],
  ["Bombombini Gusini", "Monarch", "Light", 95],
  // Noble 76-94
  ["U Din Din Din", "Noble", "Ground", 90],
  ["Bobrito Bandito", "Noble", "Ground", 85],
  ["Tric Trac Barabum", "Noble", "Fire", 88],
  ["Glorbo Fruttodrillo", "Noble", "Water", 82],
  // Knight 51-75
  ["Gorillini Arancini", "Knight", "Nature", 70],
  ["Pastaro Veloce", "Knight", "Fire", 65],
  ["Squalo Martello", "Knight", "Water", 72],
  ["Lupo Grigio", "Knight", "Nature", 60],
  // Uncommon 31-50
  ["Polpette Volante", "Uncommon", "Fire", 48],
  ["Gatto Spada", "Uncommon", "Nature", 35],
  ["Canarino Feroce", "Uncommon", "Nature", 40],
  ["Granchio Pugno", "Uncommon", "Water", 45],
  // Common 1-30
  ["Rapa Rossa", "Common", "Nature", 25],
  ["Limonello", "Common", "Water", 18],
  ["Funghetto Truccato", "Common", "Nature", 12],
  ["Carotina Spezzata", "Common", "Ground", 8],
];

const DEFENSE_ROSTER: RosterEntry[] = [
  // Monarch 95-100
  ["Tung Tung Tung Sahur", "Monarch", "Light", 100],
  ["Brr Brr Patapim", "Monarch", "Light", 97],
  ["Boneca Ambalabu", "Monarch", "Light", 96],
  ["La Vaca Saturno", "Monarch", "Light", 99],
  // Noble 76-94
  ["Burbaloni Luliloli", "Noble", "Water", 84],
  ["Rhino Toasterino", "Noble", "Fire", 90],
  ["Il Cacto Hipopotamo", "Noble", "Nature", 80],
  ["Frigo Camelo", "Noble", "Ground", 86],
  // Knight 51-75
  ["Tartaruga Corazzata", "Knight", "Water", 70],
  ["Cinghiale Scudo", "Knight", "Ground", 68],
  ["Granchio Roccia", "Knight", "Ground", 60],
  ["Orso Muro", "Knight", "Nature", 75],
  // Uncommon 31-50
  ["Tazzina Solida", "Uncommon", "Fire", 35],
  ["Biscotto Duro", "Uncommon", "Ground", 42],
  ["Mela Protetta", "Uncommon", "Nature", 45],
  ["Patata Rocciosa", "Uncommon", "Ground", 50],
  // Common 1-30
  ["Mattoncino", "Common", "Ground", 22],
  ["Sasso Semplice", "Common", "Ground", 5],
  ["Foglia Spessa", "Common", "Nature", 18],
  ["Legnetto Storto", "Common", "Nature", 11],
];

const SUPPORT_ROSTER: RosterEntry[] = [
  // Monarch 95-100
  ["Ballerina Cappuccina", "Monarch", "Light", 100],
  ["Lirilì Larilà", "Monarch", "Light", 95],
  ["Trippi Troppi (King of Sea)", "Monarch", "Light", 98],
  ["Espressona Signora", "Monarch", "Light", 96],
  // Noble 76-94
  ["Orangutini Ananasini", "Noble", "Nature", 85],
  ["Elefantini Strawberryni", "Noble", "Nature", 80],
  ["Blueberrinni Octopussini", "Noble", "Water", 90],
  ["Ta Ta Ta Sahur", "Noble", "Ground", 78],
  // Knight 51-75
  ["Giraffa Celeste", "Knight", "Nature", 68],
  ["Frulli Frulla", "Knight", "Water", 73],
  ["Medusa Curativa", "Knight", "Water", 60],
  ["Ape Mielosa", "Knight", "Nature", 65],
  // Uncommon 31-50
  ["Kiwi Dolce", "Uncommon", "Nature", 40],
  ["Limonata Fresca", "Uncommon", "Water", 50],
  ["Arancia Succosa", "Uncommon", "Fire", 32],
  ["Ciliegina Rosa", "Uncommon", "Nature", 45],
  // Common 1-30
  ["Goccia D'Acqua", "Common", "Water", 5],
  ["Semino Verde", "Common", "Nature", 15],
  ["Fiorellino", "Common", "Nature", 22],
  ["Fungo Curativo", "Common", "Nature", 28],
];

// ---------- BUILD CHARACTER OBJECTS FROM STATS ----------
const buildChar = (
  prefix: string,
  idx: number,
  entry: RosterEntry,
  role: "Attack" | "Defense" | "Support",
): Character => {
  const [name, rarity, element, stat] = entry;
  // Derive hp/atk/def/heal from the 1-100 stat with role-weight.
  const hp = Math.round(stat * 28 + 100);
  const atk =
    role === "Attack"
      ? Math.round(stat * 5 + 20)
      : Math.round(stat * 2.5 + 10);
  const def =
    role === "Defense"
      ? Math.round(stat * 4 + 20)
      : Math.round(stat * 1.8 + 10);
  const heal =
    role === "Support"
      ? Math.round(stat * 3.5 + 15)
      : Math.round(stat * 1 + 5);
  return {
    id: `${prefix}-${idx}`,
    name,
    role,
    rarity,
    element,
    stat,
    maxHP: hp,
    currentHP: hp,
    attackPower: atk,
    defensePower: def,
    healPower: heal,
    skillName: defaultSkill(name, role, element),
    level: 1,
    grade: "C",
    title: null,
  };
};

const defaultSkill = (name: string, role: string, element: Element) => {
  const verbs: Record<Element, string> = {
    Nature: "Vine Lash",
    Ground: "Stone Smash",
    Fire: "Cinder Strike",
    Water: "Tide Crash",
    Light: "Divine Beam",
    Dark: "Shadow Bite",
  };
  if (role === "Support") return `${element} Lullaby`;
  if (role === "Defense") return `${element} Bulwark`;
  return verbs[element];
};

export const ALL_ATTACK = ATTACK_ROSTER.map((e, i) => buildChar("atk", i, e, "Attack"));
export const ALL_DEFENSE = DEFENSE_ROSTER.map((e, i) => buildChar("def", i, e, "Defense"));
export const ALL_SUPPORT = SUPPORT_ROSTER.map((e, i) => buildChar("sup", i, e, "Support"));

// Lookup by base id for evolution copying.
export const findBaseById = (id: string): Character | undefined => {
  const base = id.split("#")[0];
  return [...ALL_ATTACK, ...ALL_DEFENSE, ...ALL_SUPPORT].find((c) => c.id === base);
};

// Get the active pool given (banner role + current layer).
// L9 forces Light, L8 forces Dark, otherwise filtered by LayerElement.
export const getActivePool = (
  banner: "Attack" | "Defense" | "Support",
  layer: number,
): Character[] => {
  const elementTheme = LayerElement[layer] ?? "Nature";
  const all =
    banner === "Attack"
      ? ALL_ATTACK
      : banner === "Defense"
        ? ALL_DEFENSE
        : ALL_SUPPORT;
  // If layer is final (Light) — only Monarchs (Light) drop.
  if (elementTheme === "Light") return all.filter((c) => c.element === "Light");
  // L8 (Dark) — no real Dark roster, so we taint the pool: take Knight+ and re-tag as Dark.
  if (elementTheme === "Dark") {
    return all
      .filter((c) => c.rarity === "Knight" || c.rarity === "Noble")
      .map((c) => ({ ...c, element: "Dark" as Element, name: `Corrupted ${c.name}` }));
  }
  return all.filter((c) => c.element === elementTheme);
};

// Pool of a specific rarity within current layer pool (for weighted gacha).
export const getRarityPoolByLayer = (
  rarity: Rarity,
  banner: "Attack" | "Defense" | "Support",
  layer: number,
) => getActivePool(banner, layer).filter((c) => c.rarity === rarity);

// ---------- TRAITS ----------
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
  const pct = -20 + (40 * idx) / (GradeOrder.length - 1);
  return 1 + pct / 100;
};

export const Titles: TitleTrait[] = [
  {
    name: "Little King",
    description: "A child in a king's body.",
    ability: "Takes incoming damage and redistributes it equally to all active roles/stats/enemies.",
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

export const TitleDropRates: Record<string, number> = {
  none: 70,
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
  element: Element,
): Character => ({
  id,
  name,
  role: "Attack",
  rarity: "Common",
  element,
  stat: 50,
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
  { layer: 1, title: "Limbo of the Loud", enemies: [enemy("e1", "Tiny Tralala", 300, 60, 30, "Squeak", "Nature")] },
  { layer: 2, title: "Caverns of Crumble", enemies: [enemy("e2", "Rocky Goblin", 520, 95, 60, "Boulder Toss", "Ground")] },
  { layer: 3, title: "Pebble Maze", enemies: [enemy("e3", "Stone Sprite", 720, 130, 80, "Earth Spike", "Ground")] },
  { layer: 4, title: "Magma Markets", enemies: [enemy("e4", "Cinder Imp", 960, 175, 110, "Flare", "Fire")] },
  { layer: 5, title: "Volcano Vespro", enemies: [enemy("e5", "Lava Sahur", 1250, 220, 150, "Inferno Drum", "Fire")] },
  { layer: 6, title: "Tide Trenches", enemies: [enemy("e6", "Brine Croc", 1600, 265, 185, "Tidal Bite", "Water")] },
  { layer: 7, title: "Limoncello Abyss", enemies: [enemy("e7", "Acid Tralalero", 2000, 310, 225, "Sour Wave", "Water")] },
  { layer: 8, title: "Corruption Cathedral", enemies: [enemy("e8", "Shadow Sahur", 2500, 365, 270, "Void Beat", "Dark")] },
  {
    layer: 9,
    title: "Throne of the Brainrot King",
    isFinal: true,
    enemies: [enemy("boss", "Evil Tung Tung Sahur", 10000, 420, 280, "Apocalypse Bat", "Dark")],
    bossPhases: [
      { hpThreshold: 0.66, name: "Rage",  atkBonus: 50,  message: "EVIL TUNG TUNG'S EYES GLOW RED." },
      { hpThreshold: 0.33, name: "Wrath", atkBonus: 120, message: "THE BAT CRACKS THE FLOOR OF HELL." },
    ],
  },
];

// ---------- NPC DIALOGUES (overworld realm NPCs) ----------
export const NpcDialogues: Record<string, NpcDialogue> = {
  npc1: {
    npc: "Spaghetti Merchant",
    portrait: "merchant",
    lines: [
      "Oh! A halo'd traveler. Welcome to my humble noodle stand.",
      "The gacha portals change with the layer you're descending toward.",
      "Pull NATURE on L1 to clobber the GROUND mobs of L2-3. Always thinking ahead.",
      "Visit the 4 hub villages — Spaghetti, Cannoli, Caffè, Limoncello — for side jobs.",
    ],
  },
  npc2: {
    npc: "Layer Guardian",
    portrait: "guardian",
    lines: [
      "* You feel a guardian's presence.",
      "Nine layers descend below us. Evil Tung Tung waits at the throne.",
      "Counter chain: Nature → Ground → Fire → Water → Nature. Light shatters Dark.",
      "Only LIGHT brainrots will harm the Final Boss meaningfully.",
    ],
  },
};

// ---------- HUB MAPS (10-13) ----------

// Tiny villager defs — each is a single tile sprite in the hub map.
export interface VillagerDef {
  id: string;
  name: string;
  col: number;
  row: number;
  color: string; // body color
  questId?: string;
  lines: string[];
}

export const HUB_MAPS: HubMapDef[] = [
  {
    id: 10,
    name: "Villaggio di Spaghetti",
    element: "Nature",
    bgColor: "#1f4f2a",
    accent: "#22c55e",
    cols: 10,
    rows: 12,
    exit: { col: 5, row: 11 },
    villagers: [
      { id: "v10-1", name: "Mamma Nonna",       col: 2, row: 2,  color: "#fbbf24", questId: "q1", lines: ["Bambino! My pots are missing brainrots.", "Defeat the noisy thing in Layer 1 for me, sì?"] },
      { id: "v10-2", name: "Pasta Boy",          col: 7, row: 2,  color: "#f59e0b", questId: "q2", lines: ["The cave mobs took my noodle press!", "Smash the Rocky Goblin in Layer 2 — I'll reward you."] },
      { id: "v10-3", name: "Olio Verde",         col: 2, row: 7,  color: "#84cc16", questId: "q3", lines: ["My olive grove is haunted by stone sprites.", "Clear Layer 3 and the trees will sing again."] },
      { id: "v10-4", name: "Pomodoro Rosso",     col: 7, row: 7,  color: "#dc2626", questId: "q4", lines: ["Tomatoes are wilting. The grass-rats stomp them.", "Stomp Layer 1 once more, please."] },
      { id: "v10-5", name: "Nonno Salvatore",    col: 5, row: 5,  color: "#a16207",                lines: ["The wind in Spaghetti smells of basil today.", "May your halo never tarnish, traveler."] },
    ],
  },
  {
    id: 11,
    name: "Terra di Cannoli",
    element: "Ground",
    bgColor: "#3a2a14",
    accent: "#a16207",
    cols: 10,
    rows: 12,
    exit: { col: 5, row: 11 },
    villagers: [
      { id: "v11-1", name: "Cannolo Crunchy",    col: 2, row: 2,  color: "#fde68a", questId: "q5", lines: ["The Cinder Imps of Layer 4 burn my fillings!", "Cool them down for me — Ground beats Fire."] },
      { id: "v11-2", name: "Ricotta Doce",       col: 7, row: 2,  color: "#fef3c7", questId: "q6", lines: ["Layer 5's Lava Sahur shakes my dough.", "Clear it and I'll bake you sweets."] },
      { id: "v11-3", name: "Vecchio Cantiere",   col: 2, row: 7,  color: "#78350f",                lines: ["Earth remembers every boot that crossed it.", "Tread softly, halo'd one."] },
      { id: "v11-4", name: "Mafioso Sicilia",    col: 7, row: 7,  color: "#1f2937", questId: "q7", lines: ["You want respect? Show me grit.", "Take care of the Rocky Goblin on Layer 2."] },
    ],
  },
  {
    id: 12,
    name: "Vulcano del Caffè",
    element: "Fire",
    bgColor: "#3a1414",
    accent: "#ef4444",
    cols: 10,
    rows: 12,
    exit: { col: 5, row: 11 },
    villagers: [
      { id: "v12-1", name: "Barista Espresso",   col: 2, row: 2,  color: "#7c2d12", questId: "q8",  lines: ["The Brine Crocs of Layer 6 douse my fires!", "Bring me their fangs — Fire beats Water."] },
      { id: "v12-2", name: "Cremoso Latte",      col: 7, row: 2,  color: "#fff7ed", questId: "q9",  lines: ["Layer 7's acid waves curdle my milk.", "Calm those waters for me, will you?"] },
      { id: "v12-3", name: "Caldera Magma",      col: 2, row: 7,  color: "#b91c1c",                 lines: ["Lava is honest. It only ever goes downward.", "Like the layers below us."] },
      { id: "v12-4", name: "Zucchero Bruciato",  col: 7, row: 7,  color: "#f97316", questId: "q10", lines: ["A favor for a sweet tooth?", "Defeat Lava Sahur on Layer 5 — caramel for life."] },
    ],
  },
  {
    id: 13,
    name: "Oceano di Limoncello",
    element: "Water",
    bgColor: "#0c2a3a",
    accent: "#3b82f6",
    cols: 10,
    rows: 12,
    exit: { col: 5, row: 11 },
    villagers: [
      { id: "v13-1", name: "Marinaio Salato",    col: 2, row: 2,  color: "#1e40af", questId: "q11", lines: ["The Shadow Sahur poisoned my nets at Layer 8.", "Cut him down. The tides will return."] },
      { id: "v13-2", name: "Sirenetta Acida",    col: 7, row: 2,  color: "#22d3ee", questId: "q12", lines: ["Evil Tung Tung killed my song.", "Light him up on Layer 9 — I'll fill your pouch with citrus gold."] },
      { id: "v13-3", name: "Capitano Limone",    col: 2, row: 7,  color: "#facc15",                 lines: ["Salt and sugar. The two truths of this ocean."] },
      { id: "v13-4", name: "Pirata Ghiacciato",  col: 7, row: 7,  color: "#0ea5e9", questId: "q13", lines: ["Layer 7's acid tralalero stole my rum.", "Sink it. Treasure for treasure."] },
      { id: "v13-5", name: "Pescatore Onda",     col: 5, row: 5,  color: "#60a5fa",                 lines: ["The deepest fish wear the brightest scales.", "May your halo guide the abyss."] },
    ],
  },
];

export const findHub = (id: number) => HUB_MAPS.find((h) => h.id === id);
export const findVillager = (vid: string) => {
  for (const h of HUB_MAPS) {
    const v = h.villagers.find((x) => x.id === vid);
    if (v) return v;
  }
  return undefined;
};

// ---------- QUESTS ----------
export const QUESTS: Quest[] = [
  { id: "q1",  title: "A Nonna's Plea",      description: "Defeat the threat in Layer 1.", requiredLayer: 1, targetNPC: "v10-1", targetObjective: "Defeat Layer 1 enemy", reward: 30,  isAccepted: false, isCompleted: false },
  { id: "q2",  title: "Press the Goblin",     description: "Defeat the Rocky Goblin in Layer 2.", requiredLayer: 2, targetNPC: "v10-2", targetObjective: "Defeat Layer 2 enemy", reward: 50,  isAccepted: false, isCompleted: false },
  { id: "q3",  title: "Olives & Sprites",     description: "Clear Layer 3 of Stone Sprites.", requiredLayer: 3, targetNPC: "v10-3", targetObjective: "Defeat Layer 3 enemy", reward: 75,  isAccepted: false, isCompleted: false },
  { id: "q4",  title: "Tomato Trample",       description: "Re-clear Layer 1.", requiredLayer: 1, targetNPC: "v10-4", targetObjective: "Defeat Layer 1 enemy", reward: 40,  isAccepted: false, isCompleted: false },
  { id: "q5",  title: "Cool the Cinders",     description: "Defeat the Cinder Imp on Layer 4.", requiredLayer: 4, targetNPC: "v11-1", targetObjective: "Defeat Layer 4 enemy", reward: 100, isAccepted: false, isCompleted: false },
  { id: "q6",  title: "Sweet Vespro",         description: "Defeat Lava Sahur on Layer 5.", requiredLayer: 5, targetNPC: "v11-2", targetObjective: "Defeat Layer 5 enemy", reward: 120, isAccepted: false, isCompleted: false },
  { id: "q7",  title: "Respect Earned",       description: "Defeat the Rocky Goblin again.", requiredLayer: 2, targetNPC: "v11-4", targetObjective: "Defeat Layer 2 enemy", reward: 80,  isAccepted: false, isCompleted: false },
  { id: "q8",  title: "Brine for the Barista", description: "Defeat the Brine Croc on Layer 6.", requiredLayer: 6, targetNPC: "v12-1", targetObjective: "Defeat Layer 6 enemy", reward: 150, isAccepted: false, isCompleted: false },
  { id: "q9",  title: "Calm the Acid",        description: "Defeat Acid Tralalero on Layer 7.", requiredLayer: 7, targetNPC: "v12-2", targetObjective: "Defeat Layer 7 enemy", reward: 175, isAccepted: false, isCompleted: false },
  { id: "q10", title: "Caramel For Life",     description: "Defeat Lava Sahur on Layer 5.", requiredLayer: 5, targetNPC: "v12-4", targetObjective: "Defeat Layer 5 enemy", reward: 130, isAccepted: false, isCompleted: false },
  { id: "q11", title: "Salt & Shadow",        description: "Defeat Shadow Sahur on Layer 8.", requiredLayer: 8, targetNPC: "v13-1", targetObjective: "Defeat Layer 8 enemy", reward: 200, isAccepted: false, isCompleted: false },
  { id: "q12", title: "Sirenetta's Song",     description: "Defeat the Final Boss on Layer 9.", requiredLayer: 9, targetNPC: "v13-2", targetObjective: "Defeat Layer 9 boss", reward: 500, isAccepted: false, isCompleted: false },
  { id: "q13", title: "Pirate's Citrus",      description: "Defeat Acid Tralalero on Layer 7.", requiredLayer: 7, targetNPC: "v13-4", targetObjective: "Defeat Layer 7 enemy", reward: 175, isAccepted: false, isCompleted: false },
];

export const PullCost = 10;
export const TraitPullCost = 25;
