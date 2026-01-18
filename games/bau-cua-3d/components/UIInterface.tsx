import React from 'react';
import { GamePhase, BetState, SymbolId } from '../types';
import { GAME_ITEMS, CHIP_VALUES } from '../constants';

interface UIInterfaceProps {
  balance: number;
  bets: BetState;
  phase: GamePhase;
  selectedChip: number;
  lastWin: number;
  results?: [SymbolId, SymbolId, SymbolId];
  onBet: (id: SymbolId) => void;
  onSelectChip: (val: number) => void;
  onRoll: () => void;
  onReset: () => void;
}

const UIInterface: React.FC<UIInterfaceProps> = ({
  balance,
  bets,
  phase,
  selectedChip,
  lastWin,
  results,
  onBet,
  onSelectChip,
  onRoll,
  onReset,
}) => {

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

      {/* Header / Stats */}
      <div className="pt-20 px-4 pb-4 flex justify-between items-start pointer-events-auto bg-gradient-to-b from-slate-900/80 to-transparent">
        <div className="flex flex-col">
          <h1 className="font-['Pacifico'] text-3xl text-yellow-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Bầu Cua 3D
          </h1>
          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-600 rounded-2xl px-4 py-2 mt-2 shadow-xl">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Balance</div>
            <div className="text-2xl font-black text-yellow-400 font-['Outfit']">
              ${balance.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={onReset}
            disabled={phase !== GamePhase.IDLE && phase !== GamePhase.REVEAL}
            className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 text-xs px-3 py-1 rounded-full backdrop-blur transition-all"
          >
            Reset Bets
          </button>
          {lastWin > 0 && (
            <div className="animate-bounce bg-green-600/90 text-white font-bold px-4 py-2 rounded-xl shadow-lg border border-green-400">
              +{lastWin.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Middle Spacer - This is the "gap" area. We keep it empty to show the 3D plate. */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {phase === GamePhase.SHAKING && (
          <div className="text-5xl font-black text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-pulse tracking-widest font-['Outfit']">
            SHAKING...
          </div>
        )}
      </div>

      {/* Bottom Controls Area - Constrained height */}
      <div className="pb-6 pt-12 px-4 bg-gradient-to-t from-slate-950 via-slate-900/95 to-transparent pointer-events-auto">

        {/* Betting Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-5">
          {GAME_ITEMS.map((item) => {
            const betAmount = bets[item.id] || 0;
            return (
              <button
                key={item.id}
                onClick={() => onBet(item.id)}
                disabled={phase === GamePhase.SHAKING}
                className={`
                    relative group flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-150 active:scale-95
                    ${betAmount > 0
                    ? 'bg-indigo-900/80 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                    : 'bg-slate-800/60 border-slate-600 hover:bg-slate-700/80 hover:border-slate-400'
                  }
                  `}
              >
                <span className="text-4xl drop-shadow-md mb-1 transform transition-transform group-hover:scale-110">
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{item.name}</span>

                {/* Bet Chip Badge */}
                {betAmount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-red-400 min-w-[24px] z-10">
                    {betAmount >= 1000 ? (betAmount / 1000).toFixed(1) + 'k' : betAmount}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Chips and Action */}
        <div className="max-w-lg mx-auto flex flex-col gap-4">
          {/* Chips */}
          <div className="flex justify-center gap-4">
            {CHIP_VALUES.map((val) => (
              <button
                key={val}
                onClick={() => onSelectChip(val)}
                className={`
                            w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs shadow-xl transition-all
                            ${selectedChip === val
                    ? 'scale-110 ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 -translate-y-1'
                    : 'opacity-80 hover:opacity-100 hover:-translate-y-1'
                  }
                        `}
                style={{
                  background: val === 10 ? '#3b82f6' : val === 50 ? '#10b981' : val === 100 ? '#f59e0b' : '#ef4444',
                  color: 'white'
                }}
              >
                {val}
              </button>
            ))}
          </div>

          {/* Main Action Button */}
          <button
            onClick={onRoll}
            disabled={phase === GamePhase.SHAKING || (phase === GamePhase.IDLE && totalBet === 0)}
            className={`
                    w-full py-4 rounded-2xl font-black text-xl tracking-widest uppercase shadow-xl transition-all
                    ${phase === GamePhase.SHAKING
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : (totalBet === 0 && phase === GamePhase.IDLE)
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95'
              }
                `}
          >
            {phase === GamePhase.IDLE ? (totalBet === 0 ? 'Place Bets' : 'SHAKE') : phase === GamePhase.SHAKING ? 'SHAKING...' : 'PLAY AGAIN'}
          </button>
        </div>
      </div>

      {/* Results Display - Shows when in REVEAL phase - Positioned at top to not block 3D view */}
      {phase === GamePhase.REVEAL && results && (
        <div className="absolute top-40 left-0 right-0 z-50 flex flex-col items-center justify-center pointer-events-none animate-bounce">
          <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-yellow-500/50 shadow-2xl flex items-center gap-4 pointer-events-auto">
            <div className="text-yellow-400 font-bold text-sm uppercase tracking-widest font-['Outfit'] mr-2">Result:</div>
            <div className="flex gap-2">
              {results.map((res, i) => (
                <div key={i} className="bg-white p-1.5 rounded-lg text-2xl shadow-lg border border-slate-200">
                  {GAME_ITEMS.find(item => item.id === res)?.icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIInterface;