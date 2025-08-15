import { CONFIG } from "../core/config";
import { state, log } from "../core/state";
import { TileType } from "../core/types";
import { revealAroundPlayer } from "./mapgen";

export function advanceTurn(){
  state.turn++;
  if (state.turn % CONFIG.DAY_TURNS === 0){
    state.day++;
    if (state.day>=4) state.flags.canWin = true;
    log(`Day ${state.day} begins.`, "muted");
  }
  // hunger drain
  state.player.hunger = Math.max(0, state.player.hunger - CONFIG.HUNGER_DRAIN_PER_TURN);
  if (state.player.hunger<=0 && state.turn % 5===0){
    state.player.health -= 1;
    log("You suffer from starvation (-1).","bad");
  }
}

export function tryMove(dx:number, dy:number){
  const nx = state.player.x+dx, ny=state.player.y+dy;
  if (nx<0||ny<0||nx>=state.map.w||ny>=state.map.h) return;
  const t = state.map.tiles[ny][nx];
  if (t.type===TileType.WATER) return;
  state.player.x=nx; state.player.y=ny;
  state.player.stamina = Math.max(0, state.player.stamina - CONFIG.STAM_MOVE_COST);
  revealAroundPlayer();
  advanceTurn();
}
