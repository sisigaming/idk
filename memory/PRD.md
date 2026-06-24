# Brainrot RPG — Core Gameplay & UI Overhaul

## Highlights of this update
- **Title screen** with `CONTINUE GAME` / `NEW GAME` flows and three persistent **save slots** (AsyncStorage). Each slot stores coins, inventory (with equipped slots), highest layer cleared, current map, per-map last position, quests, and active slot id.
- **Position memory** — entering / exiting any building keeps the player exactly where they were; per-map last-position is stored in `state.positions` so re-entering a hub puts the player back on the tile they left.
- **Physical map transitions** — the menu-based TRAVEL screen is gone. Four colored portal tiles on the south edge of the realm (`▼N` Nature → 10, `▼G` Ground → 11, `▼F` Fire → 12, `▼W` Water → 13) and the cyan `▲UP` tile inside every hub move the player physically between maps.
- **NPC houses** — every hub villager now sits in front of a tiny 2-tile pixel house (roof + body shaded from villager color) that the player must physically walk into.
- **Traps** — 3-5 trap tiles per overworld map: red `▲` spike (HP drain 15-35) and yellow `$` coin trap (5-15 ◆ drain). Defined in `TRAPS_BY_MAP`, applied via `stepOnTrap()` on every move with a red flash bar.
- **Random encounters** — 5% per grass step (only when both ATK + SUP slots are equipped) auto-launches a `currentLayer` combat encounter.
- **Timing-attack minigame** — pressing FIGHT now opens a moving-indicator gauge with PERFECT (×2.5) / GREAT (×1.5) / GOOD / GRAZE / MISS zones; pressing `STOP!` snapshots the position and applies the multiplier on top of element matchup.
- **Cor Leonis** title now applies a 25% damage absorption to incoming attacks when equipped (Attack or Support slot). All four titles' passives implemented.
- **Roster lore** — every one of the 60 brainrots plus all 9 enemies plus the boss carry a `design` (physical) and `behavior` (action) string, visible on selection inside the inventory.
- **UI cleanup** — consistent yellow accent, monospace, scannable HUD pills, neutral panels, dialog typewriter unchanged but now persists into a quest panel that does NOT auto-exit so ACCEPT / CLAIM are reachable.

## Files
- `frontend/src/game/data.ts` — 60-char roster (stats banded 1-100 by rarity), lore lookup, layer-element table, hub maps, quests, `TRAPS_BY_MAP`, `ENCOUNTER_RATE`.
- `frontend/src/game/engine.ts` — types, dynamic gacha, evolution, traits, element multiplier, timing-attack damage, Cor Leonis hook, random encounter helper, trap step, save/load (`saveSlot` / `loadSlot` / `inspectSlot` / `deleteSlot`).
- `frontend/src/game/store.ts` — pub-sub `useGameState()` + `replaceState`.
- `frontend/app/index.tsx` — title scene, slot picker, overworld (realm + 4 hubs), gacha, dialog, villager-dialog + quest panel, inventory (with SAVE / TITLE buttons), combat with timing minigame, result scene.

## Verified live (Playwright)
Title → New Game → Slot 1 START → spawned at center-bottom of realm with the four colored portal tiles + 5 trap tiles visible → walked Left 2 onto ▼G portal → instantly transitioned to "Terra di Cannoli" hub (Ground biome, 4 villager houses, traps, ▲UP exit) → walked back into ▲UP tile → returned to realm → opened MENU → tapped `SAVE → S1` → flash banner "Saved to Slot 1." persisted to AsyncStorage.

## Out of scope
- Layer maps remain combat-only (no walkable hellscape tiles). Stairs/portals are realm→hub transitions.
- AI dialogue, persistence to a backend, real sprite art, audio.
