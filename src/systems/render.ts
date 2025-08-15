import { CONFIG, COLORS } from "../core/config";
import { state, dirty, log } from "../core/state";
import { TileType } from "../core/types";

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const view = { x:0, y:0, w:CONFIG.VIEW_W, h:CONFIG.VIEW_H };

function centerCamera(){
  view.x = clamp(state.player.x - Math.floor(view.w/2), 0, state.map.w - view.w);
  view.y = clamp(state.player.y - Math.floor(view.h/2), 0, state.map.h - view.h);
}
function clamp(v:number,min:number,max:number){ return Math.max(min, Math.min(max, v)); }

export function draw(){
  if (!dirty.all) return;
  centerCamera();
  const ts = CONFIG.TILE_SIZE;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0, canvas.width, canvas.height);

  for (let sy=0; sy<view.h; sy++){
    for (let sx=0; sx<view.w; sx++){
      const x = view.x+sx, y=view.y+sy;
      const t = state.map.tiles[y]?.[x];
      const px=sx*ts, py=sy*ts;
      if (!t){ ctx.fillStyle="#000"; ctx.fillRect(px,py,ts,ts); continue; }
      // base color
      ctx.fillStyle = t.type===TileType.WATER?COLORS.water:
                      t.type===TileType.SAND?COLORS.beach:
                      t.type===TileType.JUNGLE?COLORS.jungle:
                      t.type===TileType.ROCKY?COLORS.rock:
                      t.type===TileType.SHIPWRECK?COLORS.ship:
                      COLORS.high;
      ctx.fillRect(px,py,ts,ts);
      // simple node glyphs
      if (t.node && t.node.charges>0){
        if (t.node.kind==="palm"){ ctx.fillStyle="#654321"; ctx.fillRect(px+9,py+4,2,12); ctx.fillStyle="#2ea043"; ctx.fillRect(px+6,py+3,8,2); }
        else if (t.node.kind==="banana"){ ctx.fillStyle="#f1e05a"; ctx.fillRect(px+6,py+6,8,3); }
        else if (t.node.kind==="vines"){ ctx.fillStyle="#2ea043"; ctx.fillRect(px+4,py+4,2,10); ctx.fillRect(px+14,py+2,2,12); }
        else if (t.node.kind==="rock"){ ctx.fillStyle="#9c9a96"; ctx.fillRect(px+6,py+8,8,6); }
        else if (t.node.kind==="drift"){ ctx.fillStyle="#8b6a3e"; ctx.fillRect(px+4,py+12,12,3); }
        else if (t.node.kind==="shell"){ ctx.fillStyle=COLORS.shell; ctx.fillRect(px+7,py+10,6,4); }
        else if (t.node.kind==="wreck"){ ctx.fillStyle=COLORS.scrap; ctx.fillRect(px+3,py+6,14,4); }
      }
    }
  }

  // player
  const px=(state.player.x - view.x)*ts, py=(state.player.y - view.y)*ts;
  ctx.fillStyle="#ffd966"; ctx.fillRect(px+6,py+6,8,8); // body
  ctx.fillStyle="#8b5a2b"; ctx.fillRect(px+7,py+4,6,3);
  ctx.fillStyle="#1a1a1a"; ctx.fillRect(px+6,py+3,8,1);

  // light grid
  ctx.strokeStyle="rgba(255,255,255,0.05)";
  for (let gx=0;gx<=view.w;gx++){ ctx.beginPath(); ctx.moveTo(gx*ts,0); ctx.lineTo(gx*ts,view.h*ts); ctx.stroke(); }
  for (let gy=0;gy<=view.h;gy++){ ctx.beginPath(); ctx.moveTo(0,gy*ts); ctx.lineTo(view.w*ts,gy*ts); ctx.stroke(); }

  dirty.all=false;
}

export function gatherHere(){
  const t = state.map.tiles[state.player.y][state.player.x];
  if (!t.node || t.node.charges<=0){ log("Nothing here to gather.","muted"); return; }
  const yields: Record<string,string> = {
    palm:"coconut", banana:"banana", vines:"vines", rock:"rock", drift:"wood", shell:"shells", wreck:"scrap"
  };
  const item = yields[t.node.kind];
  t.node.charges -= 1;
  log(`Gathered ${item}.`,"ok");
  dirty.all = true;
}

export function startRenderLoop(){
  const step = () => { draw(); requestAnimationFrame(step); };
  step();
}
