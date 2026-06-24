// ============================================================
// BRAINROT RPG — Static data v4
// + Save-slot/storage compat (data layer is pure)
// + LORE for every character & enemy
// + Trap defs per overworld map
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

// ---------- RARITY / ELEMENT BASE ----------
export const RarityRates: Record<Rarity, number> = {
  Common: 40,
  Uncommon: 30,
  Knight: 20.9,
  Noble: 1.0,
  Monarch: 0.7,
};
export const EvolveCost: Record<Exclude<Rarity, "Monarch">, number> = {
  Common: 4,
  Uncommon: 3,
  Knight: 2,
  Noble: 2,
};
export const EvolveOrder: Rarity[] = ["Common", "Uncommon", "Knight", "Noble", "Monarch"];
export const Elements: Element[] = ["Nature", "Ground", "Fire", "Water", "Light", "Dark"];
export const Counters: Partial<Record<Element, Element>> = {
  Nature: "Ground", Ground: "Fire", Fire: "Water", Water: "Nature",
};
export const LayerElement: Record<number, Element> = {
  1: "Nature", 2: "Ground", 3: "Ground", 4: "Fire", 5: "Fire",
  6: "Water", 7: "Water", 8: "Dark", 9: "Light",
};
export const ElementColor: Record<Element, string> = {
  Nature: "#22c55e", Ground: "#a16207", Fire: "#ef4444", Water: "#3b82f6",
  Light: "#facc15", Dark: "#7c3aed",
};

