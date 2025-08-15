import { CONFIG, COLORS } from "../core/config";
import { state, log } from "../core/state";
import { seeded, rand } from "../core/rng";
import { TileType } from "../core/types";

export function newRun(seed: string){
  state.seed = seed;
  const rng = seeded(seed);

  // initialize grid
  const w=CONFIG.MAP_W, h=CONFIG.MAP_H;
  state.map.tiles = new Array(h);
  for (let y=0;y<h;y++){
    state.map.tiles[y] = new Array(w).fill(null).map(()=>({type:TileType.WATER}));
  }

  // island blob
  const cx = Math.floor(w*0.5 + rand.int(rng,-4,4));
  const cy = Math.floor(h*0.55 + rand.int(rng,-4,4));
  const rx = Math.floor(w*0.35 + rand.int(rng,-4,4));
  const ry = Math.floor(h*0.28 + rand.int(rng,-4,4));

  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const dx=(x-cx)/rx, dy=(y-cy)/ry;
      const d=dx*dx+dy*dy;
      if (d<1.0){
        const rim = Math.sqrt(d);
        let type = TileType.SAND;
        if (rim<0.78) type = TileType.JUNGLE;
        if (rim<0.52 && rng()<0.22) type = TileType.ROCKY;
        if (rng()<0.03 && rim<0.65) type = TileType.HIGH;
        state.map.tiles[y][x] = {type};
      }
    }
  }

  // shipwreck cluster
  const sx = cx + rand.int(rng,-6,6);
  const sy = cy + Math.floor(ry*0.7) + rand.int(rng,2,6);
  for (let i=0;i<28;i++){
    const x = sx + rand.int(rng,-4,4);
    const y = sy + rand.int(rng,-3,3);
    if (x<0||y<0||x>=w||y>=h) continue;
    const t = state.map.tiles[y][x];
    if (t && t.type!==TileType.WATER){
      t.type = TileType.SHIPWRECK;
      if (rng()<0.6) t.node = {kind:"wreck", charges:2, respawnAt:-1};
    }
  }

  // beach resources
  for (let y=1;y<h-1;y++){
    for (let x=1;x<w-1;x++){
      const t=state.map.tiles[y][x];
      if (!t || t.type===TileType.WATER) continue;
      if (t.type===TileType.SAND){
        if (rng()<0.06) t.node = {kind:"palm", charges:2, respawnAt:-1};
        if (rng()<0.08) t.node = {kind:"drift", charges:2, respawnAt:-1};
        if (rng()<0.06) t.node = {kind:"shell", charges:2, respawnAt:-1};
      }
      if (t.type===TileType.JUNGLE){
        if (rng()<0.10) t.node = {kind:"banana", charges:2, respawnAt:-1};
        else if (rng()<0.10) t.node = {kind:"vines", charges:2, respawnAt:-1};
      }
      if (t.type===TileType.ROCKY || t.type===TileType.HIGH){
        if (rng()<0.18) t.node = {kind:"rock", charges:2, respawnAt:-1};
      }
    }
  }

  // spawn near shipwreck
  let spawn = {x:cx, y:cy}, best = 1e9;
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const t=state.map.tiles[y][x];
      if (t && (t.type===TileType.SAND || t.type===TileType.SHIPWRECK)){
        const d=(x-sx)*(x-sx)+(y-sy)*(y-sy);
        if (d<best){ best=d; spawn={x,y}; }
      }
    }
  }
  state.player.x = spawn.x; state.player.y = spawn.y;
  state.player.hasSeen = new Set<number>();
  revealAroundPlayer();
  state.turn=0; state.day=1; state.flags={won:false,dead:false,canWin:false};

  state.tideNext = state.turn + CONFIG.TIDE_PERIOD + rand.int(rng,-CONFIG.TIDE_VARIANCE, CONFIG.TIDE_VARIANCE);

  log(`You awaken shipwrecked on a strange beach. (Seed: ${seed})`);
}

export function revealAroundPlayer(){
  const r=6;
  for (let yy=-r; yy<=r; yy++){
    for (let xx=-r; xx<=r; xx++){
      const x=state.player.x+xx, y=state.player.y+yy;
      if (x<0||y<0||x>=state.map.w||y>=state.map.h) continue;
      state.player.hasSeen.add(y*1000+x);
    }
  }
}
