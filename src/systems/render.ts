// Pixi-based renderer with the same public API as before:
//   - startRenderLoop(...args: any[]): void
//   - gatherHere(...args: any[]): void
//
// Responsibilities:
// - Load /public/assets + atlas_map.json via the Atlas loader
// - Resolve assets with import.meta.env.BASE_URL
// - Draw order: tiles -> nodes -> entities (player + crabs)
// - 16x16 tiles at 4x scale (from CONFIG if provided; otherwise defaults)
// - Fallback tinted rects when an atlas key is missing (no blank tiles, no console errors)
// - Camera centers on player
//
// This module is intentionally defensive about the shape of the game state to avoid
// coupling. It looks for common fields (map tiles, nodes, player, crabs) but won't crash
// if some differ; it just draws fewer things.

import {
  Application,
  Container,
  Sprite,
  Texture,
  Assets,
  Graphics,
  Ticker,
} from 'pixi.js';
import { Atlas } from '../core/atlas';

// ---- Light, defensive imports of config/state ----
let CONFIG: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CONFIG = (await import('../core/config')).CONFIG ?? {};
} catch {
  // defaults below
}

let STATE_MOD: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  STATE_MOD = await import('../core/state');
} catch {
  // we'll fallback to window.__mp_state if present
}

// ---- Constants / Defaults ----
const TILE_SIZE: number =
  (CONFIG?.TILE_SIZE as number) ??
  (CONFIG?.TILE ?? 16) ??
  16;

const SCALE: number = (CONFIG?.SCALE as number) ?? 4;

// These are logical view dimensions in tiles (not pixels).
const VIEW_TILES_W: number = (CONFIG?.VIEW_W as number) ?? 20;
const VIEW_TILES_H: number = (CONFIG?.VIEW_H as number) ?? 12;

// Camera margin (in tiles) to overdraw around edges
const PAD_TILES = 1;

// Fallback tint colors for when a sprite key is missing in the atlas.
const F_TINTS = {
  tile: {
    water: 0x2a7bd1,
    sand: 0xf1e9a5,
    jungle: 0x3ea55d,
    rocky: 0x888b90,
    high: 0xb8b18b,
    shipwreck: 0x8b5a2b,
    unknown: 0x444444,
  },
  node: {
    palm: 0x39b54a,
    banana: 0xffe066,
    vines: 0x5dbb63,
    rocks: 0x9aa3a8,
    driftwood: 0xb07c5d,
    shells: 0xddd9c8,
    wreck: 0x7a4e32,
    unknown: 0x777777,
  },
  entity: {
    player: 0xffc93c,
    crab: 0xe15554,
    unknown: 0xffffff,
  },
} as const;

// Name mappings per acceptance notes.
function tileKeyForTileType(t: string | number | undefined): string {
  // tolerant: accept string TileType or map a number -> unknown
  if (typeof t === 'string') return t;
  return 'unknown';
}

function nodeKeyForNodeType(n: string | undefined): string {
  switch (n) {
    case 'palm':
      return 'palm';
    case 'banana':
      return 'banana';
    case 'vines':
      return 'vines';
    case 'rock':
      return 'rocks';
    case 'drift':
      return 'driftwood';
    case 'shell':
      return 'shells';
    case 'wreck':
      return 'wreck';
    default:
      return 'unknown';
  }
}

function entityKeyFor(type: 'player' | 'crab' | string): string {
  if (type === 'crab') return 'crab';
  if (type === 'player') return 'monkey'; // likely atlas key
  return 'unknown';
}

// ---- Internal renderer state ----
let app: any;
let atlas: Atlas | null = null;

let worldC: Container;
let tilesC: Container;
let nodesC: Container;
let entitiesC: Container;

// Pooled sprites
let tileSprites: Sprite[] = []; // grid of visible tiles
const nodeSprites = new Map<string, Sprite>(); // key: "x,y"
const crabSprites = new Map<any, Sprite>(); // key: entity ref or index
let playerSprite: Sprite | null = null;

let lastCamX = Number.NaN;
let lastCamY = Number.NaN;