// ---------- LORE LOOKUP ----------
// "design | behavior"
const LORE_RAW: Record<string, string> = {
  // ----- ATTACK roster -----
  "Angel Sahur": "Halo'd cherub clutching a wooden bat-drum | Strikes precisely between divine drumbeats",
  "Bombardiro Crocodilo": "Crocodile-bodied bomber plane with stubby wings | Dives, releases bombs, banks away laughing",
  "Cappuccino Assassino": "Espresso-cup torso wielding twin curved blades | Disappears in steam, reappears mid-strike",
  "Bombombini Gusini": "Goose with two strapped bombs and a wicked grin | Honks, then detonates joyfully on contact",
  "U Din Din Din": "Triple-headed gecko in a Sahur cloak | Chants rhythmic spells and slaps with tail-whip",
  "Bobrito Bandito": "Outlaw beaver with crossed bandoliers | Shoots from cover then loots fallen enemies",
  "Tric Trac Barabum": "Fire-drum monkey covered in tribal paint | Pounds out an inferno cadence",
  "Glorbo Fruttodrillo": "Fruit-encrusted gator with citrus tail | Lobs sticky juice grenades from afar",
  "Gorillini Arancini": "Rice-ball gorilla, golden crust, fierce stance | Charges in a straight line, never stops",
  "Pastaro Veloce": "Wiry chef who throws boiling noodles | Sprints around the battlefield, peppering hits",
  "Squalo Martello": "Hammerhead shark on stilts, bandolier of nails | Smashes downward with anvil head",
  "Lupo Grigio": "Grey wolf in trench-coat, leaf insignia | Lone hunter — picks isolated targets",
  "Polpette Volante": "Flying meatball with tiny fire-jet thrusters | Crashes into foes like a heat-seeking missile",
  "Gatto Spada": "Tabby cat with rapier and feathered hat | Lunges, parries, retreats with a smirk",
  "Canarino Feroce": "Buff canary with brass knuckles | Sings then KO-punches mid-tweet",
  "Granchio Pugno": "Boxing crab with bandaged claws | Jab-jab-cross then sideways scuttle",
  "Rapa Rossa": "Angry red turnip with thorn-leaves | Roots itself, hurls thorns, never retreats",
  "Limonello": "Spritz-soaked lemon with whiskers | Sprays acidic juice in arcs",
  "Funghetto Truccato": "Mushroom in stage makeup, dramatic pose | Releases spore-clouds before striking",
  "Carotina Spezzata": "Snapped carrot with bandaged middle | Limps in, swings tops like a flail",
  // ----- DEFENSE roster -----
  "Tung Tung Tung Sahur": "Massive wooden mascot beating a bat drum | Stands ground, returns blows with the bat",
  "Brr Brr Patapim": "Tree-trunk creature with bird's feet | Hardens bark and absorbs incoming damage",
  "Boneca Ambalabu": "Porcelain doll with cracked smile | Reflects attacks back via mirror-eyes",
  "La Vaca Saturno": "Holy cow ringed by Saturn-style halos | Anchors team, slows enemies with gravity moo",
  "Burbaloni Luliloli": "Bubble-blowing seal with elastic flippers | Cushions hits inside soap bubbles",
  "Rhino Toasterino": "Rhinoceros with a toaster on its horn | Heats up before each charge, brittle to water",
  "Il Cacto Hipopotamo": "Hippopotamus made entirely of cactus | Spines damage attackers automatically",
  "Frigo Camelo": "Camel pulling a portable fridge on its hump | Walls behind chilled metal — slows fire foes",
  "Tartaruga Corazzata": "Steel-plated turtle with rivet shell | Slow shuffle, immovable when hunkered down",
  "Cinghiale Scudo": "Boar bearing a tower shield in its tusks | Plants shield and never yields ground",
  "Granchio Roccia": "Rocky crab fused to a boulder | Sidesteps, blocks blows with its shell-mountain",
  "Orso Muro": "Bear-shaped living wall of bark and moss | Spreads arms wide, intercepts all hits",
  "Tazzina Solida": "Iron coffee-cup with chain handle | Tilts to deflect, swings handle like a flail",
  "Biscotto Duro": "Dunk-hard biscotti carved into a knight | Splits incoming damage with crumb-armor",
  "Mela Protetta": "Apple wrapped in caramel-armor | Glazed shell shrugs off blunt attacks",
  "Patata Rocciosa": "Potato studded with quartz | Sits stoutly and blocks lanes",
  "Mattoncino": "Tiny living brick with eyes | Stacks on top of allies for makeshift cover",
  "Sasso Semplice": "Plain river stone, smiling | Refuses to move from the spot it picked",
  "Foglia Spessa": "Thick leaf curled like a shield | Wraps allies in a green canopy",
  "Legnetto Storto": "Bent twig with twine grip | Used as a tiny crutch — never breaks",
  // ----- SUPPORT roster -----
  "Ballerina Cappuccina": "Espresso-cup tutu dancer en pointe | Spins healing crema across the squad",
  "Lirilì Larilà": "Floppy desert lyrica with chimes | Lulls allies into restorative trance",
  "Trippi Troppi (King of Sea)": "Aquatic mer-cat in crown and trident | Calls tide-blessings that restore HP",
  "Espressona Signora": "Regal espresso pot in a velvet gown | Pours rejuvenating shots between rounds",
  "Orangutini Ananasini": "Orangutan inside a pineapple costume | Throws sweet slices that heal on impact",
  "Elefantini Strawberryni": "Tiny elephant made of strawberries | Sprays nectar that restores morale",
  "Blueberrinni Octopussini": "Octopus crammed inside a blueberry | Eight arms, eight quick patches of healing",
  "Ta Ta Ta Sahur": "Lullaby-singing Sahur child with rattle | Repeats a soft beat that mends wounds",
  "Giraffa Celeste": "Sky-blue giraffe trailing stars | Bows neck to feed nectar from clouds",
  "Frulli Frulla": "Smoothie-blender with a face | Whirs out icy mists that revive",
  "Medusa Curativa": "Friendly jellyfish with glowing bell | Pulses warm light that heals on contact",
  "Ape Mielosa": "Plump bee carrying a honey jar | Dabs honey on wounds, never stings allies",
  "Kiwi Dolce": "Sliced kiwi with tiny seed-eyes | Hops to ally and slices itself for sustenance",
  "Limonata Fresca": "Sweating pitcher of lemonade | Pours a cold cup to revive parched fighters",
  "Arancia Succosa": "Plump orange with leaf-cape | Juices itself to refresh teammates",
  "Ciliegina Rosa": "Cherry with a pink ribbon | Donates a single critical heal in clutch moments",
  "Goccia D'Acqua": "Single sentient water droplet | Splashes lightly — modest but reliable healing",
  "Semino Verde": "Tiny green seed with a smile | Sprouts into a healing vine when planted",
  "Fiorellino": "Little wildflower humming softly | Pollen heals nearby allies",
  "Fungo Curativo": "Glowing healing mushroom | Caps release spores that mend cuts",
};

