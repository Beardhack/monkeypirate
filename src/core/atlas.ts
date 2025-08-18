// Tiny atlas loader for the custom { tileSize, sheets: { "file.png": { name:[col,row] } } } format.
// Compatible with Pixi v7 and v8 (no BaseTexture import).
// Produces per-name PIXI.Textures from the sheet images using a v7/v8-safe helper.

import { Assets, Rectangle, Texture } from 'pixi.js';

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
      // Assets.load returns a Texture for image files (v7 & v8)
      const sheetTex = (await Assets.load(sheetUrl)) as Texture;

      for (const [name, [col, row]] of Object.entries(nameMap)) {
        const x = col * atlas.tileSize;
        const y = row * atlas.tileSize;
        const frame = new Rectangle(x, y, atlas.tileSize, atlas.tileSize);

        const sub = makeSubTexture(sheetTex, frame);
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

/**
 * Create a sub-texture from a larger sheet texture.
 * - Pixi v7 path: new Texture(baseTexture, frame)
 * - Pixi v8 path: new Texture({ source, frame })
 */
function makeSubTexture(sheetTex: Texture, frame: Rectangle): Texture {
  // v7-style: Texture has .baseTexture
  const baseTex = (sheetTex as any).baseTexture;
  if (baseTex) {
    return new (Texture as any)(baseTex, frame);
  }

  // v8-style: Texture has .source (TextureSource)
  const source =
    (sheetTex as any).source ||
    (sheetTex as any).textureSource ||
    (sheetTex as any).baseTexture || // last-ditch, if present
    null;

  if (source) {
    try {
      return new (Texture as any)({ source, frame });
    } catch {
      // Some environments require dynamic:true when customizing frames
      try {
        return new (Texture as any)({ source, frame, dynamic: true });
      } catch {
        // fall-through to white texture
      }
    }
  }

  // Fallback white (caller will tint it)
  return Texture.WHITE;
}
