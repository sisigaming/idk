# Brainrot RPG — Undertale-style 2.5D Pixel Realm

## What's built
A single Expo (React Native Web) screen running a TS state engine + an Undertale-flavored pixel overworld. All on-device, no backend, no external integrations.

## State engine (`/app/frontend/src/game/`)
- **`data.ts`**: 5-rank rarity tables (Common 40 · Uncommon 30 · Knight 20.9 · Noble 1.0 · Monarch 0.7 — Heavenly Virtues), pools split by role, 16-grade trait scale (`F-`→`Z` mapped to −20 % … +20 %), 4 title traits (`Little King`, `Cor Leonis`, `The Noble-man`, `The Dazzling Prince`) with their exact abilities, 9 Layers of Hell with scaled enemy stats and boss phases (Final Boss `Evil Tung Tung Sahur` @ 10 000 HP with 2 rage phases), NPC dialogue trees.
- **`engine.ts`**: weighted `pullGacha`, `pullTrait` (grade + title roll, luck-boosted by Dazzling Prince), `evolveCharacter` (cost-based, promotes rarity), `effectiveAtk/Def/Heal/MaxHP` with grade × level scaling, `startCombat / combatFight / combatItem / combatAct / combatMercy`, boss-phase trigger logic, post-combat coin reward with Noble-man +25 % bonus.
- **`store.ts`**: Tiny pub-sub `useGameState()` so the whole UI re-renders on `setState((s) => …)`.

## Pixel overworld (`/app/frontend/app/index.tsx`)
- 13 × 18 tile grid (22 px tiles), grass checker pattern, black border walls.
- 7 buildings, each rendered as 3 × 2 pixel sprite with a colored roof / body + label, and a yellow door tile that triggers a scene on walk-in:
  - 3 gacha portals — **ATK** (red), **DEF** (blue), **SUP** (purple)
  - 2 NPC houses — Spaghetti Merchant + Layer Guardian (Undertale typewriter dialog)
  - 1 **HOME** — inventory / team / evolve / trait pull
  - 1 **???** decorative-only building
- Angel Sahur sprite (halo · head · robe · drum) drawn from layered colored `View`s.
- D-pad + WASD/arrow-key movement (single-tile, collision-aware).
- HUD pills: coins · highest layer cleared · inventory count.

## Scenes
- **Gacha** — banner-colored frame, shows real drop rates, card flips in with rarity tint after pull.
- **Dialog** — black box + white border, typewriter text, portrait, ▼ tap-to-continue.
- **Inventory** — equip ATK/SUP slot, evolve (consumes duplicates), trait pull (25 G).
- **Combat** — pure Undertale: enemy blob at top, HP bars, black action box, FIGHT/ACT/ITEM/MERCY menu, no visible player.
- **Victory / Defeat** — reward summary, log tail, return-to-realm button.

## Verified visually
Gacha pull (got `Frothy Fiend` Uncommon), inventory with 7 brainrots across all rarities, slot equip, Layer 1 combat: `Frothy Fiend` → 120 dmg via "Foam Smother", `Boneca Ambalabu` heal +101, ACT spare attempt, enemy retaliate with grade-scaled damage reduction.

## Out of scope
Persistence, AI-generated dialogue, sound, animations, image gen for sprites.
