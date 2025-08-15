import { CONFIG } from "./config";
import { state } from "./state";
import type { Tile } from "./types";

export function saveGame() {
  const flat: any[] = [];
  for (let y=0;y<state.map.h;y++){
    for(let x=0;x<state.map.w;x++){
      const t = state.map.tiles[y][x];
      flat.push({t:t.type, n: t.node ? {k:t.node.kind, c:t.node.charges, r:t.node.respawnAt} : null});
    }
  }
  const data = {
    v: CONFIG.VERSION,
    seed: state.seed, turn: state.turn, day: state.day,
    tideNext: state.tideNext,
    player: {
      x: state.player.x, y: state.player.y,
      health: state.player.health, stamina: state.player.stamina, hunger: state.player.hunger,
      hasSeen: [...state.player.hasSeen]
    },
    map: {w:state.map.w, h:state.map.h, a:flat},
    entities: state.entities,
    structures: state.structures,
    flags: state.flags
  };
  localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
}

export function loadGame(): boolean {
  const raw = localStorage.getItem(CONFIG.SAVE_KEY);
  if (!raw) return false;
  try{
    const s = JSON.parse(raw);
    state.seed = s.seed;
    state.turn = s.turn; state.day = s.day; state.tideNext = s.tideNext;
    state.player.x = s.player.x; state.player.y = s.player.y;
    state.player.health = s.player.health; state.player.stamina = s.player.stamina; state.player.hunger = s.player.hunger;
    state.player.hasSeen = new Set<number>(s.player.hasSeen||[]);
    // map
    state.map.w = s.map.w; state.map.h = s.map.h;
    const tiles: Tile[][] = new Array(s.map.h);
    let i=0;
    for (let y=0;y<s.map.h;y++){
      tiles[y] = new Array(s.map.w);
      for (let x=0;x<s.map.w;x++){
        const e = s.map.a[i++];
        tiles[y][x] = { type:e.t, node: e.n ? {kind:e.n.k, charges:e.n.c, respawnAt:e.n.r} : undefined };
      }
    }
    state.map.tiles = tiles;
    state.entities = s.entities||[];
    state.structures = s.structures||[];
    state.flags = s.flags||{won:false,dead:false,canWin:false};
    return true;
  }catch{
    return false;
  }
}
