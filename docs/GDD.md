# GDD — Monkey Pirate: Shipwrecked (VS‑Short scope)

## Pillars
- Cozy survival / crafting with gentle hazards.
- Thinky, turn‑based exploration; procedural replayability.

## Core Loop
Explore → Gather → Craft tools → Rest/Cook → Survive to Day ≥ 3 → Build + Light Signal Fire (win).

## Systems (VS‑Short)
- **Stats:** Health (10), Stamina (100), Hunger (100).
- **Turn:** +1 per player action. Hunger −1/turn. Starve dmg: −1 health every 5 turns at 0 Hunger.
- **Biomes:** Beach, Jungle, Rocky/High, Shipwreck.
- **Resources:** coconuts, bananas, rocks, wood, vines, scrap, shells. Nodes have 2 charges; respawn timer.
- **Tools:** Stone Axe (dur 30), Spear (dur 30). Rope/Pouch craftables.
- **Recipes (required):**
  - Rope = vines×2
  - Stone Axe = wood×1 + rock×2 + rope×1
  - Spear = wood×1 + rock×1 + rope×1
  - Campfire = wood×3 + rocks×4 (rest/cook)
  - Pouch = vines×2 + scrap×1 (+5 slots)
  - Signal Fire = wood×10 + scrap×3 + shells×5 (win if lit after Day 3)
- **AI:** Crabs wander; move every 2 turns; adjacent nip (−1) unless Spear.
- **Events:** Tide every ~50±20 turns; affects beach nodes; can extinguish campfires.

## Controls
WASD/Arrows move, `G` gather, `Space` wait, `E` inventory, `C` craft, `Enter` confirm. F1 debug.

## Win/Lose
Win: Light Signal Fire on High/Rocky after Day ≥ 4 begins.  
Lose: Health ≤ 0 (starvation or crabs).

## Visuals
16×16 tiles, 4× scale, bright tropical palette; clear silhouettes.
