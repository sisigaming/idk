# Brainrot RPG — State Engine PRD

## Goal
Logical foundation + console-style mock output for a turn-based Brainrot RPG.

## Scope (MVP)
- TypeScript-only, runs entirely on-device, no backend, no third-party integrations.
- Single screen: cartoon/meme-styled console showing engine output.

## Data Structures (`/app/frontend/src/game/`)
- `PlayerTeam` — array, max 3 active `Character` objects.
- `Inventory` — array of all owned `Character` objects.
- Three gacha banners:
  - `SupportBanner` (Ballerina Cappuccina, Lirilì Larilà, Trippi Troppi)
  - `DefenseBanner` (Base Form Tung Tung Sahur, Brr Brr Patapim, Tralalero Tralala)
  - `AttackBanner` (Bombardiero Crocodilo, Cappuccino Assassino, Angel Sahur)
- `Character` props: `id, name, role (Attack|Defense|Support), maxHP, currentHP, attackPower, defensePower, skillName`.
- `LayersOfHell` — 9 layers, scaling enemy teams; Layer 9 = "Evil Tung Tung Sahur" (10000 HP).
- `NpcDialogues` — static lines for ambient flavor (Spaghetti Merchant, Ballerina Cappuccina, Layer Guardian).

## Functions (`engine.ts`)
- `createGameState(coins)` → `{ spaghettiCoins, playerTeam, inventory }`.
- `pullGacha(state, bannerType)` → spends 10 coins, randomizes pool, pushes to inventory, returns result message.
- `addToTeam(state, characterId)` → moves inventory item into PlayerTeam (cap 3).
- `startBattle(playerSquad, enemySquad)` → turn loop, `damage = max(1, atk - def)`, returns `{ winner, rounds, log[] }`.
- `getLayer(n)` / `allLayers()` — layer lookups.

## UI (`app/index.tsx`)
- SafeArea screen with HUD pills (coins / team / inventory), monospace console output, control buttons (Pull ATK/DEF/SUP, Layers, Battle L1, Boss L9, NPC Chat, DEMO RUN, Reset).
- All buttons carry kebab-case `testID`s.

## Out of scope
- Persistence, multiplayer, AI-generated dialogue, character art, animations.
