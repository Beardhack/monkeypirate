// Tiny atlas loader for the custom { tileSize, sheets: { "file.png": { name:[col,row] } } } format.
// Produces per-name PIXI.Textures from the sheet images.
// Uses import.meta.env.BASE_URL to resolve /public/assets paths.

import { Assets, BaseTexture, Rectangle, Texture } from 'pixi.js';

export type AtlasMap = {
  tileSize: number;
  sheets: Record<string, Record<string, [number, number]>>;
};

function withTrailingSlash(s: string) {
  return s.endsWith('/') ? s : s + '/';
}

export class Atlas {
  readonly tileSize: number;
  private textures: Map<string, Texture> = new Map();

  private constructor(tileSize: number) {
    this.tileSize = tileSize;
  }

  /**
   * Load atlas_map.json and all sheet pngs under `${base}assets/`.
   * @param base import.meta.env.BASE_URL (or compatible)
   */
  static async load(base: string): Promise<Atlas> {
    const BASE = withTrailingSlash(base || '/');
    const assetsBase = `${BASE}assets/`;

    // Load atlas_map.json
    const atlasUrl = `${assetsBase}atlas_map.json`;
    const res = await fetch(atlasUrl);
    if (!res.ok) {
      throw new Error(`Failed to load atlas_map.json at ${atlasUrl}`);
    }
    const data = (await res.json()) as AtlasMap;

    const atlas = new Atlas(data.tileSize || 16);

    // Load each sheet and slice textures
    const sheetEntries = Object.entries(data.sheets || {});
    for (const [fileName, nameMap] of sheetEntries) {
      const sheetUrl = `${assetsBase}${fileName}`;

      // In Pixi v7 Assets.load returns a Texture; in v8, also a Texture.
      // We'll derive the BaseTexture from it for sub-rect slicing.
      const sheetTex = (await Assets.load(sheetUrl)) as Texture;
      const baseTex: BaseTexture =
        (sheetTex && (sheetTex.baseTexture as BaseTexture)) ||
        (Texture.from(sheetUrl).baseTexture as BaseTexture);

      for (const [name, [col, row]] of Object.entries(nameMap)) {
        const x = col * atlas.tileSize;
        const y = row * atlas.tileSize;
        const frame = new Rectangle(x, y, atlas.tileSize, atlas.tileSize);

        // v7-compatible constructor; also accepted by v8 types.
        const sub = new Texture(baseTex, frame);
        atlas.textures.set(name, sub);
      }
    }

    return atlas;
  }

  has(name: string): boolean {
    return this.textures.has(name);
  }

  get(name: string): Texture | null {
    return this.textures.get(name) ?? null;
  }

  /** For debugging/dev tools */
  keys(): string[] {
    return [...this.textures.keys()];
  }
}
