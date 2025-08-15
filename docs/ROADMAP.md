# Roadmap

## Done
- M0b: Modular TS dev app with Canvas parity (movement, gather, HUD, save/load).

## Next — M1: Pixi Sprite Renderer
- [ ] Add PixiJS + loader
- [ ] Load `/public/assets/*.png` + `atlas_map.json`
- [ ] Map tile types/nodes → sprite names
- [ ] Replace Canvas draw with Pixi containers/tilemap
- [ ] Preserve camera, fog/seen set, and tooltip behavior
- [ ] Parity test on seeds: `island-0001`, `island-0002`

## M2: Light ECS + Turn Scheduler
- [ ] Components: Position, Renderable, Hunger, Stamina, Health, Collectable, AI, Structure
- [ ] Systems: Turn, Input, AI (crab), Gathering, Respawn, Tide
- [ ] Deterministic actor periods

## M3: Data‑Driven Content
- [ ] `/src/data/items.json`, `recipes.json`, `biomes.json`, `mobs.json`
- [ ] Load/validate at startup; types for safety

## M4: Tiled + POIs
- [ ] Author base island in Tiled; mix with proc overlays
- [ ] Spawn shipwreck cluster + high ground peaks

## M5: UI Polish
- [ ] Inventory grid (drag/drop), crafting clarity, help/settings
- [ ] Color‑blind palettes; rebinds; screen-shake toggle

> Create issues per checkbox; tag with `milestone:M1`…`M5`.
