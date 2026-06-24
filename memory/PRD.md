# Brainrot RPG — Elemental Multi-Map RPG

## What's built (TS state engine + Expo Web pixel overworld)
A 13-map Brainrot RPG with dynamic elemental gacha, side quests, and Undertale-style combat.

## State engine (`/app/frontend/src/game/`)
- **`data.ts`**:
  - `Element` union (`Nature | Ground | Fire | Water | Light | Dark`) with counter map and per-layer element table (L1 Nature, L2-3 Ground, L4-5 Fire, L6-7 Water, L8 Dark/Corrupted, L9 Light-only).
  - Explicit 60-character roster: `ATTACK_ROSTER`, `DEFENSE_ROSTER`, `SUPPORT_ROSTER`, 20 each, stats banded by rarity (Common 1-30 · Uncommon 31-50 · Knight 51-75 · Noble 76-94 · Monarch 95-100). Stats not encoded with location names.
  - `LayersOfHell` 1-9 each with element-tagged enemies and boss phases on L9.
  - 4 hub maps (`HUB_MAPS`): Villaggio di Spaghetti (Nature, 5 villagers), Terra di Cannoli (Ground, 4), Vulcano del Caffè (Fire, 4), Oceano di Limoncello (Water, 5).
  - `QUESTS` array with id, title, description, requiredLayer, targetNPC, targetObjective, reward, isAccepted, isCompleted, isClaimed.
- **`engine.ts`**:
  - `elementMultiplier(attacker, defender, isBoss)` — 1.5× advantage / 0.7× resist via rock-paper-scissors loop; Light × Dark/Boss = 2.0× super.
  - `pullGacha(state, banner)` filters pool by `state.currentLayer` element (L9 → Monarch Light only; L8 → corrupted Knight/Noble re-tagged Dark).
  - Layer-based dynamic banner config — `currentLayer` updates after each clear and re-themes all 3 portals.
  - Quest API: `acceptQuest`, `tryCompleteQuests(layer)` runs at combat victory, `claimQuest` pays reward.
  - `combatFight` / enemy retaliation both apply `elementMultiplier` and log `[×1.5 advantage / ×0.7 resisted / LIGHT SUPER ×2.0]` tags.

## Overworld (`app/index.tsx`)
- One scene-manager screen that renders either the original 13×18 realm map (with `TRAVEL` building added) or any of the 4 hub maps (10×12) from a `MapDef`.
- HUD pills: coins, current layer, **active element** (color-coded), inventory count.
- Villager NPCs are 1-tile sprites with quest badges: `?` available · `!` in progress · `★` ready to claim · *(none)* claimed.
- Cyan `EXIT` tile at the bottom of every hub returns to the realm.
- Scenes: overworld · gacha (element-themed) · realm-NPC dialog · villager dialog + quest panel · inventory · travel · combat · victory/defeat.

## Verified live
- L1 ATK portal shows "ATTACK PORTAL — NATURE", drops Nature roster (pulled `Canarino Feroce` Uncommon Nature).
- TRAVEL menu lists Brainrot Realm + 4 element hubs with correct villager/quest counts.
- Entering Villaggio di Spaghetti renders 5 villagers + EXIT tile; walking into Olio Verde opens typewriter dialog → "Olives & Sprites" quest panel → ACCEPT toggles status to IN PROGRESS → badge on map changes `?` → `!`.

## Out of scope
Persistence, AI dialogue, sound, real animation, sprite art (stylized blocks only).
