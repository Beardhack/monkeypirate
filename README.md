# Monkey Pirate: Shipwrecked

A cozy, **turn‑based**, top‑down survival & crafting game with a monkey pirate marooned on a tropical island.  
**Web‑first** (TypeScript, Vite, PixiJS), **pixel art** (16×16 tiles, bright palette), **deterministic** seeded runs.

**Live prototype:** https://beardhack.github.io/monkeypirate/  
**Repo:** https://github.com/Beardhack/monkeypirate

---

## Status

- ✅ **M0b** complete: modular TS dev app (Canvas parity with the single‑file prototype)
- 🔜 **M1**: PixiJS sprite renderer using `/public/assets` atlas

See `/docs/ROADMAP.md` for detailed tasks.

---

## Quick Start (Local Dev)

bash
npm install
npm run dev
# open the URL Vite prints, then navigate to /dev.html
# e.g. http://localhost:5173/monkeypirate/dev.html
Dev shell: public/dev.html
Live prototype (Pages): root index.html (unchanged during M0)

## Controls
Move: WASD / Arrow keys

Gather: G

Wait: Space

(Prototype hotkeys): E inventory, C craft, F1 debug (as features are migrated)

## Saves & Seeds
Saves are stored in localStorage (versioned key).

Runs are deterministic: same seed → same island.

## Project Structure

/public/
  dev.html               # dev shell for Vite
  assets/                # tiles.png, props.png, structures.png, characters.png, ui.png, atlas_map.json
/src/
  core/                  # config, rng, state, save, types
  systems/               # mapgen, turn, input, render (Canvas during M0b)
  ui/                    # HUD
/docs/
  ASSISTANT_CONTEXT.md   # single source of truth for constraints
  GDD.md                 # design doc (VS‑Short scope)
  ROADMAP.md             # milestones & tasks
  ART_GUIDE.md           # sprite/atlas rules

## Tech
TypeScript + Vite

PixiJS (renderer; introduced in M1)

Single‑page web build, no external CDNs; assets in /public/assets.

## Deploy
Current: GitHub Pages serves the root index.html.

Later (M1+): switch Pages to GitHub Actions to deploy the Vite build from /dist.

Set base: "/monkeypirate/" in vite.config.ts.

Use .github/workflows/deploy.yml (see docs/ROADMAP.md for the action snippet).

## Contributing / Workflow
Open issues per task and tag milestones (milestone:M1, etc.).

Keep changes small and deterministic (same seed → same layout).

No console errors; 60 FPS idle; updates only on turns.