let started = false;

// ---- Utilities ----
function baseURL(): string {
  // Always prefer Vite base, fallback to "/"
  const b = (import.meta as any)?.env?.BASE_URL ?? '/';
  return b.endsWith('/') ? b : b + '/';
}

function getState(): any {
  const mod = STATE_MOD || {};
  return mod.state ?? mod.getState?.() ?? (globalThis as any).__mp_state ?? {};
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

function idForXY(x: number, y: number): string {
  return `${x},${y}`;
}

function mountPoint(): HTMLElement {
  return (
    document.getElementById('game') ||
    document.getElementById('app') ||
    document.getElementById('root') ||
    document.body
  );
}

function textureOrTintRect(
  key: string,
  type: 'tile' | 'node' | 'entity',
): { texture: Texture; tint: number } {
  const tex =
    atlas && atlas.get(key) ? (atlas.get(key) as Texture) : Texture.WHITE;

  const tint =
    atlas && atlas.get(key)
      ? 0xffffff
      : type === 'tile'
        ? (F_TINTS.tile as any)[key] ?? F_TINTS.tile.unknown
        : type === 'node'
          ? (F_TINTS.node as any)[key] ?? F_TINTS.node.unknown
          : (F_TINTS.entity as any)[key] ?? F_TINTS.entity.unknown;

  return { texture: tex, tint };
}

// ---- Map/State accessors (defensive) ----
function mapWidth(s: any): number {
  return (
    s?.map?.width ??
    s?.map?.w ??
    s?.width ??
    s?.cols ??
    VIEW_TILES_W // fallback
  );
}

function mapHeight(s: any): number {
  return (
    s?.map?.height ??
    s?.map?.h ??
    s?.height ??
    s?.rows ??
    VIEW_TILES_H // fallback
  );
}

function tileAt(s: any, x: number, y: number): string {
  const tiles =
    s?.map?.tiles ??
    s?.tiles ??
    null;

  if (
    tiles &&
    Array.isArray(tiles) &&
    y >= 0 &&
    y < tiles.length &&
    Array.isArray(tiles[y]) &&
    x >= 0 &&
    x < tiles[y].length
  ) {
    const v = tiles[y][x];
    return tileKeyForTileType(v);
  }
  // Outside map -> assume water so edges look natural
  return 'water';
}

type NodeLike = { x: number; y: number; type: string; charges?: number };

function listNodes(s: any): NodeLike[] {
  // Possible shapes:
  // - s.nodes: Node[]
  // - s.map.nodes: Node[] or 2D grid
  // - s.map.nodeGrid: Node-like 2D
  const out: NodeLike[] = [];
  const tryPush = (n: any) => {
    if (!n) return;
    const x = n.x ?? n.col ?? n.cx ?? n.i;
    const y = n.y ?? n.row ?? n.cy ?? n.j;
    const type = n.type ?? n.kind ?? n.name;
    if (typeof x === 'number' && typeof y === 'number' && typeof type === 'string') {
      const charges = n.charges ?? n.uses ?? n.count ?? undefined;
      out.push({ x, y, type, charges });
    }
  };

  if (Array.isArray(s?.nodes)) {
    for (const n of s.nodes) tryPush(n);
  }
  if (Array.isArray(s?.map?.nodes)) {
    for (const n of s.map.nodes) tryPush(n);
  }
  // If node grid exists
  const ngrid = s?.map?.nodeGrid;
  if (Array.isArray(ngrid)) {
    for (let j = 0; j < ngrid.length; j++) {
      const row = ngrid[j];
      if (!Array.isArray(row)) continue;
      for (let i = 0; i < row.length; i++) {
        const n = row[i];
        if (n) tryPush({ ...n, x: i, y: j });
      }
    }
  }
  return out;
}

function listCrabs(s: any): { x: number; y: number }[] {
  const crabs = s?.crabs ?? s?.entities?.crabs ?? [];
  if (Array.isArray(crabs)) {
    return crabs
      .map((c: any) => ({
        x: c?.x ?? c?.pos?.x ?? c?.tile?.x ?? 0,
        y: c?.y ?? c?.pos?.y ?? c?.tile?.y ?? 0,
      }))
      .filter((c: any) => Number.isFinite(c.x) && Number.isFinite(c.y));
  }
  return [];
}

function playerPos(s: any): { x: number; y: number } {
  const p = s?.player ?? s?.hero ?? {};
  const x = p?.x ?? p?.pos?.x ?? p?.tile?.x ?? 0;
  const y = p?.y ?? p?.pos?.y ?? p?.tile?.y ?? 0;
  return { x, y };
}

// ---- Scene creation ----
async function ensurePixiApp(): Promise<void> {
  if (app) return;

  const widthPx = VIEW_TILES_W * TILE_SIZE * SCALE;
  const heightPx = VIEW_TILES_H * TILE_SIZE * SCALE;

  // Support v7 and v8 Application APIs
  let tmp: any;
  try {
    tmp = new (Application as any)();
    if (typeof tmp.init === 'function') {
      await tmp.init({
        width: widthPx,
        height: heightPx,
        antialias: false,
        backgroundAlpha: 1,
        background: '#000000',
      });
    } else {
      tmp = new (Application as any)({
        width: widthPx,
        height: heightPx,
        antialias: false,
        backgroundAlpha: 1,
        backgroundColor: 0x000000,
      });
    }
  } catch {
    // Fallback to legacy constructor if the above failed
    tmp = new (Application as any)({
      width: widthPx,
      height: heightPx,
      antialias: false,
      backgroundAlpha: 1,
      backgroundColor: 0x000000,
    });
  }

  app = tmp;

  const mount = mountPoint();
  const canvas: HTMLCanvasElement =
    (app.view as HTMLCanvasElement) ?? (app.canvas as HTMLCanvasElement);
  mount.appendChild(canvas);

  // Stage / layers
  worldC = new Container();
  worldC.scale.set(SCALE);

  tilesC = new Container();
  nodesC = new Container();
  entitiesC = new Container();

  worldC.addChild(tilesC);
  worldC.addChild(nodesC);
  worldC.addChild(entitiesC);
  app.stage.addChild(worldC);

  // Preload /assets keys the atlas will need (optional hinting)
  await Assets.addBundle('mp-core', {
    // These are lazy-loaded by Atlas; this just warms the cache during dev.
    tiles: `${baseURL()}assets/tiles.png`,
    props: `${baseURL()}assets/props.png`,
    structures: `${baseURL()}assets/structures.png`,
    characters: `${baseURL()}assets/characters.png`,
    ui: `${baseURL()}assets/ui.png`,
  }).catch(() => void 0);
}

async function ensureAtlas(): Promise<void> {
  if (atlas) return;
  atlas = await Atlas.load(baseURL());
}

// Pool a fixed grid of tile sprites (viewport + padding) positioned in world coords.
// We'll update their textures and positions every camera update.
function buildTilePool(): void {
  tileSprites.forEach((s) => s.destroy());
  tileSprites = [];
  tilesC.removeChildren();

  const cols = VIEW_TILES_W + PAD_TILES * 2;
  const rows = VIEW_TILES_H + PAD_TILES * 2;
  const total = cols * rows;

  for (let i = 0; i < total; i++) {
    const spr = new Sprite(Texture.WHITE);
    spr.tint = F_TINTS.tile.unknown;
    spr.width = TILE_SIZE;
    spr.height = TILE_SIZE;
    tilesC.addChild(spr);
    tileSprites.push(spr);
  }
}

// ---- Camera & draw ----
function centerWorldOn(xTiles: number, yTiles: number): void {
  const viewWpx = VIEW_TILES_W * TILE_SIZE * SCALE;
  const viewHpx = VIEW_TILES_H * TILE_SIZE * SCALE;

  const camXpx = (xTiles + 0.5) * TILE_SIZE * SCALE;
  const camYpx = (yTiles + 0.5) * TILE_SIZE * SCALE;

  // worldC is scaled, so position is in SCREEN pixels
  worldC.position.set(
    Math.floor(viewWpx * 0.5 - camXpx),
    Math.floor(viewHpx * 0.5 - camYpx),
  );
}

// Update tile layer around camera center (player tile)
function updateTiles(s: any, camX: number, camY: number): void {
  const cols = VIEW_TILES_W + PAD_TILES * 2;
  const rows = VIEW_TILES_H + PAD_TILES * 2;
  const startX = Math.floor(camX) - Math.floor(VIEW_TILES_W / 2) - PAD_TILES;
  const startY = Math.floor(camY) - Math.floor(VIEW_TILES_H / 2) - PAD_TILES;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, idx++) {
      const tx = startX + c;
      const ty = startY + r;

      const name = tileAt(s, tx, ty);
      const { texture, tint } = textureOrTintRect(name, 'tile');

      const spr = tileSprites[idx];
      spr.texture = texture;
      spr.tint = tint;
      spr.position.set(tx * TILE_SIZE, ty * TILE_SIZE);
      spr.width = TILE_SIZE;
      spr.height = TILE_SIZE;
    }
  }
}

