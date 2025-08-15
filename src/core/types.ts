export enum TileType { WATER, SAND, JUNGLE, ROCKY, SHIPWRECK, HIGH }

export type NodeKind = "palm"|"banana"|"vines"|"rock"|"drift"|"shell"|"wreck";
export interface Node { kind: NodeKind; charges: number; respawnAt: number; }

export interface Tile { type: TileType; node?: Node; }

export interface Crab { kind: "crab"; x: number; y: number; lastMoved: number; }

export interface Structure {
  type: "campfire" | "signal";
  x: number; y: number; lit?: boolean;
}

export interface Player {
  x: number; y: number;
  health: number; stamina: number; hunger: number;
  hasSeen: Set<number>;
}

export interface GameState {
  seed: string;
  turn: number;
  day: number;
  tideNext: number;
  player: Player;
  map: { w: number; h: number; tiles: Tile[][] };
  entities: Crab[];
  structures: Structure[];
  flags: { won: boolean; dead: boolean; canWin: boolean; };
  settings: { reveal: boolean; mute: boolean; shake: boolean; };
}
