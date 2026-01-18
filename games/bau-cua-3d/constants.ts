import { GameItem, SymbolId } from './types';

export const GAME_ITEMS: GameItem[] = [
  { id: SymbolId.DEER, name: 'Nai', icon: '🦌', color: '#8d6e63' },
  { id: SymbolId.GOURD, name: 'Bầu', icon: '🍐', color: '#9ccc65' },
  { id: SymbolId.CHICKEN, name: 'Gà', icon: '🐔', color: '#ffca28' },
  { id: SymbolId.FISH, name: 'Cá', icon: '🐟', color: '#42a5f5' },
  { id: SymbolId.CRAB, name: 'Cua', icon: '🦀', color: '#ef5350' },
  { id: SymbolId.SHRIMP, name: 'Tôm', icon: '🦐', color: '#ab47bc' },
];

export const CHIP_VALUES = [10, 50, 100, 500];

// Euler angles (x, y, z) to display specific faces up
// Mapping based on a standard box geometry where faces are:
// Right(0), Left(1), Top(2), Bottom(3), Front(4), Back(5)
// We will map our texture/emojis to these faces specifically.
// Let's assume standard UV mapping or Face Materials order:
// 0: +x, 1: -x, 2: +y, 3: -y, 4: +z, 5: -z
export const DICE_ROTATIONS: { [key in SymbolId]: [number, number, number] } = {
  // To show Right (+x) up: z = 90
  [SymbolId.DEER]: [0, 0, Math.PI / 2], 
  // To show Left (-x) up: z = -90
  [SymbolId.GOURD]: [0, 0, -Math.PI / 2],
  // To show Top (+y) up: 0,0,0 (Default)
  [SymbolId.CHICKEN]: [0, 0, 0],
  // To show Bottom (-y) up: x = 180
  [SymbolId.FISH]: [Math.PI, 0, 0],
  // To show Front (+z) up: x = 90
  [SymbolId.CRAB]: [Math.PI / 2, 0, 0],
  // To show Back (-z) up: x = -90
  [SymbolId.SHRIMP]: [-Math.PI / 2, 0, 0],
};