// Update nodes within view; one sprite per occupied tile.
function updateNodes(s: any, camX: number, camY: number): void {
  const startX = Math.floor(camX) - Math.floor(VIEW_TILES_W / 2) - PAD_TILES;
  const startY = Math.floor(camY) - Math.floor(VIEW_TILES_H / 2) - PAD_TILES;
  const endX = startX + VIEW_TILES_W + PAD_TILES * 2;
  const endY = startY + VIEW_TILES_H + PAD_TILES * 2;

  const nodes = listNodes(s);
  const keep = new Set<string>();

  for (const n of nodes) {
    if (typeof n.charges === 'number' && n.charges <= 0) continue;
    if (n.x < startX || n.x >= endX || n.y < startY || n.y >= endY) continue;

    const key = idForXY(n.x, n.y);
    keep.add(key);

    let spr = nodeSprites.get(key);
    if (!spr) {
      spr = new Sprite(Texture.WHITE);
      spr.width = TILE_SIZE;
      spr.height = TILE_SIZE;
      nodeSprites.set(key, spr);
      nodesC.addChild(spr);
    }

    const atlasKey = nodeKeyForNodeType(n.type);
    const { texture, tint } = textureOrTintRect(atlasKey, 'node');
    spr.texture = texture;
    spr.tint = tint;
    spr.position.set(n.x * TILE_SIZE, n.y * TILE_SIZE);
  }

  // Remove out-of-view sprites
  for (const [key, spr] of nodeSprites) {
    if (!keep.has(key)) {
      spr.destroy();
      nodeSprites.delete(key);
    }
  }
}

