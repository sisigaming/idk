import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ElementColor, LAYER_MAPS, LayerElement, NpcDialogues, PullCost, PUZZLES_BY_MAP,
  TraitPullCost, findHub, findVillager,
} from "@/src/game/data";
import {
  acceptQuest, claimQuest, closeCombat, combatAct, combatFight, combatItem, combatMercy,
  createGameState, DAMAGE_CAP, deleteSlot, effectiveMaxHP, Element, enterLayerMap, evolveCharacter, GameState,
  inspect, inspectSlot, isLayerMap, loadSlot, puzzleAt, pullGacha, pullTrait, Rarity, resolveReaction, Role,
  saveSlot, SaveMeta, setAttackSlot, setDefenseSlot, setSupportSlot, solvePuzzle, startCombat, timingMultiplier,
} from "@/src/game/engine";
import { getState, replaceState, setState, useGameState } from "@/src/game/store";

// ============================================================
const TILE = 22;
type Dir = "up" | "down" | "left" | "right";

// ----- REALM MAP -----
const REALM_COLS = 13;
const REALM_ROWS = 18;

type BuildingKind =
  | "gacha_attack" | "gacha_defense" | "gacha_support"
  | "npc1" | "npc2" | "inventory" | "decor";

interface Building {
  kind: BuildingKind; col: number; row: number;
  label: string; roof: string; body: string;
  door?: { col: number; row: number };
}
const REALM_BUILDINGS: Building[] = [
  { kind: "gacha_attack",  col: 1,  row: 2,  label: "ATK",  roof: "#7f1d1d", body: "#ef4444", door: { col: 2,  row: 4 } },
  { kind: "gacha_support", col: 9,  row: 2,  label: "SUP",  roof: "#5b21b6", body: "#a855f7", door: { col: 10, row: 4 } },
  { kind: "gacha_defense", col: 5,  row: 5,  label: "DEF",  roof: "#1e3a8a", body: "#3b82f6", door: { col: 6,  row: 7 } },
  { kind: "npc1",          col: 1,  row: 9,  label: "?!",   roof: "#65a30d", body: "#a3e635", door: { col: 2,  row: 11 } },
  { kind: "npc2",          col: 9,  row: 9,  label: "?!",   roof: "#b45309", body: "#f59e0b", door: { col: 10, row: 11 } },
  { kind: "inventory",     col: 5,  row: 12, label: "HOME", roof: "#a16207", body: "#fbbf24", door: { col: 6,  row: 14 } },
];

interface Portal { col: number; row: number; targetMap: number; color: string; label: string }
// Replace TRAVEL slot (Water) with DESCEND portal? Keep all four element portals plus add a central DESCEND tile that drops player into the current Layer map.
const REALM_PORTALS: Portal[] = [
  { col: 1,  row: 16, targetMap: 10, color: "#22c55e", label: "▼N" },
  { col: 4,  row: 16, targetMap: 11, color: "#a16207", label: "▼G" },
  { col: 8,  row: 16, targetMap: 12, color: "#ef4444", label: "▼F" },
  { col: 11, row: 16, targetMap: 13, color: "#3b82f6", label: "▼W" },
];

// Central layer-descend stair on row 15
const LAYER_STAIR = { col: 6, row: 15, color: "#dc2626", label: "▼L" };

const buildRealmTiles = () => {
  const m: Record<string, { block: boolean; trigger?: BuildingKind | "portal"; portal?: Portal }> = {};
  for (let c = 0; c < REALM_COLS; c++) { m[`${c},0`] = { block: true }; m[`${c},${REALM_ROWS - 1}`] = { block: true }; }
  for (let r = 0; r < REALM_ROWS; r++) { m[`0,${r}`] = { block: true }; m[`${REALM_COLS - 1},${r}`] = { block: true }; }
  REALM_BUILDINGS.forEach((b) => {
    for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 3; dc++) m[`${b.col + dc},${b.row + dr}`] = { block: true };
    if (b.door) m[`${b.door.col},${b.door.row}`] = { block: false, trigger: b.kind };
  });
  REALM_PORTALS.forEach((p) => { m[`${p.col},${p.row}`] = { block: false, trigger: "portal", portal: p }; });
  return m;
};
const REALM_TILES = buildRealmTiles();

const PLAYER_DEFAULT_REALM = { col: 6, row: 16 };
const playerDefaultHub = (h: ReturnType<typeof findHub>) => h ? { col: Math.floor(h.cols / 2), row: h.rows - 2 } : PLAYER_DEFAULT_REALM;

