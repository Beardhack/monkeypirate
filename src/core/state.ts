import { CONFIG } from "./config";
import { GameState } from "./types";

export const state: GameState = {
  seed: "island-0001",
  turn: 0,
  day: 1,
  tideNext: 0,
  player: {
    x: 0, y: 0,
    health: CONFIG.HEALTH_MAX,
    stamina: CONFIG.STAM_MAX,
    hunger: CONFIG.HUNGER_MAX,
    hasSeen: new Set<number>(),
  },
  map: { w: CONFIG.MAP_W, h: CONFIG.MAP_H, tiles: [] },
  entities: [],
  structures: [],
  flags: { won:false, dead:false, canWin:false },
  settings: { reveal:false, mute:false, shake:false },
};

export const dirty = { all:true, hud:true, log:false };
export const logEl = document.getElementById("log") as HTMLDivElement;

export function log(msg: string, cls="") {
  if (!logEl) return;
  const div = document.createElement("div");
  if (cls) div.className = cls;
  div.textContent = msg;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}
