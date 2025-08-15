# Monkey Pirate: Shipwrecked — Assistant Context (v1)

**Owner:** @Beardhack  
**Repo:** https://github.com/Beardhack/monkeypirate

## Non‑negotiables (Invariants)
- Turn‑based, low APM. Every player action advances `turn`; world updates only on turns.
- Stack: TypeScript + Vite + **PixiJS** (renderer). No frameworks.
- Art: pixel, **16×16 tiles**, **4× camera scale**, bright tropical palette.
- Determinism: seeded RNG (mulberry32/xmur3). Same seed → same island.
- Save: `localStorage`, versioned key. Avoid breaking saves unless we migrate.
- Performance: redraw only as needed; no real‑time updates outside turn loop.

## Current Status
- **M0b complete**: modular TS dev app; Canvas rendering parity with prototype.
- Next: **M1 – Pixi Sprite Renderer** (swap draw code to Pixi, keep logic).

## Directories (expected)
/public/ # dev shell + assets
dev.html
assets/ # tiles.png, props.png, structures.png, characters.png, ui.png, atlas_map.json
/src/
core/ # config, rng, state, save, types
systems/ # mapgen, turn, input, render (Canvas during M0b)
ui/ # hud
/docs/ # this context + GDD + roadmap + art guide

## Collaboration Contract
- When asked for code: **return full file contents with exact paths**. Do not use “diff” unless requested.
- No external requests/CDNs. Keep assets local.
- Keep PR‑sized changes; avoid giant rewrites.

## Definition of Done (DoD) for features
- Deterministic, tested on at least 1–2 seeds.
- Keyboard controls working (WASD/Arrows + bound keys).
- Save/Load unchanged or migrated.
- No console errors; renders at 60fps idle.

## Notes for the Assistant
- Prefer data‑driven expansion (`/src/data/*.json`) for items/recipes/biomes.
- Keep `CONFIG` central; expose sensible constants in one place.
- If docs contradict code, ask to reconcile via an issue.
