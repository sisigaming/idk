// Tiny pub-sub store for game state. Avoids context boilerplate.
import { useEffect, useState } from "react";
import { GameState, createGameState } from "./engine";

let state: GameState = createGameState();
const listeners = new Set<() => void>();

export const getState = () => state;

export const setState = (mutator: (s: GameState) => void) => {
  mutator(state);
  // Trigger re-render in subscribers
  listeners.forEach((l) => l());
};

export const replaceState = (next: GameState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const useGameState = (): GameState => {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
};
