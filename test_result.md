# Brainrot RPG — Test Result Log

## Iteration 1 (Jan 2026)

### Scope
Frontend-only smoke + new-feature validation for the Brainrot RPG Expo web build.

### What Passes
- Title screen → New Game → Slot 1 → spawns into TUT Sanctuary (map 14). HUD shows L1/9.
- Elevation cliff block message: walking onto a higher tile without a ramp shows "* The cliff is too steep. Walk to a ramp." ✔
- Inventory MC Lock: Angel Tung shows "♥ MC" badge, locked note "Angel Tung is your Main Character. He cannot be unequipped or evolved.", and EQUIP / EVOLVE / TRAIT buttons are all hidden. ✔
- REPLAY HELP button present (testID `inv-replay-tut`). ✔
- All required testIDs present in source: `gate-popup`, `gate-close`, `enemy-bubble`, `reaction-panel`, `react-success`, `react-fail`, `tutorial-overlay`, `tutorial-next`, `tutorial-done`, `tutorial-skip`.
- Damage cap is implemented in engine (DAMAGE_CAP = 200, `capDmg` used by both `combatFight` and `enemyAttack`).

### What Fails / Blocked
- **CRITICAL: TUT Sanctuary is unbeatable.** Player can climb to the mid plateau via ramp (5,8) but cannot proceed further. heightAllowsStep blocks both descending the plateau (no ramp at (5,5)/(5,6)) and ascending to the top plateau (height diff 2 over ramp (5,4)). This blocks every downstream feature: completeTutorial, realm spawn, tutorial overlay, Layer 1 gate popup, combat flow.
- Tutorial overlay, layer 1 gate, combat reaction panel, soul cursor in combat, gacha flow, layer-map navigation — all NOT verified end-to-end because of the TUT block.

### Cosmetic / Code-Review Items
- `engine.ts:387` `stepOnTrap` message still references "Angel Sahur" — should say "Angel Tung".
- `TUTORIAL_STEPS[0].body` says "You play Angel Sahur." — should be "Angel Tung".
- `index.tsx` is 1389 lines; split into per-scene files when convenient.
- Console warning `props.pointerEvents is deprecated. Use style.pointerEvents` — non-blocking.

### Suggested Fix (CRITICAL)
Pick ONE:
- **A. Data fix**: in `data.ts`
  - Add to `RAMPS_BY_MAP[14]`: `{ col: 5, row: 5, height: 1, dir: "up" }` and keep `{ col: 5, row: 4, height: 2, dir: "up" }`.
  - Add to `HEIGHT_BY_MAP[14]`: `{ col: 5, row: 5, height: 1 }` and `{ col: 5, row: 4, height: 2 }` so the ramps themselves sit at the intermediate height.
  - Result: walking (5,6 h=1) → (5,5 h=1 ramp) → (5,4 h=2 ramp) → (5,3 h=2) becomes all 1-step transitions.
- **B. Engine fix**: in `index.tsx` `heightAllowsStep`, when `isRamp(to)` set `h2 = ramp.height` (and similarly for `from`). Then keep the existing diff check.

### Re-test checklist after fix
1. TUT path (5,12) → (5,1) reachable; puzzle at (5,2) triggers; correct answer warps to realm; tutorial overlay appears once.
2. On realm at (6,16): step up onto (6,15) with NO ATK equipped → gate-popup "✗ THE STAIR REJECTS YOU".
3. Equip ATK, step on stair → enter layer map 101; encounter boss; combat shows enemy-bubble + reaction-panel; all damage log lines ≤ 200.
4. Save → Title → Continue Slot 1 → resumes at correct map.