const parseLore = (raw: string): { design: string; behavior: string } => {
  const [design, behavior] = raw.split("|").map((s) => s.trim());
  return { design, behavior };
};
export const LORE: Record<string, { design: string; behavior: string }> = Object.fromEntries(
  Object.entries(LORE_RAW).map(([k, v]) => [k, parseLore(v)]),
);
const lookupLore = (name: string) =>
  LORE[name] ?? { design: "A curious brainrot of indeterminate form.", behavior: "Acts on instinct, follows the rhythm." };

// ---------- ROSTER ----------
type RosterEntry = readonly [name: string, rarity: Rarity, element: Element, stat: number];

const ATTACK_ROSTER: RosterEntry[] = [
  ["Angel Sahur", "Monarch", "Light", 100], ["Bombardiro Crocodilo", "Monarch", "Light", 98],
  ["Cappuccino Assassino", "Monarch", "Light", 96], ["Bombombini Gusini", "Monarch", "Light", 95],
  ["U Din Din Din", "Noble", "Ground", 90], ["Bobrito Bandito", "Noble", "Ground", 85],
  ["Tric Trac Barabum", "Noble", "Fire", 88], ["Glorbo Fruttodrillo", "Noble", "Water", 82],
  ["Gorillini Arancini", "Knight", "Nature", 70], ["Pastaro Veloce", "Knight", "Fire", 65],
  ["Squalo Martello", "Knight", "Water", 72], ["Lupo Grigio", "Knight", "Nature", 60],
  ["Polpette Volante", "Uncommon", "Fire", 48], ["Gatto Spada", "Uncommon", "Nature", 35],
  ["Canarino Feroce", "Uncommon", "Nature", 40], ["Granchio Pugno", "Uncommon", "Water", 45],
  ["Rapa Rossa", "Common", "Nature", 25], ["Limonello", "Common", "Water", 18],
  ["Funghetto Truccato", "Common", "Nature", 12], ["Carotina Spezzata", "Common", "Ground", 8],
];
const DEFENSE_ROSTER: RosterEntry[] = [
  ["Tung Tung Tung Sahur", "Monarch", "Light", 100], ["Brr Brr Patapim", "Monarch", "Light", 97],
  ["Boneca Ambalabu", "Monarch", "Light", 96], ["La Vaca Saturno", "Monarch", "Light", 99],
  ["Burbaloni Luliloli", "Noble", "Water", 84], ["Rhino Toasterino", "Noble", "Fire", 90],
  ["Il Cacto Hipopotamo", "Noble", "Nature", 80], ["Frigo Camelo", "Noble", "Ground", 86],
  ["Tartaruga Corazzata", "Knight", "Water", 70], ["Cinghiale Scudo", "Knight", "Ground", 68],
  ["Granchio Roccia", "Knight", "Ground", 60], ["Orso Muro", "Knight", "Nature", 75],
  ["Tazzina Solida", "Uncommon", "Fire", 35], ["Biscotto Duro", "Uncommon", "Ground", 42],
  ["Mela Protetta", "Uncommon", "Nature", 45], ["Patata Rocciosa", "Uncommon", "Ground", 50],
  ["Mattoncino", "Common", "Ground", 22], ["Sasso Semplice", "Common", "Ground", 5],
  ["Foglia Spessa", "Common", "Nature", 18], ["Legnetto Storto", "Common", "Nature", 11],
];
const SUPPORT_ROSTER: RosterEntry[] = [
  ["Ballerina Cappuccina", "Monarch", "Light", 100], ["Lirilì Larilà", "Monarch", "Light", 95],
  ["Trippi Troppi (King of Sea)", "Monarch", "Light", 98], ["Espressona Signora", "Monarch", "Light", 96],
  ["Orangutini Ananasini", "Noble", "Nature", 85], ["Elefantini Strawberryni", "Noble", "Nature", 80],
  ["Blueberrinni Octopussini", "Noble", "Water", 90], ["Ta Ta Ta Sahur", "Noble", "Ground", 78],
  ["Giraffa Celeste", "Knight", "Nature", 68], ["Frulli Frulla", "Knight", "Water", 73],
  ["Medusa Curativa", "Knight", "Water", 60], ["Ape Mielosa", "Knight", "Nature", 65],
  ["Kiwi Dolce", "Uncommon", "Nature", 40], ["Limonata Fresca", "Uncommon", "Water", 50],
  ["Arancia Succosa", "Uncommon", "Fire", 32], ["Ciliegina Rosa", "Uncommon", "Nature", 45],
  ["Goccia D'Acqua", "Common", "Water", 5], ["Semino Verde", "Common", "Nature", 15],
  ["Fiorellino", "Common", "Nature", 22], ["Fungo Curativo", "Common", "Nature", 28],
];

