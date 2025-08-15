import { Application, Container, Sprite, Texture } from "pixi.js";
import { CONFIG } from "../core/config";
import { state, dirty, log } from "../core/state";
import { TileType } from "../core/types";
import { SimpleAtlas } from "../core/atlas";

/** M1: PixiJS renderer that preserves M0b’s public API:
 *  - export function startRenderLoop()
 *  - export function gatherHere()
 *
 * Uses /public/assets/* and atlas_map.json. Keeps all gameplay logic identical.
 */

// Sprite source tile size & scale (art is 16×16; on-screen scale 4× for readability)
const SPRITE_TILE = 16;
const SCALE = 4;

// Pixi singletons
let app: Application | null = null;
let world: Container | null = null;
const layers = {
  tiles: new Container(),
  nodes: new Container(),
  entities: new Container(),
  overlay: new Container(),
};

// Pools
const tilePool = new Map<string, Sprite>();
const nodePool = new Map<string, Sprite>();
const entityPool = new Map<string, Sprite>();

// Camera/view (same math as M0b; we just draw with Pixi)
const view = { x: 0, y: 0, w: CONFIG.VIEW_W, h: CONFIG.VIEW_H };

// Atlas
let atlas: SimpleAtlas | null = null;

// Tile type → atlas key
const TILE_NAME: Record<number, string> = {
  [TileType.WATER]: "water",
  [TileType.SAND]: "sand",
  [TileType.JUNGLE]: "jungle",
  [TileType.ROCKY]: "rocky",
  [TileType.SHIPWRECK]: "shipwreck",
  [TileType.HIGH]: "high",
};

// Node kind → atlas key(s)
const NODE_NAME: Record<string, string[]> = {
  palm: ["palm", "props.png/palm"],
  banana: ["banana", "props.png/banana"],
  vines: ["vines", "props.png/vines"],
  rock: ["rocks", "props.png/rocks"], // our sprite is named "rocks"
  drift: ["driftwood", "props.png/driftwood"],
  shell: ["shells", "props.png/shells"],
  wreck: ["wreck", "props.png/wreck"],
};

