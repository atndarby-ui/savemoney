import { useState } from 'react';
import type { BoardState, Position, Player } from './types';
import { INITIAL_BOARD, PIECE_LABELS, GRID_COLS, GRID_ROWS } from './constants';
import { getPossibleMoves, isFlyingGeneral } from './logic';

function App() {
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [turn, setTurn] = useState<Player>('red');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);

  const handleSquareClick = (x: number, y: number) => {
    if (winner) return;

    const clickedPiece = board[y][x];
    const isSelected = selectedPos?.x === x && selectedPos?.y === y;

    // 1. Move to a valid spot
    const move = validMoves.find(m => m.x === x && m.y === y);
    if (selectedPos && move) {
      // Execute move
      const newBoard = board.map(row => [...row]);
      newBoard[y][x] = newBoard[selectedPos.y][selectedPos.x];
      newBoard[selectedPos.y][selectedPos.x] = null;

      // Check flying general rule - if illegal, revert
      if (isFlyingGeneral(newBoard)) {
        alert("Nước đi lỗi: Tướng đối mặt!");
        return;
      }

      setBoard(newBoard);
      setTurn(turn === 'red' ? 'black' : 'red');
      setSelectedPos(null);
      setValidMoves([]);

      // Check Win Condition (General captured)
      if (clickedPiece?.type === 'general') {
        setWinner(turn);
      }
      return;
    }

    // 2. Select a piece
    if (clickedPiece && clickedPiece.player === turn) {
      if (isSelected) {
        setSelectedPos(null);
        setValidMoves([]);
      } else {
        setSelectedPos({ x, y });
        setValidMoves(getPossibleMoves(board, { x, y }));
      }
    } else {
      // Clicked empty or enemy without being a valid move -> Deselect
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  const resetGame = () => {
    // Deep copy to reset
    // Ideally we should have a fresh copy function, but for now reload or simple reset logic
    // Since INITIAL_BOARD is mutated in standard JS if not careful, let's just reload or re-import
    window.location.reload();
  };

  // Render Grid Lines
  const CELL_SIZE = 40; // px
  // Board dimensions: (Cols-1) * CellSize width, (Rows-1) * CellSize height

  return (
    <div className="min-h-screen bg-stone-800 flex flex-col items-center justify-center p-4 font-sans select-none text-stone-100">
      <h1 className="text-3xl font-bold mb-4 text-amber-500 font-serif">Tượng Kỳ (Cờ Tướng)</h1>

      <div className="relative bg-[#deb887] p-8 rounded shadow-2xl border-4 border-[#8b4513]">
        {/* The Grid */}
        <div
          style={{
            width: (GRID_COLS - 1) * CELL_SIZE,
            height: (GRID_ROWS - 1) * CELL_SIZE,
            position: 'relative',
            margin: `${CELL_SIZE / 2}px`
          }}
          className="border-2 border-stone-800"
        >
          {/* Horizontal Lines */}
          {Array.from({ length: GRID_ROWS }).map((_, i) => (
            <div key={`h-${i}`} className="absolute bg-stone-800 h-0.5 w-full" style={{ top: i * CELL_SIZE }}></div>
          ))}
          {/* Vertical Lines */}
          {Array.from({ length: GRID_COLS }).map((_, i) => (
            <div key={`v-${i}`} className="absolute bg-stone-800 w-0.5" style={{
              left: i * CELL_SIZE,
              height: (i === 0 || i === GRID_COLS - 1) ? '100%' : 'calc(100% - 2px)', // Borders handled by container, but inner lines need gap at river?
              // Actually standard xiangqi: vertical lines break at river, except edges.
            }}>
              {/* River Mask for inner cols */}
              {(i > 0 && i < GRID_COLS - 1) && (
                <div className="absolute bg-[#deb887] w-1 h-[38px]" style={{ top: 4 * CELL_SIZE + 2, left: -1 }}></div>
              )}
            </div>
          ))}

          {/* Palace Diagonals */}
          {/* Top Palace (0,3) to (2,5) */}
          <div className="absolute bg-stone-800 h-0.5 w-[120px] origin-top-left rotate-45" style={{ top: 0, left: 3 * CELL_SIZE }}></div>
          <div className="absolute bg-stone-800 h-0.5 w-[120px] origin-top-right -rotate-45" style={{ top: 0, left: 5 * CELL_SIZE }}></div>

          {/* Bottom Palace (7,3) to (9,5) */}
          <div className="absolute bg-stone-800 h-0.5 w-[120px] origin-top-left rotate-45" style={{ top: 7 * CELL_SIZE, left: 3 * CELL_SIZE }}></div>
          <div className="absolute bg-stone-800 h-0.5 w-[120px] origin-top-right -rotate-45" style={{ top: 7 * CELL_SIZE, left: 5 * CELL_SIZE }}></div>

          {/* River Label */}
          <div className="absolute w-full flex justify-between px-10 items-center text-stone-800 opacity-60 font-serif text-xl select-none pointer-events-none" style={{ top: 4 * CELL_SIZE + 5 }}>
            <span>Sở Hà</span>
            <span>Hán Giới</span>
          </div>
        </div>

        {/* Pieces Overlay */}
        <div className="absolute top-0 left-0 w-full h-full p-8 pointer-events-none">
          <div className="relative" style={{ margin: `${CELL_SIZE / 2}px` }}>
            {board.map((row, y) => row.map((piece, x) => {
              if (!piece) return null;
              const isSelected = selectedPos?.x === x && selectedPos?.y === y;
              return (
                <div
                  key={`${x}-${y}`}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-[36px] h-[36px] rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-200 pointer-events-auto cursor-pointer
                                ${piece.player === 'red'
                      ? 'bg-[#fcd0a1] border-[#b91c1c] text-[#b91c1c]'
                      : 'bg-[#fcd0a1] border-black text-black'
                    }
                                ${isSelected ? 'ring-4 ring-blue-400 scale-110 z-10' : ''}
                            `}
                  style={{ left: x * CELL_SIZE, top: y * CELL_SIZE }}
                  onClick={() => handleSquareClick(x, y)}
                >
                  <span className="font-bold text-xl leading-none font-serif mb-0.5 mx-auto block">
                    {PIECE_LABELS[piece.player][piece.type]}
                  </span>
                </div>
              );
            }))}

            {/* Move Hints */}
            {validMoves.map((m, i) => (
              <div
                key={`hint-${i}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500/50 rounded-full pointer-events-auto cursor-pointer hover:bg-blue-600"
                style={{ left: m.x * CELL_SIZE, top: m.y * CELL_SIZE }}
                onClick={() => handleSquareClick(m.x, m.y)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* HUD */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 text-xl">
          Turn:
          <span className={`font-bold px-3 py-1 rounded ${turn === 'red' ? 'bg-red-900 text-red-200' : 'bg-black text-slate-200'}`}>
            {turn === 'red' ? 'RED (Đỏ)' : 'BLACK (Đen)'}
          </span>
        </div>

        {winner && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-in fade-in zoom-in">
            <h2 className="text-5xl font-bold text-yellow-400 mb-4">
              {winner === 'red' ? 'ĐỎ THẮNG!' : 'ĐEN THẮNG!'}
            </h2>
            <button onClick={resetGame} className="bg-white text-black px-6 py-3 rounded-full font-bold hover:scale-105 transition">
              Ván Mới
            </button>
          </div>
        )}

        <button onClick={resetGame} className="text-stone-400 text-sm underline hover:text-white">
          Reset Board
        </button>
      </div>
    </div>
  );
}

export default App;