const buildChar = (prefix: string, idx: number, entry: RosterEntry, role: "Attack" | "Defense" | "Support"): Character => {
  const [name, rarity, element, stat] = entry;
  const hp = Math.round(stat * 28 + 100);
  const atk = role === "Attack" ? Math.round(stat * 5 + 20) : Math.round(stat * 2.5 + 10);
  const def = role === "Defense" ? Math.round(stat * 4 + 20) : Math.round(stat * 1.8 + 10);
  const heal = role === "Support" ? Math.round(stat * 3.5 + 15) : Math.round(stat * 1 + 5);
  const lore = lookupLore(name);
  return {
    id: `${prefix}-${idx}`, name, role, rarity, element, stat,
    maxHP: hp, currentHP: hp,
    attackPower: atk, defensePower: def, healPower: heal,
    skillName: defaultSkill(role, element),
    level: 1, grade: "C", title: null,
    design: lore.design, behavior: lore.behavior,
  };
};
const defaultSkill = (role: string, element: Element) => {
  const v: Record<Element, string> = {
    Nature: "Vine Lash", Ground: "Stone Smash", Fire: "Cinder Strike",
    Water: "Tide Crash", Light: "Divine Beam", Dark: "Shadow Bite",
  };
  if (role === "Support") return `${element} Lullaby`;
  if (role === "Defense") return `${element} Bulwark`;
  return v[element];
};

export const ALL_ATTACK = ATTACK_ROSTER.map((e, i) => buildChar("atk", i, e, "Attack"));
export const ALL_DEFENSE = DEFENSE_ROSTER.map((e, i) => buildChar("def", i, e, "Defense"));
export const ALL_SUPPORT = SUPPORT_ROSTER.map((e, i) => buildChar("sup", i, e, "Support"));

export const findBaseById = (id: string): Character | undefined => {
  const base = id.split("#")[0];
  return [...ALL_ATTACK, ...ALL_DEFENSE, ...ALL_SUPPORT].find((c) => c.id === base);
};

export const getActivePool = (banner: "Attack" | "Defense" | "Support", layer: number): Character[] => {
  const theme = LayerElement[layer] ?? "Nature";
  const all = banner === "Attack" ? ALL_ATTACK : banner === "Defense" ? ALL_DEFENSE : ALL_SUPPORT;
  if (theme === "Light") return all.filter((c) => c.element === "Light");
  if (theme === "Dark") {
    return all.filter((c) => c.rarity === "Knight" || c.rarity === "Noble")
      .map((c) => ({ ...c, element: "Dark" as Element, name: `Corrupted ${c.name}` }));
  }
  return all.filter((c) => c.element === theme);
};
export const getRarityPoolByLayer = (rarity: Rarity, banner: "Attack" | "Defense" | "Support", layer: number) =>
  getActivePool(banner, layer).filter((c) => c.rarity === rarity);

// ---------- TRAITS ----------
export const GradeOrder: string[] = ["F-", "F", "D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+", "S", "Z"];
export const gradeMultiplier = (grade: string): number => {
  const idx = GradeOrder.indexOf(grade);
  if (idx < 0) return 1.0;
  const pct = -20 + (40 * idx) / (GradeOrder.length - 1);
  return 1 + pct / 100;
};

