import { Assets, Texture, Rectangle } from "pixi.js";

/**
 * SimpleAtlas loader for our art pack format:
 * {
 *   "tileSize": 16,
 *   "sheets": {
 *     "tiles.png": { "sand":[1,0], "jungle":[2,0], ... },
 *     "props.png": { "palm":[0,0], "rocks":[3,0], ... },
 *     ...
 *   }
 * }
 */
export class SimpleAtlas {
  tileSize = 16;
  private baseTextures = new Map<string, Texture>();
  private textures = new Map<string, Texture>();
  private baseUrl = (import.meta as any).env?.BASE_URL || "/";

  private asset(path: string) {
    const base = this.baseUrl.endsWith("/") ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${base}${p}`;
  }

  async load(jsonPath = "/assets/atlas_map.json") {
    const res = await fetch(this.asset(jsonPath), { cache: "no-store" });
    if (!res.ok) throw new Error(`Atlas load failed: ${jsonPath}`);
    const data = await res.json();
    this.tileSize = data.tileSize || 16;

    const sheets = data.sheets || {};
    for (const sheetName of Object.keys(sheets)) {
      const baseTex = await Assets.load(this.asset(`/assets/${sheetName}`));
      // best-effort nearest-neighbor (v8)
      try { baseTex.source.scaleMode = "nearest" as any; } catch {}
      this.baseTextures.set(sheetName, baseTex);

      const entries = sheets[sheetName] || {};
      for (const [name, coord] of Object.entries(entries)) {
        const [col, row] = coord as [number, number];
        const frame = new Rectangle(
          col * this.tileSize,
          row * this.tileSize,
          this.tileSize,
          this.tileSize
        );
        const tex = new Texture({ source: baseTex.source, frame });
        // Register by short key ("sand") and qualified ("tiles.png/sand")
        const qualified = `${sheetName}/${name}`;
        if (!this.textures.has(name)) this.textures.set(name, tex);
        this.textures.set(qualified, tex);
      }
    }
  }

  get(name: string): Texture | null {
    return this.textures.get(name) || null;
  }

  /** Try a list of names, returning the first that exists. */
  try(...names: string[]): Texture | null {
    for (const n of names) {
      const t = this.get(n);
      if (t) return t;
    }
    return null;
  }
}
