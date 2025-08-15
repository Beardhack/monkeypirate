import { state, dirty } from "../core/state";
import { saveGame, loadGame } from "../core/save";
import { newRun } from "../systems/mapgen";

const h = {
  health: document.getElementById("statHealth")!,
  stam: document.getElementById("statStam")!,
  hunger: document.getElementById("statHunger")!,
  turn: document.getElementById("statTurn")!,
  day: document.getElementById("statDay")!,
  seed: document.getElementById("statSeed")!,
};

export function bindHud(){
  (document.getElementById("btnNew") as HTMLButtonElement).onclick = ()=>{
    const s = prompt("Seed:", state.seed) ?? state.seed;
    newRun(String(s||"island-0001"));
    dirty.all = true; dirty.hud = true;
  };
  (document.getElementById("btnSave") as HTMLButtonElement).onclick = ()=>{ saveGame(); logLocal("Saved."); };
  (document.getElementById("btnLoad") as HTMLButtonElement).onclick = ()=>{ if (loadGame()) logLocal("Loaded."); else logLocal("No save found."); };
  (document.getElementById("btnHelp") as HTMLButtonElement).onclick = ()=>{
    alert("Controls: WASD/Arrows move · G gather · Space wait\nThis is the modular dev build (M0b).");
  };
}

function logLocal(msg:string){ const el=document.getElementById("log")!; const d=document.createElement("div"); d.textContent=msg; el.appendChild(d); el.scrollTop=el.scrollHeight; }

export function drawHUD(){
  if (!dirty.hud) return;
  h.health.textContent = `${state.player.health}/10`;
  h.stam.textContent = `${state.player.stamina}/100`;
  h.hunger.textContent = `${state.player.hunger}/100`;
  h.turn.textContent = String(state.turn);
  h.day.textContent = String(state.day);
  h.seed.textContent = state.seed;
  dirty.hud = false;
}
