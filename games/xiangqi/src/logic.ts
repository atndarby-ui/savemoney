import type { BoardState, Position } from './types';
import { GRID_ROWS, GRID_COLS } from './constants';

const isWithinBounds = (x: number, y: number) => x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS;

export const getPossibleMoves = (board: BoardState, pos: Position): Position[] => {
    const piece = board[pos.y][pos.x];
    if (!piece) return [];

    const moves: Position[] = [];
    const { x, y } = pos;
    const isRed = piece.player === 'red';

    const addMove = (nx: number, ny: number) => {
        if (isWithinBounds(nx, ny)) {
            const target = board[ny][nx];
            if (!target || target.player !== piece.player) {
                moves.push({ x: nx, y: ny });
            }
        }
    };

    switch (piece.type) {
        case 'general': // Tướng
            // Palace bounds
            const minX = 3, maxX = 5;
            const minY = isRed ? 7 : 0;
            const maxY = isRed ? 9 : 2;

            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
                    addMove(nx, ny);
                }
            });
            break;

        case 'advisor': // Sĩ
            const aMinX = 3, aMaxX = 5;
            const aMinY = isRed ? 7 : 0;
            const aMaxY = isRed ? 9 : 2;

            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx >= aMinX && nx <= aMaxX && ny >= aMinY && ny <= aMaxY) {
                    addMove(nx, ny);
                }
            });
            break;

        case 'elephant': // Tượng
            // Cannot cross river (Red y>=5, Black y<=4)
            // Standard river: Rows 0-4 Black, 5-9 Red.

            [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                const eyeX = x + dx / 2, eyeY = y + dy / 2;

                if (isWithinBounds(nx, ny) && !board[eyeY][eyeX]) {
                    // Check River
                    if (isRed && ny < 5) return;
                    if (!isRed && ny > 4) return;
                    addMove(nx, ny);
                }
            });
            break;

        case 'horse': // Mã
            // L-shape: 1 orth, 1 diag. Blocked checking.
            const horseOffsets = [
                { move: [1, 2], block: [0, 1] },
                { move: [-1, 2], block: [0, 1] },
                { move: [1, -2], block: [0, -1] },
                { move: [-1, -2], block: [0, -1] },
                { move: [2, 1], block: [1, 0] },
                { move: [-2, 1], block: [-1, 0] },
                { move: [2, -1], block: [1, 0] },
                { move: [-2, -1], block: [-1, 0] },
            ];

            horseOffsets.forEach(({ move, block }) => {
                const nx = x + move[0], ny = y + move[1];
                const bx = x + block[0], by = y + block[1];

                if (isWithinBounds(nx, ny) && isWithinBounds(bx, by) && !board[by][bx]) {
                    addMove(nx, ny);
                }
            });
            break;

        case 'chariot': // Xe
            // Row and Col generic logic
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                let cx = x + dx, cy = y + dy;
                while (isWithinBounds(cx, cy)) {
                    const target = board[cy][cx];
                    if (!target) {
                        addMove(cx, cy);
                    } else {
                        if (target.player !== piece.player) addMove(cx, cy);
                        break;
                    }
                    cx += dx; cy += dy;
                }
            });
            break;

        case 'cannon': // Pháo
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                let cx = x + dx, cy = y + dy;
                let screenFound = false;

                while (isWithinBounds(cx, cy)) {
                    const target = board[cy][cx];
                    if (!screenFound) {
                        if (!target) {
                            addMove(cx, cy);
                        } else {
                            screenFound = true;
                        }
                    } else {
                        if (target) {
                            if (target.player !== piece.player) addMove(cx, cy);
                            break; // Can only jump one
                        }
                    }
                    cx += dx; cy += dy;
                }
            });
            break;

        case 'soldier': // Tốt
            // Forward always. Sideways only after river.
            const forward = isRed ? -1 : 1;
            const crossedRiver = isRed ? y <= 4 : y >= 5;

            // Forward
            addMove(x, y + forward);

            if (crossedRiver) {
                addMove(x - 1, y);
                addMove(x + 1, y);
            }
            break;
    }

    // NOTE: This basic logic doesn't prevent "Flying General" (Generals facing each other w/o pieces in between).
    // Implementing that would require full board scan on every move validation which is complex but doable.
    // For a simple version, we'll skip complex check logic like 'Is King in Resulting Check' for now to get MVP running,
    // or add a simple post-move check.

    return moves;
};

// Check checkmate/check logic is complex. For step 1 MVP, we enforce legal moves only.
export const isFlyingGeneral = (board: BoardState): boolean => {
    // Find generals
    let redGen: Position | null = null;
    let blackGen: Position | null = null;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const p = board[r][c];
            if (p?.type === 'general') {
                if (p.player === 'red') redGen = { x: c, y: r };
                else blackGen = { x: c, y: r };
            }
        }
    }

    if (redGen && blackGen && redGen.x === blackGen.x) {
        // Check vertical line between them
        const x = redGen.x;
        const min = Math.min(redGen.y, blackGen.y);
        const max = Math.max(redGen.y, blackGen.y);
        for (let i = min + 1; i < max; i++) {
            if (board[i][x]) return false; // Blocked
        }
        return true; // Flying General!
    }
    return false;
};