function getEntityTextureAndTint(kind: 'player' | 'crab'): { texture: Texture; tint: number } {
  // Try canonical keys; fallback to alternates; then to tinted rect
  const preferred = entityKeyFor(kind);
  const alternates = kind === 'player' ? ['player', 'monkey'] : ['crab', 'crabs'];

  let tex: Texture | null = null;
  if (atlas) {
    if (atlas.has(preferred)) tex = atlas.get(preferred);
    if (!tex) {
      for (const k of alternates) {
        if (atlas.has(k)) {
          tex = atlas.get(k);
          break;
        }
      }
    }
  }
  if (tex) return { texture: tex, tint: 0xffffff };

  return {
    texture: Texture.WHITE,
    tint:
      kind === 'player'
        ? F_TINTS.entity.player
        : kind === 'crab'
          ? F_TINTS.entity.crab
          : F_TINTS.entity.unknown,
  };
}

function updateEntities(s: any): void {
  const p = playerPos(s);
  // Player
  if (!playerSprite) {
    playerSprite = new Sprite(Texture.WHITE);
    playerSprite.width = TILE_SIZE;
    playerSprite.height = TILE_SIZE;
    entitiesC.addChild(playerSprite);
  }
  const pSkin = getEntityTextureAndTint('player');
  playerSprite.texture = pSkin.texture;
  playerSprite.tint = pSkin.tint;
  playerSprite.position.set(p.x * TILE_SIZE, p.y * TILE_SIZE);

  // Crabs
  const list = listCrabs(s);
  const keep = new Set<any>();

  list.forEach((pos, idx) => {
    const id = (s?.crabs?.[idx] as any) ?? idx; // stable-ish identifier
    keep.add(id);

    let spr = crabSprites.get(id);
    if (!spr) {
      spr = new Sprite(Texture.WHITE);
      spr.width = TILE_SIZE;
      spr.height = TILE_SIZE;
      entitiesC.addChild(spr);
      crabSprites.set(id, spr);
    }
    const skin = getEntityTextureAndTint('crab');
    spr.texture = skin.texture;
    spr.tint = skin.tint;
    spr.position.set(pos.x * TILE_SIZE, pos.y * TILE_SIZE);
  });

  // Remove missing
  for (const [id, spr] of crabSprites) {
    if (!keep.has(id)) {
      spr.destroy();
      crabSprites.delete(id);
    }
  }
}