// Fallback tints (if a texture isn’t found, you still see something)
const FALLBACK: Record<string, number> = {
  water: 0x2b5ea7,
  sand: 0xe8d7a5,
  jungle: 0x276f3b,
  rocky: 0x807d7a,
  shipwreck: 0x6f4f28,
  high: 0x8c8769,
  node: 0xffffff,
  player: 0xffd966,
  crab: 0xd9534f,
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function centerCamera() {
  view.x = clamp(state.player.x - Math.floor(view.w / 2), 0, state.map.w - view.w);
  view.y = clamp(state.player.y - Math.floor(view.h / 2), 0, state.map.h - view.h);
}

async function ensurePixi() {
  if (app) return;

  app = new Application();
  const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement | null;

  await app.init({
    view: canvas ?? undefined,
    backgroundAlpha: 0,
    antialias: false,
    resolution: 1,
  });

  world = new Container();
  world.scale.set(SCALE, SCALE);
  app.stage.addChild(world);

  layers.entities.sortableChildren = true;
  world.addChild(layers.tiles);
  world.addChild(layers.nodes);
  world.addChild(layers.entities);
  world.addChild(layers.overlay);

  // Load atlas
  atlas = new SimpleAtlas();
  await atlas.load("/assets/atlas_map.json");

  // Crisp pixels
  (app.renderer.canvas as HTMLCanvasElement).style.imageRendering = "pixelated";

  resizeRenderer();
}

function resizeRenderer() {
  if (!app || !world) return;
  const w = view.w * SPRITE_TILE * SCALE;
  const h = view.h * SPRITE_TILE * SCALE;
  app.renderer.resize(w, h);
}

function ensureSprite(pool: Map<string, Sprite>, layer: Container, key: string): Sprite {
  let sp = pool.get(key);
  if (!sp) {
    sp = new Sprite(Texture.WHITE);
    sp.width = SPRITE_TILE;
    sp.height = SPRITE_TILE;
    layer.addChild(sp);
    pool.set(key, sp);
  }
  return sp;
}
function prune(pool: Map<string, Sprite>, layer: Container, keep: Set<string>) {
  for (const [k, sp] of pool) {
    if (!keep.has(k)) {
      layer.removeChild(sp);
      sp.destroy();
      pool.delete(k);
    }
  }
}

function drawTiles() {
  if (!world || !atlas) return;
  const keep = new Set<string>();

  for (let sy = 0; sy < view.h; sy++) {
    for (let sx = 0; sx < view.w; sx++) {
      const x = view.x + sx, y = view.y + sy;
      const t = state.map.tiles[y]?.[x];
      const key = `${x},${y}`;
      const sp = ensureSprite(tilePool, layers.tiles, key);

      const tileName = TILE_NAME[t?.type ?? TileType.WATER] || "water";
      const tex = atlas.get(tileName);
      if (tex) { sp.texture = tex; sp.tint = 0xffffff; sp.alpha = 1; }
      else { sp.texture = Texture.WHITE; sp.tint = FALLBACK[tileName] ?? 0x000000; sp.alpha = 1; }

      sp.x = x * SPRITE_TILE;
      sp.y = y * SPRITE_TILE;
      keep.add(key);
    }
  }
  prune(tilePool, layers.tiles, keep);
}

function drawNodes() {
  if (!world || !atlas) return;
  const keep = new Set<string>();

  for (let sy = 0; sy < view.h; sy++) {
    for (let sx = 0; sx < view.w; sx++) {
      const x = view.x + sx, y = view.y + sy;
      const t = state.map.tiles[y]?.[x];
      if (!t?.node || t.node.charges <= 0) continue;

      const key = `N:${x},${y}`;
      const sp = ensureSprite(nodePool, layers.nodes, key);

      const candidates = NODE_NAME[t.node.kind] || [];
      const tex = candidates.length ? atlas.try(...candidates) : null;

      if (tex) { sp.texture = tex; sp.tint = 0xffffff; sp.alpha = 1; }
      else { sp.texture = Texture.WHITE; sp.tint = FALLBACK.node; sp.alpha = 0.85; }

      sp.x = x * SPRITE_TILE;
      sp.y = y * SPRITE_TILE;
      keep.add(key);
    }
  }
  prune(nodePool, layers.nodes, keep);
}

function drawEntities() {
  if (!world || !atlas) return;
  const keep = new Set<string>();

  // Player
  {
    const id = "player";
    let sp = entityPool.get(id);
    if (!sp) { sp = new Sprite(Texture.WHITE); layers.entities.addChild(sp); entityPool.set(id, sp); }
    const playerTex = atlas.try("monkey_down_0", "characters.png/monkey_down_0");
    if (playerTex) { sp.texture = playerTex; sp.tint = 0xffffff; sp.alpha = 1; }
    else { sp.texture = Texture.WHITE; sp.tint = FALLBACK.player; }
    sp.width = SPRITE_TILE; sp.height = SPRITE_TILE;
    sp.x = state.player.x * SPRITE_TILE;
    sp.y = state.player.y * SPRITE_TILE;
    sp.zIndex = state.player.y;
    keep.add(id);
  }

  // Crabs (if any)
  for (let i = 0; i < state.entities.length; i++) {
    const e = state.entities[i];
    const id = `crab:${i}`;
    let sp = entityPool.get(id);
    if (!sp) { sp = new Sprite(Texture.WHITE); layers.entities.addChild(sp); entityPool.set(id, sp); }
    const crabTex = atlas.try("crab_0", "characters.png/crab_0");
    if (crabTex) { sp.texture = crabTex; sp.tint = 0xffffff; sp.alpha = 1; }
    else { sp.texture = Texture.WHITE; sp.tint = FALLBACK.crab; }
    sp.width = SPRITE_TILE; sp.height = SPRITE_TILE;
    sp.x = e.x * SPRITE_TILE;
    sp.y = e.y * SPRITE_TILE;
    sp.zIndex = e.y;
    keep.add(id);
  }

  // Prune despawned
  for (const [id, sp] of entityPool) {
    if (!keep.has(id)) {
      layers.entities.removeChild(sp);
      sp.destroy();
      entityPool.delete(id);
    }
  }
}

function drawFrame() {
  if (!app || !world) return;
  if (!dirty.all) return;

  centerCamera();
  resizeRenderer();

  // Position world so (view.x, view.y) is top-left at canvas origin
  world.position.set(-view.x * SPRITE_TILE, -view.y * SPRITE_TILE);

  drawTiles();
  drawNodes();
  drawEntities();

  dirty.all = false;
}

/** Public API — same names as M0b */
export function startRenderLoop() {
  (async () => {
    await ensurePixi();
    const step = () => { drawFrame(); requestAnimationFrame(step); };
    step();
  })();
}

export function gatherHere() {
  const t = state.map.tiles[state.player.y][state.player.x];
  if (!t.node || t.node.charges <= 0) { log("Nothing here to gather.", "muted"); return; }
  const yields: Record<string, string> = {
    palm: "coconut", banana: "banana", vines: "vines",
    rock: "rock", drift: "wood", shell: "shells", wreck: "scrap"
  };
  const item = yields[t.node.kind] || t.node.kind;
  t.node.charges -= 1;
  log(`Gathered ${item}.`, "ok");
  dirty.all = true;
}