// ============================================================
export default function Index() {
  const state = useGameState();
  const [pos, setPos] = useState(PLAYER_DEFAULT_REALM);
  const [facing, setFacing] = useState<Dir>("down");
  const posRef = useRef(pos);
  posRef.current = pos;
  const [trapFlash, setTrapFlash] = useState<string | null>(null);

  // Restore position when map changes (after loading slot or portal step)
  useEffect(() => {
    if (state.scene !== "overworld") return;
    const hub = state.currentMap >= 10 ? findHub(state.currentMap) : null;
    const saved = state.positions[state.currentMap];
    setPos(saved ?? (hub ? playerDefaultHub(hub) : PLAYER_DEFAULT_REALM));
    setFacing("down");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentMap, state.activeSlot]);

  const currentHub = state.currentMap >= 10 ? findHub(state.currentMap) : null;

  const flashMsg = (m: string) => {
    setTrapFlash(m);
    setTimeout(() => setTrapFlash(null), 1800);
  };

  const move = useCallback((dc: number, dr: number, dir: Dir) => {
    if (getState().scene !== "overworld") return;
    setFacing(dir);
    const s = getState();
    const hub = s.currentMap >= 10 ? findHub(s.currentMap) : null;
    const np = { col: posRef.current.col + dc, row: posRef.current.row + dr };
    const C = hub ? hub.cols : REALM_COLS;
    const R = hub ? hub.rows : REALM_ROWS;
    if (np.col < 0 || np.row < 0 || np.col >= C || np.row >= R) return;

    if (hub) {
      if (np.col === 0 || np.row === 0 || np.col === C - 1 || np.row === R - 1) return;
      const v = hub.villagers.find((x) => x.col === np.col && x.row === np.row);
      if (v) {
        setState((st) => {
          st.positions[st.currentMap] = posRef.current; // remember entry pos
          st.scene = "villager_dialog"; st.villagerId = v.id;
        });
        return;
      }
      if (np.col === hub.exit.col && np.row === hub.exit.row) {
        // Physical exit back to realm at the corresponding portal tile.
        setState((st) => {
          st.positions[st.currentMap] = np;
          const portal = REALM_PORTALS.find((p) => p.targetMap === st.currentMap);
          if (portal) st.positions[1] = { col: portal.col, row: portal.row - 1 }; // step out above the portal
          st.currentMap = 1;
          st.scene = "overworld";
        });
        return;
      }
      setPos(np);
      // Trap step
      const trap = stepOnTrapInPlace(np);
      if (trap) flashMsg(trap);
      // Random encounter (only if both slots equipped)
      if (Math.random() < 0.05 && s.attackSlot && s.supportSlot) {
        setState((st) => { st.positions[st.currentMap] = np; startCombat(st, st.currentLayer); });
      }
      return;
    }

    // Realm path
    const t = REALM_TILES[`${np.col},${np.row}`];
    if (t?.block) return;
    // Puzzle check
    const pz = puzzleAt(s, np.col, np.row);
    if (pz) {
      setState((st) => { st.positions[1] = posRef.current; st.scene = "puzzle"; });
      setPos(np);
      return;
    }
    setPos(np);
    const trig = t?.trigger;
    if (trig === "portal" && t?.portal) {
      const p = t.portal;
      setState((st) => {
        st.positions[1] = np;
        st.currentMap = p.targetMap;
        st.scene = "overworld";
      });
      return;
    }
    if (trig) {
      setState((st) => {
        st.positions[1] = np;
        if (trig === "gacha_attack")  { st.scene = "gacha"; st.gachaBanner = "Attack"; }
        else if (trig === "gacha_defense") { st.scene = "gacha"; st.gachaBanner = "Defense"; }
        else if (trig === "gacha_support") { st.scene = "gacha"; st.gachaBanner = "Support"; }
        else if (trig === "npc1") { st.scene = "dialog"; st.dialogNpc = "npc1"; }
        else if (trig === "npc2") { st.scene = "dialog"; st.dialogNpc = "npc2"; }
        else if (trig === "inventory") { st.scene = "inventory"; }
      });
      return;
    }
    // Trap step
    const trap = stepOnTrapInPlace(np);
    if (trap) flashMsg(trap);
    // Random encounter
    if (Math.random() < 0.05 && s.attackSlot && s.supportSlot) {
      setState((st) => { st.positions[st.currentMap] = np; startCombat(st, st.currentLayer); });
    }
  }, []);

  const stepOnTrapInPlace = (np: { col: number; row: number }): string | null => {
    let msg: string | null = null;
    setState((st) => {
      const r = stepOnTrap(st, np.col, np.row);
      if (r.kind !== "none") msg = r.message ?? null;
    });
    return msg;
  };

  // Keyboard for web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w")    { e.preventDefault(); move(0, -1, "up"); }
      else if (k === "arrowdown" || k === "s")  { e.preventDefault(); move(0, 1, "down"); }
      else if (k === "arrowleft" || k === "a")  { e.preventDefault(); move(-1, 0, "left"); }
      else if (k === "arrowright" || k === "d") { e.preventDefault(); move(1, 0, "right"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="screen-root">
      {state.scene === "title" && <TitleScene />}
      {state.scene === "overworld" && (
        <Overworld pos={pos} facing={facing} move={move} state={state} hub={currentHub} trapFlash={trapFlash} />
      )}
      {state.scene === "gacha" && <GachaScene />}
      {state.scene === "dialog" && <DialogScene />}
      {state.scene === "villager_dialog" && <VillagerDialogScene />}
      {state.scene === "puzzle" && <PuzzleScene />}
      {state.scene === "inventory" && <InventoryScene />}
      {state.scene === "combat" && <CombatScene />}
      {state.scene === "victory" && <ResultScene win />}
      {state.scene === "defeat" && <ResultScene win={false} />}
    </SafeAreaView>
  );
}

// ============================================================
// TITLE SCREEN
// ============================================================
function TitleScene() {
  const [metas, setMetas] = useState<SaveMeta[] | null>(null);
  const [mode, setMode] = useState<"main" | "continue" | "newgame">("main");

  useEffect(() => {
    (async () => {
      const m = await Promise.all([inspectSlot(1), inspectSlot(2), inspectSlot(3)]);
      setMetas(m);
    })();
  }, [mode]);

  const startNew = async (slot: 1 | 2 | 3) => {
    const fresh = createGameState();
    fresh.scene = "overworld";
    fresh.activeSlot = slot;
    await saveSlot(slot, fresh);
    replaceState(fresh);
  };

  const continueAt = async (slot: 1 | 2 | 3) => {
    const loaded = await loadSlot(slot);
    if (loaded) replaceState(loaded);
  };

  const wipe = async (slot: 1 | 2 | 3) => {
    await deleteSlot(slot);
    const m = await Promise.all([inspectSlot(1), inspectSlot(2), inspectSlot(3)]);
    setMetas(m);
  };

  if (mode === "main") {
    return (
      <View style={styles.titleRoot}>
        <Text style={styles.titleBrand}>BRAINROT</Text>
        <Text style={styles.titleBrandSub}>·  RPG  ·</Text>
        <View style={{ height: 32 }} />
        <Pressable testID="title-continue" onPress={() => setMode("continue")} style={({ pressed }) => [styles.titleBtn, pressed && { backgroundColor: "#facc15" }]}>
          <Text style={styles.titleBtnText}>CONTINUE GAME</Text>
        </Pressable>
        <Pressable testID="title-newgame" onPress={() => setMode("newgame")} style={({ pressed }) => [styles.titleBtn, pressed && { backgroundColor: "#facc15" }]}>
          <Text style={styles.titleBtnText}>NEW GAME</Text>
        </Pressable>
        <Text style={styles.titleHint}>3 save slots · Persist between sessions</Text>
      </View>
    );
  }

  return (
    <View style={styles.titleRoot}>
      <Text style={styles.titleBrand}>{mode === "continue" ? "CONTINUE" : "NEW GAME"}</Text>
      <Text style={styles.titleBrandSub}>· choose a slot ·</Text>
      <View style={{ height: 16 }} />
      {[1, 2, 3].map((n) => {
        const slot = n as 1 | 2 | 3;
        const meta = metas?.[n - 1];
        const empty = !meta?.exists;
        return (
          <View key={n} style={styles.slotCard} testID={`slot-${n}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.slotTitle}>SLOT {n}</Text>
              {empty ? (
                <Text style={styles.slotSub}>— empty —</Text>
              ) : (
                <>
                  <Text style={styles.slotSub}>L {meta!.layerCleared}/9 · ◆ {meta!.coins} · ▣ {meta!.inventorySize}</Text>
                  <Text style={styles.slotSub}>Map {meta!.mapId} · {meta!.savedAt ? new Date(meta!.savedAt).toLocaleString() : ""}</Text>
                </>
              )}
            </View>
            {mode === "continue" && !empty ? (
              <Pressable testID={`slot-${n}-continue`} onPress={() => continueAt(slot)} style={({ pressed }) => [styles.slotBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.slotBtnText}>LOAD</Text>
              </Pressable>
            ) : mode === "newgame" ? (
              <View style={{ gap: 4 }}>
                <Pressable testID={`slot-${n}-new`} onPress={() => startNew(slot)} style={({ pressed }) => [styles.slotBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.slotBtnText}>{empty ? "START" : "OVERWRITE"}</Text>
                </Pressable>
                {!empty && (
                  <Pressable testID={`slot-${n}-delete`} onPress={() => wipe(slot)} style={({ pressed }) => [styles.slotBtnGhost, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.slotBtnGhostText}>DELETE</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
      <Pressable testID="title-back" onPress={() => setMode("main")} style={({ pressed }) => [styles.titleBtnGhost, pressed && { opacity: 0.7 }]}>
        <Text style={styles.titleBtnGhostText}>BACK</Text>
      </Pressable>
    </View>
  );
}

// ============================================================
// OVERWORLD
// ============================================================
function Overworld({ pos, facing, move, state, hub, trapFlash }: {
  pos: { col: number; row: number }; facing: Dir;
  move: (dc: number, dr: number, d: Dir) => void;
  state: GameState; hub: ReturnType<typeof findHub> | null;
  trapFlash: string | null;
}) {
  const cols = hub ? hub.cols : REALM_COLS;
  const rows = hub ? hub.rows : REALM_ROWS;
  const layerEl = LayerElement[state.currentLayer];
  const traps: never[] = []; // traps removed — puzzles take their place
  const puzzles = PUZZLES_BY_MAP[state.currentMap] ?? [];
  const unsolvedPuzzles = puzzles.filter((p) => !state.solvedPuzzles.includes(p.id));

  return (
    <View style={styles.overworld}>
      <View style={styles.hud}>
        <Text style={styles.hudTitle}>* {hub ? hub.name.toUpperCase() : "BRAINROT REALM"}</Text>
        <View style={styles.hudPills}>
          <Pill testID="hud-coins" label={`◆ ${state.spaghettiCoins}`} />
          <Pill testID="hud-layer" label={`L${state.currentLayer}/9`} />
          <Pill testID="hud-element" label={layerEl} color={ElementColor[layerEl]} />
          <Pill testID="hud-inv" label={`▣ ${state.inventory.length}`} />
          {state.activeSlot ? <Pill testID="hud-slot" label={`S${state.activeSlot}`} /> : null}
        </View>
      </View>

      {trapFlash ? (
        <View style={styles.flashBar} testID="trap-flash">
          <Text style={styles.flashText}>{trapFlash}</Text>
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        <View style={[styles.map, { width: cols * TILE, height: rows * TILE, backgroundColor: hub ? hub.bgColor : "#163920" }]} testID="overworld-map">
          {/* Floor */}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const isWall = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
              const checker = (r + c) % 2 === 0 ? (hub ? hub.bgColor : "#1f4f2a") : (hub ? shade(hub.bgColor, -10) : "#1b4525");
              return (
                <View key={`g-${c}-${r}`} style={{
                  position: "absolute", left: c * TILE, top: r * TILE, width: TILE, height: TILE,
                  backgroundColor: isWall ? "#0f172a" : checker,
                  borderRightWidth: isWall ? 0 : 1, borderBottomWidth: isWall ? 0 : 1, borderColor: "#000", opacity: isWall ? 1 : 0.85,
                }} />
              );
            }),
          )}

          {/* Puzzles */}
          {unsolvedPuzzles.map((p, i) => (
            <View key={`pz-${i}`} style={{
              position: "absolute", left: p.col * TILE + 3, top: p.row * TILE + 3,
              width: TILE - 6, height: TILE - 6, backgroundColor: "#22d3ee",
              borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#000", fontWeight: "900", fontSize: 11, fontFamily: "monospace" }}>?</Text>
            </View>
          ))}
          {traps.map(() => null)}

          {/* Realm portals */}
          {!hub && REALM_PORTALS.map((p, i) => (
            <View key={`p-${i}`} style={{
              position: "absolute", left: p.col * TILE + 2, top: p.row * TILE + 2,
              width: TILE - 4, height: TILE - 4, backgroundColor: p.color,
              borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#000", fontFamily: "monospace", fontWeight: "900", fontSize: 9 }}>{p.label}</Text>
            </View>
          ))}

          {/* Realm buildings */}
          {!hub && REALM_BUILDINGS.map((b, i) => <BuildingSprite key={i} b={b} />)}
          {!hub && REALM_BUILDINGS.filter((b) => b.door).map((b, i) => (
            <View key={`door-${i}`} style={{
              position: "absolute", left: b.door!.col * TILE + 4, top: b.door!.row * TILE + 4,
              width: TILE - 8, height: TILE - 8, backgroundColor: "#facc15", borderWidth: 2, borderColor: "#a16207",
            }} />
          ))}

          {/* Hub villagers (with mini-house roof) */}
          {hub && hub.villagers.map((v) => {
            const q = state.quests.find((x) => x.targetNPC === v.id);
            const badge = q ? (q.isClaimed ? "" : q.isCompleted ? "★" : q.isAccepted ? "!" : "?") : "";
            return (
              <View key={v.id} testID={`villager-${v.id}`}>
                {/* tiny house roof on row above */}
                <View style={{ position: "absolute", left: v.col * TILE - 2, top: (v.row - 1) * TILE + 4, width: TILE + 4, height: TILE - 4, backgroundColor: shade(v.color, -35), borderWidth: 2, borderColor: "#000" }} />
                <View style={{ position: "absolute", left: v.col * TILE - 4, top: (v.row - 1) * TILE - 2, width: TILE + 8, height: 8, backgroundColor: shade(v.color, -55), borderWidth: 2, borderColor: "#000" }} />
                <View style={{ position: "absolute", left: v.col * TILE + 2, top: v.row * TILE + 2 }}>
                  <VillagerSprite color={v.color} />
                  {badge ? <View style={styles.questBadge}><Text style={styles.questBadgeText}>{badge}</Text></View> : null}
                </View>
              </View>
            );
          })}
          {hub && (
            <View style={{
              position: "absolute", left: hub.exit.col * TILE + 4, top: hub.exit.row * TILE + 4,
              width: TILE - 8, height: TILE - 8, backgroundColor: "#22d3ee", borderWidth: 2, borderColor: "#0e7490",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#000", fontSize: 8, fontWeight: "900", fontFamily: "monospace" }}>▲UP</Text>
            </View>
          )}

          {/* Player */}
          <View style={[styles.player, { left: pos.col * TILE + 2, top: pos.row * TILE + 2 }]} testID="player-avatar">
            <AngelSprite facing={facing} />
          </View>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.dpad} testID="dpad">
          <View style={styles.dpadRow}><View style={styles.dpadSpacer} /><DPadBtn label="↑" testID="dpad-up" onPress={() => move(0, -1, "up")} /><View style={styles.dpadSpacer} /></View>
          <View style={styles.dpadRow}><DPadBtn label="←" testID="dpad-left" onPress={() => move(-1, 0, "left")} /><View style={styles.dpadCenter} /><DPadBtn label="→" testID="dpad-right" onPress={() => move(1, 0, "right")} /></View>
          <View style={styles.dpadRow}><View style={styles.dpadSpacer} /><DPadBtn label="↓" testID="dpad-down" onPress={() => move(0, 1, "down")} /><View style={styles.dpadSpacer} /></View>
        </View>
        <View style={styles.sideButtons}>
          <SqBtn testID="open-inventory" label="MENU" onPress={() => setState((s) => { s.scene = "inventory"; })} />
          <SqBtn testID="open-battle" label={`L${state.currentLayer}\nFIGHT`} onPress={() => {
            if (!state.attackSlot || !state.supportSlot) { setState((s) => { s.scene = "inventory"; s.flash = "Equip ATK + SUP first."; }); return; }
            setState((s) => { startCombat(s, s.currentLayer); });
          }} />
        </View>
      </View>

      <Text style={styles.hint}>{hub ? "Walk into a villager's house • ▲UP tile to leave" : "Doors enter buildings • ▼ tiles descend to hubs"}</Text>
    </View>
  );
}

// ============================================================
// SPRITES & PILLS
// ============================================================
function BuildingSprite({ b }: { b: Building }) {
  return (
    <View style={{ position: "absolute", left: b.col * TILE, top: b.row * TILE, width: TILE * 3, height: TILE * 2 }}>
      <View style={{ height: TILE * 0.8, backgroundColor: b.roof, borderWidth: 2, borderColor: "#000" }} />
      <View style={{ flex: 1, backgroundColor: b.body, borderWidth: 2, borderTopWidth: 0, borderColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <Text style={styles.bldgLabel}>{b.label}</Text>
      </View>
    </View>
  );
}
function VillagerSprite({ color }: { color: string }) {
  return (
    <View style={{ width: TILE - 4, height: TILE - 4 }}>
      <View style={{ position: "absolute", left: 4, top: 1, width: 10, height: 7, backgroundColor: color, borderWidth: 1, borderColor: "#000" }}>
        <View style={{ position: "absolute", left: 2, top: 2, width: 2, height: 1, backgroundColor: "#000" }} />
        <View style={{ position: "absolute", left: 6, top: 2, width: 2, height: 1, backgroundColor: "#000" }} />
      </View>
      <View style={{ position: "absolute", left: 2, top: 8, width: 14, height: 8, backgroundColor: shade(color, -25), borderWidth: 1, borderColor: "#000" }} />
    </View>
  );
}
function AngelSprite({ facing }: { facing: Dir }) {
  return (
    <View style={{ width: TILE - 4, height: TILE - 4 }}>
      <View style={{ position: "absolute", left: 4, top: 0, width: 10, height: 3, backgroundColor: "#facc15", borderRadius: 2 }} />
      <View style={{ position: "absolute", left: 5, top: 2, width: 8, height: 6, backgroundColor: "#fde68a", borderWidth: 1, borderColor: "#000" }}>
        <View style={{ position: "absolute", left: facing === "left" ? 1 : facing === "right" ? 4 : 2, top: 2, width: 2, height: 1, backgroundColor: "#000" }} />
      </View>
      <View style={{ position: "absolute", left: 3, top: 8, width: 12, height: 8, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#000" }} />
      <View style={{ position: "absolute", left: 5, top: 12, width: 8, height: 4, backgroundColor: "#92400e", borderWidth: 1, borderColor: "#000" }} />
    </View>
  );
}
function shade(hex: string, amt: number) {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(h.substring(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(h.substring(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(h.substring(4, 6), 16) + amt));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function Pill({ label, testID, color }: { label: string; testID: string; color?: string }) {
  return (
    <View style={[styles.pill, color ? { borderColor: color } : null]}>
      <Text style={[styles.pillText, color ? { color } : null]} testID={testID}>{label}</Text>
    </View>
  );
}
function DPadBtn({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (<Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.dpadBtn, pressed && { transform: [{ scale: 0.9 }] }]}><Text style={styles.dpadText}>{label}</Text></Pressable>);
}
function SqBtn({ label, onPress, testID, tone }: { label: string; onPress: () => void; testID: string; tone?: "danger" | "ghost" }) {
  const bg = tone === "danger" ? "#ef4444" : tone === "ghost" ? "transparent" : "#facc15";
  const fg = tone === "danger" ? "#fff" : tone === "ghost" ? "#facc15" : "#000";
  return (<Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.sqBtn, { backgroundColor: bg, borderColor: tone === "ghost" ? "#facc15" : "#000" }, pressed && { transform: [{ scale: 0.95 }] }]}><Text style={[styles.sqBtnText, { color: fg }]}>{label}</Text></Pressable>);
}

const rarityColor = (r: Rarity) =>
  r === "Monarch" ? "#facc15" : r === "Noble" ? "#a855f7" : r === "Knight" ? "#3b82f6" : r === "Uncommon" ? "#22c55e" : "#94a3b8";

// ============================================================
// GACHA SCENE
// ============================================================
function GachaScene() {
  const state = useGameState();
  const banner = state.gachaBanner ?? "Attack";
  const layerEl = LayerElement[state.currentLayer];
  const [lastPull, setLastPull] = useState<{ name: string; rarity: Rarity; element: Element; msg: string } | null>(null);
  const [pulling, setPulling] = useState(false);

  const doPull = useCallback(() => {
    if (pulling) return;
    setPulling(true);
    setTimeout(() => {
      let r: ReturnType<typeof pullGacha> = { success: false, message: "" };
      setState((s) => { r = pullGacha(s, banner as Role); });
      if (r.success && r.character && r.rarity && r.element) setLastPull({ name: r.character.name, rarity: r.rarity, element: r.element, msg: r.message });
      else setLastPull({ name: "—", rarity: "Common", element: "Nature", msg: r.message });
      setPulling(false);
    }, 350);
  }, [banner, pulling]);

  const exit = () => setState((s) => { s.scene = "overworld"; s.gachaBanner = null; });
  const bannerColor = ElementColor[layerEl];

  return (
    <View style={styles.sceneRoot}>
      <View style={[styles.panel, { borderColor: bannerColor }]}>
        <Text style={[styles.sceneTitle, { color: bannerColor }]} testID="gacha-title">* {banner.toUpperCase()} PORTAL — {layerEl.toUpperCase()}</Text>
        <Text style={styles.sceneSub}>L{state.currentLayer} → pool tuned to {layerEl}.</Text>
        <Text style={styles.sceneSub}>{layerEl === "Light" ? "PREMIUM LIGHT-ONLY · Monarchs guaranteed." : layerEl === "Dark" ? "CORRUPTED variants only." : "Common 40 · Uncommon 30 · Knight 20.9 · Noble 1 · Monarch 0.7"}</Text>
      </View>
      <View style={styles.gachaArt}>
        {lastPull ? (
          <View style={[styles.cardBig, { borderColor: rarityColor(lastPull.rarity) }]} testID="gacha-result-card">
            <Text style={[styles.cardRarity, { color: rarityColor(lastPull.rarity) }]}>★ {lastPull.rarity}</Text>
            <Text style={[styles.cardElement, { color: ElementColor[lastPull.element] }]}>◈ {lastPull.element}</Text>
            <Text style={styles.cardName}>{lastPull.name}</Text>
            <Text style={styles.cardMsg}>{lastPull.msg}</Text>
          </View>
        ) : <View style={[styles.cardBig, { borderColor: "#444" }]}><Text style={{ color: "#888", fontFamily: "monospace" }}>Press PULL to begin.</Text></View>}
      </View>
      <View style={{ gap: 8 }}>
        <Pressable testID="gacha-pull-btn" onPress={doPull} disabled={pulling || state.spaghettiCoins < PullCost} style={({ pressed }) => [styles.bigBtn, { backgroundColor: bannerColor, opacity: state.spaghettiCoins < PullCost ? 0.5 : 1 }, pressed && { transform: [{ scale: 0.97 }] }]}>
          <Text style={styles.bigBtnText}>{pulling ? "..." : `PULL (${PullCost} ◆)`}</Text>
        </Pressable>
        <Pressable testID="gacha-exit-btn" onPress={exit} style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.8 }]}><Text style={styles.smallBtnText}>LEAVE</Text></Pressable>
      </View>
    </View>
  );
}

// ============================================================
// DIALOG (realm NPCs)
// ============================================================
function DialogScene() {
  const state = useGameState();
  const npc = NpcDialogues[state.dialogNpc ?? "npc1"];
  const [lineIdx, setLineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const current = npc.lines[lineIdx] ?? "";
  useEffect(() => {
    setTyped(""); let i = 0;
    const id = setInterval(() => { i += 1; setTyped(current.slice(0, i)); if (i >= current.length) clearInterval(id); }, 24);
    return () => clearInterval(id);
  }, [current]);
  const next = () => {
    if (typed.length < current.length) { setTyped(current); return; }
    if (lineIdx + 1 < npc.lines.length) setLineIdx(lineIdx + 1);
    else setState((s) => { s.scene = "overworld"; s.dialogNpc = null; });
  };
  return (
    <View style={styles.sceneRoot}>
      <View style={styles.dialogTop}>
        <View style={styles.portrait}><Text style={{ fontSize: 36 }}>{state.dialogNpc === "npc1" ? "🍝" : "👁"}</Text></View>
        <Text style={styles.npcName}>{npc.npc}</Text>
      </View>
      <Pressable onPress={next} testID="dialog-next" style={styles.dialogBox}>
        <Text style={styles.dialogText} testID="dialog-text">{typed}<Text style={{ opacity: 0.6 }}>{typed.length < current.length ? "▮" : ""}</Text></Text>
        <Text style={styles.dialogHint}>{typed.length < current.length ? "" : lineIdx + 1 < npc.lines.length ? "▼ tap to continue" : "▼ tap to leave"}</Text>
      </Pressable>
    </View>
  );
}

// ============================================================
// VILLAGER DIALOG + QUEST
// ============================================================
function VillagerDialogScene() {
  const state = useGameState();
  const villager = findVillager(state.villagerId ?? "");
  const quest = villager?.questId ? state.quests.find((q) => q.id === villager.questId) : undefined;
  const [lineIdx, setLineIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const lines = villager?.lines ?? [];
  const current = lines[lineIdx] ?? "";
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false); setTyped(""); let i = 0;
    const id = setInterval(() => { i += 1; setTyped(current.slice(0, i)); if (i >= current.length) { clearInterval(id); setDone(true); } }, 24);
    return () => clearInterval(id);
  }, [current]);
  const next = () => {
    if (typed.length < current.length) { setTyped(current); setDone(true); return; }
    if (lineIdx + 1 < lines.length) setLineIdx(lineIdx + 1);
    else if (!quest) setState((s) => { s.scene = "overworld"; s.villagerId = null; });
  };
  if (!villager) return null;
  return (
    <View style={styles.sceneRoot}>
      <View style={styles.dialogTop}><View style={[styles.portrait, { backgroundColor: villager.color }]} /><Text style={styles.npcName}>{villager.name}</Text></View>
      <Pressable onPress={next} testID="villager-next" style={styles.dialogBox}>
        <Text style={styles.dialogText} testID="villager-text">{typed}<Text style={{ opacity: 0.6 }}>{typed.length < current.length ? "▮" : ""}</Text></Text>
        <Text style={styles.dialogHint}>{!done ? "" : lineIdx + 1 < lines.length ? "▼ tap to continue" : "▼ tap to leave"}</Text>
      </Pressable>
      {quest && lineIdx >= lines.length - 1 && done && (
        <View style={styles.questPanel} testID="quest-panel">
          <Text style={styles.questTitle}>QUEST · {quest.title}</Text>
          <Text style={styles.questDesc}>{quest.description}</Text>
          <Text style={styles.questDesc}>Objective: {quest.targetObjective} · Reward: {quest.reward} ◆</Text>
          <Text style={styles.questStatus}>Status: {quest.isClaimed ? "✓ CLAIMED" : quest.isCompleted ? "★ READY TO CLAIM" : quest.isAccepted ? "○ IN PROGRESS" : "— NOT ACCEPTED"}</Text>
          <View style={styles.questBtns}>
            {!quest.isAccepted && <SqBtn testID="quest-accept" label="ACCEPT" onPress={() => setState((s) => acceptQuest(s, quest.id))} />}
            {quest.isCompleted && !quest.isClaimed && <SqBtn testID="quest-claim" label="CLAIM" onPress={() => setState((s) => { const r = claimQuest(s, quest.id); s.flash = r.message; })} />}
            <SqBtn testID="quest-close" label="LEAVE" tone="ghost" onPress={() => setState((s) => { s.scene = "overworld"; s.villagerId = null; })} />
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================
// INVENTORY (with manual SAVE)
// ============================================================
function InventoryScene() {
  const state = useGameState();
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (state.flash) { const t = setTimeout(() => setState((s) => { s.flash = null; }), 2500); return () => clearTimeout(t); }
  }, [state.flash]);
  const sel = selected ? state.inventory.find((c) => c.id === selected) : null;
  const doSave = async () => {
    if (!state.activeSlot) return;
    const s = getState();
    await saveSlot(state.activeSlot, s);
    setState((st) => { st.flash = `Saved to Slot ${state.activeSlot}.`; });
  };
  return (
    <View style={styles.sceneRoot}>
      <Text style={styles.sceneTitle}>* HOME — INVENTORY</Text>
      {state.flash ? <Text style={styles.flash} testID="inv-flash">{state.flash}</Text> : null}
      <View style={styles.slotsRow}>
        <View style={styles.slot}><Text style={styles.slotLabel}>ATK</Text><Text style={styles.slotName} testID="slot-attack">{state.attackSlot ? state.attackSlot.name : "—"}</Text></View>
        <View style={styles.slot}><Text style={styles.slotLabel}>DEF</Text><Text style={styles.slotName} testID="slot-defense">{state.defenseSlot ? state.defenseSlot.name : "—"}</Text></View>
        <View style={styles.slot}><Text style={styles.slotLabel}>SUP</Text><Text style={styles.slotName} testID="slot-support">{state.supportSlot ? state.supportSlot.name : "—"}</Text></View>
      </View>
      <ScrollView style={styles.invList} contentContainerStyle={{ padding: 8 }} testID="inv-list">
        {state.inventory.map((c) => (
          <Pressable key={c.id} onPress={() => setSelected(c.id)} testID={`inv-item-${c.id}`} style={[styles.invRow, selected === c.id && { borderColor: "#facc15" }]}>
            <View style={[styles.rarityDot, { backgroundColor: rarityColor(c.rarity) }]} />
            <View style={[styles.rarityDot, { backgroundColor: ElementColor[c.element] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.invName}>{c.name}</Text>
              <Text style={styles.invMeta}>{inspect(c)}</Text>
              {selected === c.id ? (<><Text style={styles.invLore}>{`Design: ${c.design}`}</Text><Text style={styles.invLore}>{`Behavior: ${c.behavior}`}</Text></>) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {sel && (
        <View style={styles.invActions}>
          <Text style={styles.selName}>SELECTED: {sel.name}</Text>
          <View style={styles.invBtnRow}>
            {sel.role === "Attack" && <SqBtn testID="equip-attack" label="EQUIP ATK" onPress={() => setState((s) => { setAttackSlot(s, sel.id); })} />}
            {sel.role === "Support" && <SqBtn testID="equip-support" label="EQUIP SUP" onPress={() => setState((s) => { setSupportSlot(s, sel.id); })} />}
            {sel.role === "Defense" && <SqBtn testID="equip-defense" label="EQUIP DEF" onPress={() => setState((s) => { setDefenseSlot(s, sel.id); })} />}
            <SqBtn testID="evolve-btn" label="EVOLVE" onPress={() => setState((s) => { const r = evolveCharacter(s, sel.id); s.flash = r.message; })} />
            <SqBtn testID="trait-pull-btn" label={`TRAIT (${TraitPullCost})`} onPress={() => setState((s) => { const r = pullTrait(s, sel.id); s.flash = r.message; })} />
          </View>
        </View>
      )}
      <View style={styles.invFooter}>
        <Text style={styles.smallNote}>Quests active: {state.quests.filter((q) => q.isAccepted && !q.isClaimed).length}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <SqBtn testID="inv-save" label={state.activeSlot ? `SAVE → S${state.activeSlot}` : "NO SLOT"} onPress={doSave} />
          <SqBtn testID="inv-title" label="TITLE" tone="ghost" onPress={() => setState((s) => { s.scene = "title"; s.activeSlot = null; })} />
          <SqBtn testID="inv-exit" label="LEAVE" tone="ghost" onPress={() => setState((s) => { s.scene = "overworld"; })} />
        </View>
      </View>
    </View>
  );
}

// ============================================================
// COMBAT with Timing Attack
// ============================================================
function CombatScene() {
  const state = useGameState();
  const cs = state.combat;
  const scrollRef = useRef<ScrollView>(null);
  const [timing, setTiming] = useState<{ active: boolean; pos: number; dir: 1 | -1 }>({ active: false, pos: 0, dir: 1 });
  const timingRef = useRef(timing);
  timingRef.current = timing;

  // Animate timing bar
  useEffect(() => {
    if (!timing.active) return;
    let raf: number;
    const tick = () => {
      const cur = timingRef.current;
      let np = cur.pos + cur.dir * 0.018;
      let nd = cur.dir;
      if (np >= 1) { np = 1; nd = -1; }
      if (np <= 0) { np = 0; nd = 1; }
      setTiming({ active: true, pos: np, dir: nd });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timing.active]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [cs?.log.length]);

  if (!cs) return null;
  const enemyPct = Math.max(0, cs.enemy.currentHP / cs.enemyMaxHP);
  const heroMax = effectiveMaxHP(cs.primary);
  const heroPct = Math.max(0, cs.primary.currentHP / heroMax);

  const beginFight = () => setTiming({ active: true, pos: 0, dir: 1 });
  const stopFight = () => {
    const p = timingRef.current.pos;
    setTiming({ active: false, pos: p, dir: 1 });
    const { mult, tag } = timingMultiplier(p);
    setState((s) => combatFight(s, mult, tag));
  };

  return (
    <View style={styles.combatRoot} testID="combat-screen">
      <View style={styles.enemyZone}>
        <Text style={styles.enemyName}>{cs.enemy.name} · {cs.enemy.element}</Text>
        {cs.bubble && (
          <View style={styles.speechBubble} testID="enemy-bubble">
            <Text style={styles.speechText}>{cs.bubble}</Text>
            <View style={styles.speechTail} />
          </View>
        )}
        <EnemyBlob layer={cs.layer} element={cs.enemy.element} />
        <View style={styles.hpBar}><View style={[styles.hpFill, { width: `${enemyPct * 100}%`, backgroundColor: "#ef4444" }]} /></View>
        <Text style={styles.hpText}>{cs.enemy.currentHP} / {cs.enemyMaxHP}</Text>
      </View>
      <ScrollView ref={scrollRef} style={styles.combatBox} contentContainerStyle={{ padding: 12 }} testID="combat-log">
        {cs.log.map((l, i) => <Text key={i} style={styles.combatLine}>{l}</Text>)}
      </ScrollView>
      <View style={styles.heroBar}>
        <Text style={styles.heroLabel}>HP · ANGEL SAHUR · LIGHT</Text>
        <View style={styles.hpBar}><View style={[styles.hpFill, { width: `${heroPct * 100}%`, backgroundColor: "#facc15" }]} /></View>
        <Text style={styles.hpText}>{cs.primary.currentHP} / {heroMax}</Text>
      </View>

      {/* Timing attack gauge */}
      {timing.active && (
        <View style={styles.timingPanel} testID="timing-panel">
          <Text style={styles.timingLabel}>STOP IN THE CENTER!</Text>
          <View style={styles.timingTrack}>
            {/* zones */}
            <View style={[styles.timingZone, { left: "0%", width: "10%", backgroundColor: "#7f1d1d" }]} />
            <View style={[styles.timingZone, { left: "10%", width: "15%", backgroundColor: "#a16207" }]} />
            <View style={[styles.timingZone, { left: "25%", width: "20%", backgroundColor: "#22c55e" }]} />
            <View style={[styles.timingZone, { left: "45%", width: "10%", backgroundColor: "#facc15" }]} />
            <View style={[styles.timingZone, { left: "55%", width: "20%", backgroundColor: "#22c55e" }]} />
            <View style={[styles.timingZone, { left: "75%", width: "15%", backgroundColor: "#a16207" }]} />
            <View style={[styles.timingZone, { left: "90%", width: "10%", backgroundColor: "#7f1d1d" }]} />
            {/* indicator */}
            <View style={[styles.timingIndicator, { left: `${timing.pos * 100}%` }]} />
          </View>
          <Pressable testID="timing-stop" onPress={stopFight} style={({ pressed }) => [styles.stopBtn, pressed && { backgroundColor: "#facc15" }]}>
            <Text style={styles.stopBtnText}>STOP!</Text>
          </Pressable>
        </View>
      )}

      {cs.reaction && (
        <View style={styles.reactionPanel} testID="reaction-panel">
          <Text style={styles.reactionWarn}>⚠ {cs.reaction.warning}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable testID="react-success" onPress={() => setState((s) => resolveReaction(s, "success"))} style={({ pressed }) => [styles.reactBtn, { backgroundColor: cs.reaction!.type === "dodge" ? "#22d3ee" : "#facc15" }, pressed && { transform: [{ scale: 0.95 }] }]}>
              <Text style={[styles.reactBtnText, { color: "#000" }]}>{cs.reaction.type === "dodge" ? "DODGE!" : "PARRY!"}</Text>
            </Pressable>
            <Pressable testID="react-fail" onPress={() => setState((s) => resolveReaction(s, "fail"))} style={({ pressed }) => [styles.reactBtn, { borderWidth: 2, borderColor: "#ef4444", backgroundColor: "#000" }, pressed && { transform: [{ scale: 0.95 }] }]}>
              <Text style={[styles.reactBtnText, { color: "#ef4444" }]}>TAKE HIT</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.combatMenu} testID="combat-menu">
        <CmdBtn testID="cmd-fight"  label="FIGHT" onPress={beginFight} disabled={timing.active || !!cs.reaction} />
        <CmdBtn testID="cmd-act"    label="ACT"   onPress={() => setState((s) => combatAct(s))} disabled={timing.active || !!cs.reaction} />
        <CmdBtn testID="cmd-item"   label="ITEM"  onPress={() => setState((s) => combatItem(s))} disabled={timing.active || !!cs.reaction} />
        <CmdBtn testID="cmd-mercy"  label="MERCY" onPress={() => setState((s) => combatMercy(s))} disabled={timing.active || !!cs.reaction} />
      </View>
      <View style={styles.slotsRow}>
        <Text style={styles.slotMini}>ATK: {cs.attackSlot ? `${cs.attackSlot.name} [${cs.attackSlot.element}]` : "—"}</Text>
        <Text style={styles.slotMini}>SUP: {cs.supportSlot ? `${cs.supportSlot.name} [${cs.supportSlot.element}]` : "—"}</Text>
      </View>
    </View>
  );
}
function PuzzleScene() {
  const state = useGameState();
  const p = (() => {
    const all = Object.values(PUZZLES_BY_MAP).flat();
    return all.find((x) => !state.solvedPuzzles.includes(x.id)) ?? all[0];
  })();
  const [result, setResult] = useState<string | null>(null);
  if (!p) return null;
  const choose = (i: number) => {
    setState((s) => {
      const r = solvePuzzle(s, p.id, i);
      setResult(r.message);
      if (r.ok) setTimeout(() => setState((st) => { st.scene = "overworld"; }), 1200);
    });
  };
  return (
    <View style={styles.sceneRoot}>
      <Text style={styles.sceneTitle}>* PUZZLE — {p.kind === "riddle" ? "RIDDLE" : "PATTERN"}</Text>
      <View style={[styles.panel, { borderColor: "#22d3ee", marginTop: 12 }]} testID="puzzle-panel">
        <Text style={styles.dialogText}>{p.prompt}</Text>
        {p.choices.map((c, i) => (
          <Pressable key={i} testID={`puzzle-choice-${i}`} onPress={() => choose(i)} style={({ pressed }) => [styles.smallBtn, { marginTop: 8 }, pressed && { opacity: 0.7 }]}>
            <Text style={styles.smallBtnText}>{c}</Text>
          </Pressable>
        ))}
      </View>
      {result && <Text style={[styles.flash, { color: result.startsWith("✓") ? "#22c55e" : "#ef4444" }]} testID="puzzle-result">{result}</Text>}
      <SqBtn testID="puzzle-leave" label="LEAVE" tone="ghost" onPress={() => setState((s) => { s.scene = "overworld"; })} />
    </View>
  );
}

function CmdBtn({ label, onPress, testID, disabled }: { label: string; onPress: () => void; testID: string; disabled?: boolean }) {
  return (<Pressable testID={testID} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.cmdBtn, disabled && { opacity: 0.4 }, pressed && { backgroundColor: "#facc15" }]}><Text style={styles.cmdText}>* {label}</Text></Pressable>);
}
function EnemyBlob({ layer, element }: { layer: number; element: Element }) {
  const sz = 60 + layer * 4;
  const color = ElementColor[element];
  return (
    <View style={{ width: sz, height: sz, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", inset: 0 as never, backgroundColor: color, borderRadius: 4, borderWidth: 3, borderColor: "#000" }} />
      <View style={{ width: 10, height: 10, backgroundColor: "#000", position: "absolute", left: sz * 0.25, top: sz * 0.3 }} />
      <View style={{ width: 10, height: 10, backgroundColor: "#000", position: "absolute", right: sz * 0.25, top: sz * 0.3 }} />
      <View style={{ width: sz * 0.5, height: 4, backgroundColor: "#000", position: "absolute", bottom: sz * 0.3 }} />
    </View>
  );
}

// ============================================================
// RESULT
// ============================================================
function ResultScene({ win }: { win: boolean }) {
  const state = useGameState();
  return (
    <View style={[styles.sceneRoot, { alignItems: "center", justifyContent: "center" }]}>
      <Text style={[styles.bigResult, { color: win ? "#facc15" : "#ef4444" }]}>{win ? "* VICTORY *" : "* GAME OVER *"}</Text>
      <Text style={styles.resultSub}>Layer {state.combat?.layer} — {state.combat?.enemy.name}</Text>
      <ScrollView style={{ maxHeight: 240, marginTop: 16 }} contentContainerStyle={{ padding: 12 }}>
        {(state.combat?.log ?? []).slice(-12).map((l, i) => <Text key={i} style={styles.combatLine}>{l}</Text>)}
      </ScrollView>
      <Pressable testID="result-exit" onPress={() => setState((s) => closeCombat(s))} style={({ pressed }) => [styles.bigBtn, { backgroundColor: "#facc15", marginTop: 24 }, pressed && { transform: [{ scale: 0.97 }] }]}>
        <Text style={[styles.bigBtnText, { color: "#000" }]}>RETURN TO REALM</Text>
      </Pressable>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },

  // Title
  titleRoot: { flex: 1, backgroundColor: "#0b0d14", padding: 24, alignItems: "stretch", justifyContent: "center" },
  titleBrand: { color: "#facc15", fontFamily: "monospace", fontSize: 42, fontWeight: "900", letterSpacing: 4, textAlign: "center" },
  titleBrandSub: { color: "#94a3b8", fontFamily: "monospace", fontSize: 12, letterSpacing: 4, textAlign: "center", marginTop: 4 },
  titleBtn: { marginTop: 12, paddingVertical: 16, borderWidth: 3, borderColor: "#facc15", backgroundColor: "#000", alignItems: "center" },
  titleBtnText: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", letterSpacing: 3, fontSize: 16 },
  titleBtnGhost: { marginTop: 16, paddingVertical: 10, alignItems: "center" },
  titleBtnGhostText: { color: "#94a3b8", fontFamily: "monospace", letterSpacing: 2, fontSize: 12 },
  titleHint: { color: "#475569", fontFamily: "monospace", fontSize: 10, textAlign: "center", marginTop: 24 },
  slotCard: { borderWidth: 2, borderColor: "#facc15", padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#000" },
  slotTitle: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", letterSpacing: 2, fontSize: 14 },
  slotSub: { color: "#cbd5e1", fontFamily: "monospace", fontSize: 10, marginTop: 4 },
  slotBtn: { backgroundColor: "#facc15", paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: "#000" },
  slotBtnText: { color: "#000", fontFamily: "monospace", fontWeight: "900", fontSize: 12 },
  slotBtnGhost: { borderWidth: 2, borderColor: "#ef4444", paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "#000" },
  slotBtnGhostText: { color: "#ef4444", fontFamily: "monospace", fontWeight: "900", fontSize: 10 },

  // HUD
  overworld: { flex: 1, backgroundColor: "#0b1220" },
  hud: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: "#facc15" },
  hudTitle: { color: "#facc15", fontFamily: "monospace", fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  hudPills: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  pill: { backgroundColor: "#1f2937", borderWidth: 2, borderColor: "#facc15", paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { color: "#facc15", fontFamily: "monospace", fontSize: 10, fontWeight: "800" },
  flashBar: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#7f1d1d" },
  flashText: { color: "#fff", fontFamily: "monospace", fontSize: 12, fontWeight: "800" },

  mapWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  map: { borderWidth: 3, borderColor: "#000" },
  player: { width: TILE - 4, height: TILE - 4, position: "absolute" },
  bldgLabel: { color: "#fff", fontFamily: "monospace", fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  questBadge: { position: "absolute", right: -2, top: -6, width: 14, height: 14, backgroundColor: "#facc15", borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center" },
  questBadgeText: { fontSize: 9, fontWeight: "900", color: "#000", fontFamily: "monospace" },

  controlsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 16, alignItems: "center", marginTop: 8 },
  dpad: { alignItems: "center" },
  dpadRow: { flexDirection: "row" },
  dpadSpacer: { width: 44 },
  dpadCenter: { width: 44, height: 44, backgroundColor: "#1f2937", borderWidth: 2, borderColor: "#000" },
  dpadBtn: { width: 44, height: 44, backgroundColor: "#facc15", borderWidth: 2, borderColor: "#000", alignItems: "center", justifyContent: "center" },
  dpadText: { fontFamily: "monospace", fontWeight: "900", fontSize: 20, color: "#000" },
  sideButtons: { flex: 1, gap: 8 },
  sqBtn: { borderWidth: 2, borderColor: "#000", paddingVertical: 10, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  sqBtnText: { fontFamily: "monospace", fontWeight: "900", fontSize: 12, textAlign: "center", letterSpacing: 1 },
  hint: { color: "#94a3b8", fontFamily: "monospace", fontSize: 10, textAlign: "center", marginTop: 6 },

  // Scenes shared
  sceneRoot: { flex: 1, backgroundColor: "#000", padding: 16 },
  sceneTitle: { color: "#facc15", fontFamily: "monospace", fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  sceneSub: { color: "#94a3b8", fontFamily: "monospace", fontSize: 11, marginTop: 4 },
  panel: { borderWidth: 3, padding: 12, backgroundColor: "#0b1220" },

  // Gacha
  gachaArt: { flex: 1, alignItems: "center", justifyContent: "center", marginVertical: 16 },
  cardBig: { width: "100%", padding: 20, borderWidth: 4, backgroundColor: "#0b1220", alignItems: "center" },
  cardRarity: { fontFamily: "monospace", fontWeight: "900", fontSize: 13, letterSpacing: 2 },
  cardElement: { fontFamily: "monospace", fontWeight: "900", fontSize: 12, letterSpacing: 2, marginTop: 4 },
  cardName: { color: "#fff", fontFamily: "monospace", fontWeight: "900", fontSize: 20, marginTop: 8, textAlign: "center" },
  cardMsg: { color: "#cbd5e1", fontFamily: "monospace", fontSize: 11, marginTop: 8, textAlign: "center" },
  bigBtn: { paddingVertical: 16, alignItems: "center", borderWidth: 3, borderColor: "#000" },
  bigBtnText: { color: "#fff", fontFamily: "monospace", fontWeight: "900", fontSize: 16, letterSpacing: 2 },
  smallBtn: { paddingVertical: 10, alignItems: "center", borderWidth: 2, borderColor: "#facc15", backgroundColor: "#000" },
  smallBtnText: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", fontSize: 12, letterSpacing: 1 },

  // Dialog
  dialogTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  portrait: { width: 64, height: 64, backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  npcName: { color: "#fff", fontFamily: "monospace", fontWeight: "900", fontSize: 16 },
  dialogBox: { borderWidth: 3, borderColor: "#fff", padding: 16, minHeight: 140, backgroundColor: "#000" },
  dialogText: { color: "#fff", fontFamily: "monospace", fontSize: 14, lineHeight: 22 },
  dialogHint: { color: "#facc15", fontFamily: "monospace", fontSize: 10, marginTop: 12, textAlign: "right" },
  questPanel: { borderWidth: 3, borderColor: "#facc15", padding: 12, marginTop: 12 },
  questTitle: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", fontSize: 13, letterSpacing: 2 },
  questDesc: { color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 6 },
  questStatus: { color: "#22d3ee", fontFamily: "monospace", fontSize: 11, marginTop: 8 },
  questBtns: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },

  // Inventory
  flash: { color: "#facc15", fontFamily: "monospace", marginTop: 8, marginBottom: 4 },
  slotsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  slot: { flex: 1, borderWidth: 2, borderColor: "#facc15", padding: 8, backgroundColor: "#0b1220" },
  slotLabel: { color: "#facc15", fontFamily: "monospace", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  slotName: { color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 4 },
  slotMini: { color: "#fff", fontFamily: "monospace", fontSize: 10, padding: 6 },
  invList: { flex: 1, marginTop: 12, borderWidth: 2, borderColor: "#374151" },
  invRow: { flexDirection: "row", padding: 8, gap: 6, alignItems: "center", borderWidth: 2, borderColor: "transparent", marginBottom: 4, backgroundColor: "#0b1220" },
  rarityDot: { width: 12, height: 12, borderWidth: 2, borderColor: "#000" },
  invName: { color: "#fff", fontFamily: "monospace", fontWeight: "900", fontSize: 12 },
  invMeta: { color: "#94a3b8", fontFamily: "monospace", fontSize: 9, marginTop: 2 },
  invLore: { color: "#a3e635", fontFamily: "monospace", fontSize: 9, marginTop: 2 },
  invActions: { marginTop: 8, borderWidth: 2, borderColor: "#facc15", padding: 8 },
  selName: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", fontSize: 12, marginBottom: 6 },
  invBtnRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  invFooter: { marginTop: 8, gap: 6 },
  smallNote: { color: "#94a3b8", fontFamily: "monospace", fontSize: 10 },

  // Combat
  combatRoot: { flex: 1, backgroundColor: "#000", padding: 12 },
  enemyZone: { alignItems: "center", paddingVertical: 12 },
  enemyName: { color: "#fff", fontFamily: "monospace", fontWeight: "900", fontSize: 14, marginBottom: 8 },
  hpBar: { width: "100%", height: 10, backgroundColor: "#1f2937", borderWidth: 2, borderColor: "#fff", marginTop: 6 },
  hpFill: { height: "100%" },
  hpText: { color: "#fff", fontFamily: "monospace", fontSize: 10, marginTop: 2 },
  combatBox: { flex: 1, borderWidth: 3, borderColor: "#fff", backgroundColor: "#000", marginTop: 8 },
  combatLine: { color: "#fff", fontFamily: "monospace", fontSize: 11, lineHeight: 16 },
  heroBar: { marginTop: 8, padding: 6, borderWidth: 2, borderColor: "#facc15" },
  heroLabel: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", fontSize: 10 },
  combatMenu: { flexDirection: "row", gap: 6, marginTop: 8 },
  cmdBtn: { flex: 1, borderWidth: 2, borderColor: "#facc15", paddingVertical: 10, alignItems: "center", backgroundColor: "#000" },
  cmdText: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", fontSize: 12, letterSpacing: 1 },

  // Timing
  timingPanel: { marginTop: 8, padding: 8, borderWidth: 3, borderColor: "#facc15", backgroundColor: "#000" },
  timingLabel: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", fontSize: 11, marginBottom: 8, textAlign: "center", letterSpacing: 2 },
  timingTrack: { height: 24, backgroundColor: "#0b1220", borderWidth: 2, borderColor: "#fff", position: "relative", overflow: "hidden" },
  timingZone: { position: "absolute", top: 0, bottom: 0, opacity: 0.6 },
  timingIndicator: { position: "absolute", top: -2, bottom: -2, width: 4, backgroundColor: "#fff", borderWidth: 1, borderColor: "#000", marginLeft: -2 },
  stopBtn: { marginTop: 8, paddingVertical: 12, borderWidth: 2, borderColor: "#facc15", backgroundColor: "#000", alignItems: "center" },
  stopBtnText: { color: "#facc15", fontFamily: "monospace", fontWeight: "900", fontSize: 16, letterSpacing: 3 },

  // Result
  bigResult: { fontFamily: "monospace", fontSize: 28, fontWeight: "900", letterSpacing: 3 },
  resultSub: { color: "#fff", fontFamily: "monospace", marginTop: 12 },

  // Speech bubble + reaction
  speechBubble: { backgroundColor: "#fff", borderWidth: 3, borderColor: "#000", padding: 10, marginBottom: 10, maxWidth: 320, position: "relative" },
  speechText: { color: "#000", fontFamily: "monospace", fontWeight: "800", fontSize: 12, lineHeight: 18, textAlign: "center" },
  speechTail: { position: "absolute", bottom: -10, left: "50%", marginLeft: -8, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: "#000" },
  reactionPanel: { marginTop: 8, padding: 10, borderWidth: 3, borderColor: "#ef4444", backgroundColor: "#1f0a0a" },
  reactionWarn: { color: "#fca5a5", fontFamily: "monospace", fontWeight: "900", fontSize: 12, textAlign: "center", letterSpacing: 1 },
  reactBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderWidth: 2, borderColor: "#000" },
  reactBtnText: { fontFamily: "monospace", fontWeight: "900", fontSize: 14, letterSpacing: 2 },
});
