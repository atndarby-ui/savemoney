import type { BoardState, PieceType, Player } from './types';

export const GRID_ROWS = 10;
export const GRID_COLS = 9;

export const PIECE_LABELS: Record<Player, Record<PieceType, string>> = {
    red: {
        general: '帥',
        advisor: '仕',
        elephant: '相',
        horse: '傌',
        chariot: '俥',
        cannon: '炮',
        soldier: '兵',
    },
    black: {
        general: '將',
        advisor: '士',
        elephant: '象',
        horse: '馬',
        chariot: '車',
        cannon: '砲',
        soldier: '卒',
    },
};

export const INITIAL_BOARD: BoardState = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));

const placePiece = (x: number, y: number, type: PieceType, player: Player) => {
    INITIAL_BOARD[y][x] = { type, player };
};

// Setup Black (Top)
placePiece(0, 0, 'chariot', 'black');
placePiece(1, 0, 'horse', 'black');
placePiece(2, 0, 'elephant', 'black');
placePiece(3, 0, 'advisor', 'black');
placePiece(4, 0, 'general', 'black');
placePiece(5, 0, 'advisor', 'black');
placePiece(6, 0, 'elephant', 'black');
placePiece(7, 0, 'horse', 'black');
placePiece(8, 0, 'chariot', 'black');

placePiece(1, 2, 'cannon', 'black');
placePiece(7, 2, 'cannon', 'black');

placePiece(0, 3, 'soldier', 'black');
placePiece(2, 3, 'soldier', 'black');
placePiece(4, 3, 'soldier', 'black');
placePiece(6, 3, 'soldier', 'black');
placePiece(8, 3, 'soldier', 'black');

// Setup Red (Bottom)
placePiece(0, 9, 'chariot', 'red');
placePiece(1, 9, 'horse', 'red');
placePiece(2, 9, 'elephant', 'red');
placePiece(3, 9, 'advisor', 'red');
placePiece(4, 9, 'general', 'red');
placePiece(5, 9, 'advisor', 'red');
placePiece(6, 9, 'elephant', 'red');
placePiece(7, 9, 'horse', 'red');
placePiece(8, 9, 'chariot', 'red');

placePiece(1, 7, 'cannon', 'red');
placePiece(7, 7, 'cannon', 'red');

placePiece(0, 6, 'soldier', 'red');
placePiece(2, 6, 'soldier', 'red');
placePiece(4, 6, 'soldier', 'red');
placePiece(6, 6, 'soldier', 'red');
placePiece(8, 6, 'soldier', 'red');
