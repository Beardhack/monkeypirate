import { newRun } from "./systems/mapgen";
import { startRenderLoop } from "./systems/render";
import { drawHUD, bindHud } from "./ui/hud";
import { installInput } from "./systems/input";
import { dirty } from "./core/state";

function init(){
  bindHud();
  installInput();
  if (!new URLSearchParams(location.search).get("seed")){
    newRun("island-0001");
  }
  dirty.all = true; dirty.hud = true;
  startRenderLoop();

  // simple HUD updater on rAF
  const hudStep = () => { drawHUD(); requestAnimationFrame(hudStep); };
  hudStep();
}
init();
