import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  addToTeam,
  allLayers,
  createGameState,
  GameState,
  pullGacha,
  startBattle,
} from "@/src/game/engine";
import { NpcDialogues, PullCost } from "@/src/game/data";

// ============================================================
// Console-style mock output screen
// ============================================================

type LogLine = { id: string; kind: "info" | "ok" | "warn" | "err" | "npc" | "head"; text: string };

const nowId = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export default function Index() {
  const stateRef = useRef<GameState>(createGameState(50));
  const [lines, setLines] = useState<LogLine[]>([
    { id: nowId(), kind: "head", text: "🍝 BRAINROT RPG // STATE ENGINE v0.1" },
    { id: nowId(), kind: "info", text: "Boot sequence complete. Spaghetti Coins: 50." },
    { id: nowId(), kind: "info", text: "Tap a button below to run the engine." },
  ]);
  const scrollRef = useRef<ScrollView>(null);

  const push = useCallback((kind: LogLine["kind"], text: string) => {
    setLines((prev) => [...prev, { id: nowId(), kind, text }]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const coinsLabel = useMemo(
    () => `🪙 ${stateRef.current.spaghettiCoins}`,
    // re-evaluate when lines change so header refreshes after pulls
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines],
  );
  const teamLabel = `👥 ${stateRef.current.playerTeam.length}/3`;
  const invLabel = `🎒 ${stateRef.current.inventory.length}`;

  const doPull = useCallback(
    (banner: "Support" | "Defense" | "Attack") => {
      const r = pullGacha(stateRef.current, banner);
      push(r.success ? "ok" : "warn", r.message);
      if (r.success && r.character) {
        // Auto-fill the team up to 3
        if (stateRef.current.playerTeam.length < 3) {
          const t = addToTeam(stateRef.current, r.character.id);
          if (t.ok) push("info", `  ↳ ${t.message}`);
        }
      }
    },
    [push],
  );

  const doNpcChat = useCallback(() => {
    const npc = NpcDialogues[Math.floor(Math.random() * NpcDialogues.length)];
    const line = npc.lines[Math.floor(Math.random() * npc.lines.length)];
    push("npc", `${npc.npc}: "${line}"`);
  }, [push]);

  const doShowLayers = useCallback(() => {
    push("head", "🗺️  LAYERS OF HELL");
    allLayers().forEach((l) => {
      const tag = l.layer === 9 ? "  ⚠️  FINAL" : "";
      push(
        "info",
        `  L${l.layer} — ${l.title} [enemies: ${l.enemies.length}, total HP ${l.enemies.reduce((s, e) => s + e.maxHP, 0)}]${tag}`,
      );
    });
  }, [push]);

  const doBattle = useCallback(
    (layerNum: number) => {
      const s = stateRef.current;
      if (s.playerTeam.length === 0) {
        push("warn", "No active team. Pull at least one character first.");
        return;
      }
      const layer = allLayers().find((l) => l.layer === layerNum);
      if (!layer) return;
      push("head", `⚔️  ENGAGING LAYER ${layer.layer} — ${layer.title}`);
      push(
        "info",
        `  Player squad: ${s.playerTeam.map((c) => `${c.name}(${c.role})`).join(", ")}`,
      );
      push(
        "info",
        `  Enemy squad: ${layer.enemies.map((e) => `${e.name}[HP ${e.maxHP}]`).join(", ")}`,
      );
      const res = startBattle(s.playerTeam, layer.enemies);
      res.log.forEach((line) => push("info", `  ${line}`));
      push(
        res.winner === "Player" ? "ok" : res.winner === "Enemy" ? "err" : "warn",
        `RESULT: ${res.winner} (${res.rounds} rounds)`,
      );
    },
    [push],
  );

  const doDemoRun = useCallback(() => {
    // Reset + a scripted mock console output
    stateRef.current = createGameState(50);
    setLines([
      { id: nowId(), kind: "head", text: "🍝 BRAINROT RPG // DEMO RUN" },
      { id: nowId(), kind: "info", text: "State reset. Coins: 50." },
    ]);
    setTimeout(() => {
      push("head", "── GACHA PHASE ──");
      ["Attack", "Defense", "Support"].forEach((b) =>
        doPull(b as "Attack" | "Defense" | "Support"),
      );
      push("head", "── NPC CHATTER ──");
      doNpcChat();
      push("head", "── BATTLE LAYOUT ──");
      doBattle(1);
    }, 50);
  }, [doBattle, doNpcChat, doPull, push]);

  const reset = useCallback(() => {
    stateRef.current = createGameState(50);
    setLines([
      { id: nowId(), kind: "head", text: "🍝 BRAINROT RPG // STATE ENGINE v0.1" },
      { id: nowId(), kind: "info", text: "State reset. Coins: 50." },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="screen-root">
      <View style={styles.header} testID="hud-bar">
        <Text style={styles.title}>BRAINROT://</Text>
        <View style={styles.hudRow}>
          <View style={styles.hudPill}><Text style={styles.hudText} testID="hud-coins">{coinsLabel}</Text></View>
          <View style={styles.hudPill}><Text style={styles.hudText} testID="hud-team">{teamLabel}</Text></View>
          <View style={styles.hudPill}><Text style={styles.hudText} testID="hud-inventory">{invLabel}</Text></View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.console}
        contentContainerStyle={styles.consoleContent}
        testID="console-output"
      >
        {lines.map((l) => (
          <Text key={l.id} style={[styles.line, styleFor(l.kind)]}>
            {prefixFor(l.kind)} {l.text}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <Text style={styles.controlsHint}>Cost per pull: {PullCost} 🪙</Text>
        <View style={styles.row}>
          <Btn label="Pull ATK" color="#ff5d5d" onPress={() => doPull("Attack")} testID="btn-pull-attack" />
          <Btn label="Pull DEF" color="#5d9bff" onPress={() => doPull("Defense")} testID="btn-pull-defense" />
          <Btn label="Pull SUP" color="#c084fc" onPress={() => doPull("Support")} testID="btn-pull-support" />
        </View>
        <View style={styles.row}>
          <Btn label="Layers" color="#ffd166" onPress={doShowLayers} testID="btn-show-layers" />
          <Btn label="Battle L1" color="#22c55e" onPress={() => doBattle(1)} testID="btn-battle-l1" />
          <Btn label="Boss L9" color="#000" outline onPress={() => doBattle(9)} testID="btn-battle-l9" />
        </View>
        <View style={styles.row}>
          <Btn label="NPC Chat" color="#fb923c" onPress={doNpcChat} testID="btn-npc-chat" />
          <Btn label="DEMO RUN" color="#ec4899" onPress={doDemoRun} testID="btn-demo-run" />
          <Btn label="Reset" color="#475569" onPress={reset} testID="btn-reset" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Btn({
  label,
  color,
  onPress,
  outline,
  testID,
}: {
  label: string;
  color: string;
  onPress: () => void;
  outline?: boolean;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        outline
          ? { backgroundColor: "#101216", borderColor: color, borderWidth: 2 }
          : { backgroundColor: color },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.85 },
      ]}
    >
      <Text style={[styles.btnText, outline && { color }]}>{label}</Text>
    </Pressable>
  );
}

const prefixFor = (k: LogLine["kind"]) => {
  switch (k) {
    case "ok":
      return "✓";
    case "warn":
      return "!";
    case "err":
      return "✗";
    case "npc":
      return "💬";
    case "head":
      return "▌";
    default:
      return "›";
  }
};

const styleFor = (k: LogLine["kind"]) => {
  switch (k) {
    case "ok":
      return { color: "#7CFFB2" };
    case "warn":
      return { color: "#FFD166" };
    case "err":
      return { color: "#FF6B6B" };
    case "npc":
      return { color: "#FFA1F5", fontStyle: "italic" as const };
    case "head":
      return { color: "#FFE66D", fontWeight: "800" as const };
    default:
      return { color: "#C8F4FF" };
  }
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0b0f" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1f28",
    backgroundColor: "#0a0b0f",
  },
  title: {
    color: "#ff66c4",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  hudRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  hudPill: {
    backgroundColor: "#181a22",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2a2f3d",
  },
  hudText: { color: "#e6e9ef", fontFamily: "monospace", fontWeight: "700" },
  console: {
    flex: 1,
    backgroundColor: "#06070a",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1c1f28",
  },
  consoleContent: { padding: 12, paddingBottom: 24 },
  line: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 2,
  },
  controls: {
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1c1f28",
    backgroundColor: "#0a0b0f",
  },
  controlsHint: {
    color: "#7b8294",
    fontFamily: "monospace",
    fontSize: 11,
    textAlign: "center",
  },
  row: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#0a0b0f",
    fontWeight: "900",
    fontFamily: "monospace",
    fontSize: 13,
    letterSpacing: 1,
  },
});