export const Titles: TitleTrait[] = [
  { name: "Little King", description: "A child in a king's body.", ability: "Splits incoming damage equally across all active allies.", code: "redistribute_damage" },
  { name: "Cor Leonis", description: "Take others' pain and bear it yourself.", ability: "Absorbs 25% of incoming damage as protective grace.", code: "absorb_status" },
  { name: "The Noble-man", description: "Born of gilded blood.", ability: "Increases post-combat Spaghetti Coin rewards by +25%.", code: "coin_boost" },
  { name: "The Dazzling Prince", description: "Fortune favors the radiant.", ability: "Multiplies luck in character and trait gacha spins (×1.5).", code: "luck_boost" },
];
export const TitleDropRates: Record<string, number> = {
  none: 70, "Little King": 8, "Cor Leonis": 8, "The Noble-man": 8, "The Dazzling Prince": 6,
};

// ---------- LAYERS OF HELL with enemy lore ----------
const enemyLore: Record<string, { design: string; behavior: string }> = {
  "Tiny Tralala":      { design: "Small leaf-clad gremlin with sneaker-feet", behavior: "Squeaks, scampers, kicks shins" },
  "Rocky Goblin":      { design: "Hunched goblin made of jagged shale", behavior: "Tosses boulders, dives behind rocks" },
  "Stone Sprite":      { design: "Floating gem-fairy with pebble swarm", behavior: "Spins, fires spikes, vanishes briefly" },
  "Cinder Imp":        { design: "Tiny demon wreathed in flickering coal-flames", behavior: "Cackles, darts, leaves burn trails" },
  "Lava Sahur":        { design: "Sahur figure carved from molten basalt", behavior: "Drums lava beats, erupts in cone bursts" },
  "Brine Croc":        { design: "Salt-crusted crocodile dragging a chain", behavior: "Lunges from puddles, drags prey down" },
  "Acid Tralalero":    { design: "Tralalero sneakers leaking citric ooze", behavior: "Stomps, splashes acid, retreats" },
  "Shadow Sahur":      { design: "Sahur silhouette with violet glowing eyes", behavior: "Vanishes, reappears behind for crit hits" },
  "Evil Tung Tung Sahur": { design: "Demonic Tung Tung — bat aflame, eyes crimson", behavior: "Drum-quake, void crush, ends with apocalypse swing" },
};
const enemy = (id: string, name: string, hp: number, atk: number, def: number, skill: string, element: Element): Character => {
  const l = enemyLore[name] ?? { design: "Mysterious enemy entity", behavior: "Acts hostile, attacks on sight" };
  return {
    id, name, role: "Attack", rarity: "Common", element, stat: 50,
    maxHP: hp, currentHP: hp, attackPower: atk, defensePower: def, healPower: 0,
    skillName: skill, level: 1, grade: "C", title: null,
    design: l.design, behavior: l.behavior,
  };
};

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
    layer: 9, title: "Throne of the Brainrot King", isFinal: true,
    enemies: [enemy("boss", "Evil Tung Tung Sahur", 10000, 420, 280, "Apocalypse Bat", "Dark")],
    bossPhases: [
      { hpThreshold: 0.66, name: "Rage",  atkBonus: 50,  message: "EVIL TUNG TUNG'S EYES GLOW RED." },
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
      "Welcome, halo'd one. Walk a portal stone — they bind the four hubs.",
      "Each step on grass holds a 5% chance to summon a layer-appropriate foe.",
      "Watch the spike tiles. They drain. The yellow squares steal your coins.",
      "When you FIGHT, the timing bar judges your rhythm. Stop in the center for a crit.",
    ],
  },
  npc2: {
    npc: "Layer Guardian",
    portrait: "guardian",
    lines: [
      "* Nine layers wait. Only Light shatters the corrupted throne.",
      "* Counter chain: Nature → Ground → Fire → Water → Nature.",
      "* Train your roster. Save often. The realm forgets the unprepared.",
    ],
  },
};

// ---------- HUB MAPS ----------
export interface VillagerDef {
  id: string; name: string; col: number; row: number; color: string;
  questId?: string; lines: string[];
}