function redrawAll(): void {
  const s = getState();
  const p = playerPos(s);

  // Re-center world on player
  centerWorldOn(p.x, p.y);

  // Update pooled layers
  updateTiles(s, p.x, p.y);
  updateNodes(s, p.x, p.y);
  updateEntities(s);

  lastCamX = p.x;
  lastCamY = p.y;
}

// Optional cheap change detector
function needsRedraw(): boolean {
  const s = getState();
  const p = playerPos(s);

  // Redraw if camera center changed
  if (p.x !== lastCamX || p.y !== lastCamY) return true;

  // Redraw if a typical dirty flag is set (best-effort)
  const dirty =
    s?.dirty?.render ||
    s?.dirty?.all ||
    s?.dirty?.map ||
    s?.dirty?.entities ||
    s?.dirty?.nodes;
  return !!dirty;
}

function attachTicker(): void {
  const ticker: Ticker | undefined = (app.ticker as Ticker) ?? (Ticker as any)?.shared;
  if (ticker && typeof ticker.add === 'function') {
    ticker.add(() => {
      if (!atlas) return;
      if (needsRedraw()) redrawAll();
    });
  } else {
    // Fallback: RAF loop
    const loop = () => {
      if (atlas && needsRedraw()) redrawAll();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// ---- Public API ----

export function startRenderLoop(..._args: any[]): void {
  if (started) return;
  started = true;

  (async () => {
    await ensurePixiApp();
    await ensureAtlas();
    buildTilePool();
    redrawAll();
    attachTicker();
  })().catch((err) => {
    // Never crash the page; log once and render tinted rects anyway.
    console.error('[render] init failed', err);
  });
}

// Small "gather" feedback effect at the player tile.
// A quick scale+fade ping so the user gets a visual cue.
// Does not affect game state or determinism.
export function gatherHere(..._args: any[]): void {
  if (!app || !worldC) return;

  const s = getState();
  const p = playerPos(s);

  const g = new Graphics();
  g.beginFill(0xffffff, 0.85);
  g.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.endFill();
  g.position.set(p.x * TILE_SIZE, p.y * TILE_SIZE);
  nodesC.addChild(g); // on top of tiles, beneath entities

  const start = performance.now();
  const DURATION = 180; // ms
  const ticker: Ticker | undefined = (app.ticker as Ticker) ?? (Ticker as any)?.shared;

  const step = () => {
    const t = performance.now() - start;
    const k = Math.min(1, t / DURATION);
    const ease = 1 - (1 - k) * (1 - k);
    g.alpha = 0.9 * (1 - ease);
    const s = 1 + 0.25 * ease;
    g.scale.set(s);

    if (k >= 1) {
      g.destroy();
      if (ticker && typeof ticker.remove === 'function') {
        ticker.remove(step as any);
      }
    }
  };

  if (ticker && typeof ticker.add === 'function') {
    ticker.add(step as any);
  } else {
    // RAF fallback
    const raf = () => {
      step();
      if (g.destroyed) return;
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
}
