import { tryMove, advanceTurn } from "./turn";
import { gatherHere } from "./render";

export function installInput(){
  window.addEventListener("keydown", (e)=>{
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    if (e.code==="ArrowUp"||e.code==="KeyW") tryMove(0,-1);
    else if (e.code==="ArrowDown"||e.code==="KeyS") tryMove(0,1);
    else if (e.code==="ArrowLeft"||e.code==="KeyA") tryMove(-1,0);
    else if (e.code==="ArrowRight"||e.code==="KeyD") tryMove(1,0);
    else if (e.code==="Space") advanceTurn();
    else if (e.code==="KeyG") gatherHere();
  });
}
