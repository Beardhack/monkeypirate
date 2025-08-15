# Art Guide (v0)

- **Tile size:** 16×16. Rendered at **4×** scale.
- **Sheets:** `/public/assets/tiles.png`, `props.png`, `structures.png`, `characters.png`, `ui.png`
- **Atlas:** `/public/assets/atlas_map.json` with `{ tileSize, sheets: { "file.png": { name:[col,row], ... } } }`
- **Naming:**
  - Tiles: `water`, `sand`, `jungle`, `rocky`, `shipwreck`, `high`
  - Props: `palm`, `banana`, `vines`, `rocks`, `driftwood`, `shells`, `wreck`
  - Structures: `campfire_off/on`, `signal_off/on`
  - Characters: `monkey_{down|right|up|left}_{0|1}`, `crab_{0|1}`
- **Palette direction:** bright tropical; high readability; no harsh black outlines on terrain.
- **Replacement rule:** Artists may repaint but must keep grid, names, and atlas layout for drop‑in compatibility.
