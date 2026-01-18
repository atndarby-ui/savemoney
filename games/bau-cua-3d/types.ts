import type { ThreeElements } from '@react-three/fiber';

export enum SymbolId {
  DEER = 0,
  GOURD = 1,
  CHICKEN = 2,
  FISH = 3,
  CRAB = 4,
  SHRIMP = 5,
}

export interface GameItem {
  id: SymbolId;
  name: string;
  icon: string;
  color: string;
}

export enum GamePhase {
  IDLE = 'IDLE',
  SHAKING = 'SHAKING',
  REVEAL = 'REVEAL',
}

export interface BetState {
  [key: number]: number;
}

// Extend global JSX namespace to include Three.js elements (mesh, group, lights, etc.)
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}