export const HUB_MAPS: HubMapDef[] = [
  {
    id: 10, name: "Villaggio di Spaghetti", element: "Nature",
    bgColor: "#1f4f2a", accent: "#22c55e", cols: 11, rows: 13, exit: { col: 5, row: 12 },
    villagers: [
      { id: "v10-1", name: "Mamma Nonna",       col: 2, row: 3,  color: "#fbbf24", questId: "q1", lines: ["Bambino! My pots are missing brainrots.", "Defeat the noisy thing in Layer 1 for me, sì?"] },
      { id: "v10-2", name: "Pasta Boy",          col: 8, row: 3,  color: "#f59e0b", questId: "q2", lines: ["The cave mobs took my noodle press!", "Smash the Rocky Goblin in Layer 2."] },
      { id: "v10-3", name: "Olio Verde",         col: 2, row: 8,  color: "#84cc16", questId: "q3", lines: ["My olive grove is haunted by stone sprites.", "Clear Layer 3 and the trees will sing again."] },
      { id: "v10-4", name: "Pomodoro Rosso",     col: 8, row: 8,  color: "#dc2626", questId: "q4", lines: ["Tomatoes wilt while grass-rats stomp them.", "Stomp Layer 1 once more, please."] },
      { id: "v10-5", name: "Nonno Salvatore",    col: 5, row: 5,  color: "#a16207",                lines: ["The wind in Spaghetti smells of basil today.", "May your halo never tarnish, traveler."] },
    ],
  },
  {
    id: 11, name: "Terra di Cannoli", element: "Ground",
    bgColor: "#3a2a14", accent: "#a16207", cols: 11, rows: 13, exit: { col: 5, row: 12 },
    villagers: [
      { id: "v11-1", name: "Cannolo Crunchy",    col: 2, row: 3,  color: "#fde68a", questId: "q5", lines: ["The Cinder Imps of Layer 4 burn my fillings!", "Ground beats Fire. Make it cold."] },
      { id: "v11-2", name: "Ricotta Doce",       col: 8, row: 3,  color: "#fef3c7", questId: "q6", lines: ["Layer 5's Lava Sahur shakes my dough.", "Clear it and I'll bake you sweets."] },
      { id: "v11-3", name: "Vecchio Cantiere",   col: 2, row: 8,  color: "#78350f",                lines: ["Earth remembers every boot that crossed it."] },
      { id: "v11-4", name: "Mafioso Sicilia",    col: 8, row: 8,  color: "#1f2937", questId: "q7", lines: ["Respect? Show grit.", "Bring down the Rocky Goblin on Layer 2."] },
    ],
  },
  {
    id: 12, name: "Vulcano del Caffè", element: "Fire",
    bgColor: "#3a1414", accent: "#ef4444", cols: 11, rows: 13, exit: { col: 5, row: 12 },
    villagers: [
      { id: "v12-1", name: "Barista Espresso",   col: 2, row: 3,  color: "#7c2d12", questId: "q8",  lines: ["Brine Crocs douse my fires.", "Bring me their fangs — Fire beats Water."] },
      { id: "v12-2", name: "Cremoso Latte",      col: 8, row: 3,  color: "#fff7ed", questId: "q9",  lines: ["Layer 7's acid waves curdle my milk.", "Calm those waters."] },
      { id: "v12-3", name: "Caldera Magma",      col: 2, row: 8,  color: "#b91c1c",                 lines: ["Lava is honest. It only goes downward."] },
      { id: "v12-4", name: "Zucchero Bruciato",  col: 8, row: 8,  color: "#f97316", questId: "q10", lines: ["Caramel for life if you defeat Lava Sahur on Layer 5."] },
    ],
  },
  {
    id: 13, name: "Oceano di Limoncello", element: "Water",
    bgColor: "#0c2a3a", accent: "#3b82f6", cols: 11, rows: 13, exit: { col: 5, row: 12 },
    villagers: [
      { id: "v13-1", name: "Marinaio Salato",    col: 2, row: 3,  color: "#1e40af", questId: "q11", lines: ["Shadow Sahur poisoned my nets at Layer 8.", "Cut him down. Tides will return."] },
      { id: "v13-2", name: "Sirenetta Acida",    col: 8, row: 3,  color: "#22d3ee", questId: "q12", lines: ["Evil Tung Tung killed my song.", "Light him up on Layer 9."] },
      { id: "v13-3", name: "Capitano Limone",    col: 2, row: 8,  color: "#facc15",                 lines: ["Salt and sugar. The two truths of this ocean."] },
      { id: "v13-4", name: "Pirata Ghiacciato",  col: 8, row: 8,  color: "#0ea5e9", questId: "q13", lines: ["Layer 7's tralalero stole my rum. Sink it."] },
      { id: "v13-5", name: "Pescatore Onda",     col: 5, row: 5,  color: "#60a5fa",                 lines: ["The deepest fish wear the brightest scales."] },
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
  { id: "q8",  title: "Brine for the Barista",description: "Defeat the Brine Croc on Layer 6.", requiredLayer: 6, targetNPC: "v12-1", targetObjective: "Defeat Layer 6 enemy", reward: 150, isAccepted: false, isCompleted: false },
  { id: "q9",  title: "Calm the Acid",        description: "Defeat Acid Tralalero on Layer 7.", requiredLayer: 7, targetNPC: "v12-2", targetObjective: "Defeat Layer 7 enemy", reward: 175, isAccepted: false, isCompleted: false },
  { id: "q10", title: "Caramel For Life",     description: "Defeat Lava Sahur on Layer 5.", requiredLayer: 5, targetNPC: "v12-4", targetObjective: "Defeat Layer 5 enemy", reward: 130, isAccepted: false, isCompleted: false },
  { id: "q11", title: "Salt & Shadow",        description: "Defeat Shadow Sahur on Layer 8.", requiredLayer: 8, targetNPC: "v13-1", targetObjective: "Defeat Layer 8 enemy", reward: 200, isAccepted: false, isCompleted: false },
  { id: "q12", title: "Sirenetta's Song",     description: "Defeat the Final Boss on Layer 9.", requiredLayer: 9, targetNPC: "v13-2", targetObjective: "Defeat Layer 9 boss", reward: 500, isAccepted: false, isCompleted: false },
  { id: "q13", title: "Pirate's Citrus",      description: "Defeat Acid Tralalero on Layer 7.", requiredLayer: 7, targetNPC: "v13-4", targetObjective: "Defeat Layer 7 enemy", reward: 175, isAccepted: false, isCompleted: false },
];

// ---------- TRAPS PER MAP (legacy, kept for compatibility) ----------
export interface TrapDef { col: number; row: number; kind: "spike" | "coin"; value: number }
export const TRAPS_BY_MAP: Record<number, TrapDef[]> = {};

// ---------- PUZZLES PER MAP ----------
export interface PuzzleDef {
  id: string;
  col: number; row: number;
  kind: "riddle" | "pattern";
  prompt: string;
  choices: string[];
  answer: number; // index of correct choice
  reward: number;
}
export const PUZZLES_BY_MAP: Record<number, PuzzleDef[]> = {
  // Layer 1 walkable map (id 101)
  101: [
    { id: "p1-1", col: 4, row: 4,  kind: "riddle", prompt: "What grows louder the more you ignore it?",
      choices: ["A whisper", "Brainrot", "Silence", "Espresso"], answer: 1, reward: 25 },
    { id: "p1-2", col: 4, row: 12, kind: "pattern", prompt: "Pattern: 🍝 🥖 🍝 🥖 🍝 ?",
      choices: ["🥖", "🍝", "☕", "🍒"], answer: 0, reward: 30 },
    { id: "p1-3", col: 4, row: 20, kind: "riddle", prompt: "Which element counters Ground?",
      choices: ["Fire", "Water", "Nature", "Light"], answer: 2, reward: 35 },
  ],
  102: [
    { id: "p2-1", col: 4, row: 4,  kind: "riddle", prompt: "Ground beats…?", choices: ["Water", "Fire", "Light", "Nature"], answer: 1, reward: 40 },
    { id: "p2-2", col: 4, row: 12, kind: "pattern", prompt: "Pattern: ▲ ■ ▲ ■ ?", choices: ["▲", "●", "■", "★"], answer: 2, reward: 45 },
    { id: "p2-3", col: 4, row: 20, kind: "riddle", prompt: "Who is the locked starter?", choices: ["Tung Tung", "Angel Sahur", "Ballerina Cappuccina", "Tralalero"], answer: 1, reward: 50 },
  ],
  103: [{ id: "p3-1", col: 4, row: 8, kind: "riddle", prompt: "Damage cap is…?", choices: ["100", "200", "500", "Infinite"], answer: 1, reward: 60 }],
  104: [{ id: "p4-1", col: 4, row: 8, kind: "riddle", prompt: "Fire counters…?", choices: ["Nature", "Ground", "Water", "Dark"], answer: 2, reward: 70 }],
  105: [{ id: "p5-1", col: 4, row: 8, kind: "riddle", prompt: "How many save slots?", choices: ["1", "2", "3", "9"], answer: 2, reward: 80 }],
  106: [{ id: "p6-1", col: 4, row: 8, kind: "riddle", prompt: "Water counters…?", choices: ["Ground", "Fire", "Nature", "Dark"], answer: 2, reward: 90 }],
  107: [{ id: "p7-1", col: 4, row: 8, kind: "riddle", prompt: "Light's bonus vs Dark/Boss is ×?", choices: ["×0.5", "×1.0", "×1.5", "×2.0"], answer: 3, reward: 100 }],
  108: [{ id: "p8-1", col: 4, row: 8, kind: "riddle", prompt: "Final boss name?", choices: ["Tung Tung Tung Sahur", "Evil Tung Tung Sahur", "Tralalero", "Cappuccino Assassino"], answer: 1, reward: 120 }],
  109: [{ id: "p9-1", col: 4, row: 4, kind: "riddle", prompt: "The Throne demands…?", choices: ["Surrender", "Light", "Coffee", "Pasta"], answer: 1, reward: 150 }],
};

// ---------- LAYER MAPS (walkable hellscape per layer) ----------
// Each layer map is a small grid 9x24, three sub-sections separated by walls,
// each section connected by a stair tile.
export interface LayerMapDef {
  layerId: number;        // 1..9
  cols: number;
  rows: number;
  bgColor: string;
  entryPos: { col: number; row: number };  // bottom (entry from realm)
  exitPos: { col: number; row: number };   // top (must defeat boss to use)
  sectionStairs: { col: number; row: number }[]; // intra-layer stairs
  bossPos: { col: number; row: number };   // mandatory boss tile
  signs: { col: number; row: number; text: string }[];
  walls: { col: number; row: number }[];   // intra-section divider walls
}

const layerColors: Record<number, string> = {
  1: "#1f4f2a", 2: "#3a2a14", 3: "#3a2a14", 4: "#3a1414", 5: "#3a1414",
  6: "#0c2a3a", 7: "#0c2a3a", 8: "#220a3a", 9: "#3a3007",
};

const buildLayerMap = (n: number): LayerMapDef => {
  const cols = 9, rows = 24;
  const walls: { col: number; row: number }[] = [];
  // Section dividers at row 8 and row 16 — full row of walls except one gap (stair)
  for (let c = 1; c < cols - 1; c++) {
    if (c !== 4) { walls.push({ col: c, row: 8 }); walls.push({ col: c, row: 16 }); }
  }
  return {
    layerId: n, cols, rows,
    bgColor: layerColors[n] ?? "#1f2937",
    entryPos: { col: 4, row: 22 },
    exitPos:  { col: 4, row: 1 },
    sectionStairs: [{ col: 4, row: 16 }, { col: 4, row: 8 }],
    bossPos: { col: 4, row: 3 },
    signs: [
      { col: 4, row: 21, text: `LAYER ${n}` },
      { col: 4, row: 15, text: "STAIRS UP →" },
      { col: 4, row: 7,  text: "BOSS AHEAD" },
    ],
    walls,
  };
};
export const LAYER_MAPS: Record<number, LayerMapDef> = Object.fromEntries(
  [1,2,3,4,5,6,7,8,9].map((n) => [100 + n, buildLayerMap(n)]),
);

export const PullCost = 10;
export const TraitPullCost = 25;
export const ENCOUNTER_RATE = 0.08;
