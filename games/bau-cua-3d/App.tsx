import React, { useState, useEffect, useCallback } from 'react';
import GameScene from './components/GameScene';
import UIInterface from './components/UIInterface';
import { GamePhase, SymbolId, BetState } from './types';

// Sound effects helpers
const playSound = (freq: number, type: OscillatorType, duration: number) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const audioCtx = new AudioContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

function App() {
  const [balance, setBalance] = useState(1000);
  const [bets, setBets] = useState<BetState>({});
  const [selectedChip, setSelectedChip] = useState(10);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.IDLE);
  const [results, setResults] = useState<[SymbolId, SymbolId, SymbolId]>([
    SymbolId.DEER, SymbolId.GOURD, SymbolId.CHICKEN
  ]);
  const [lastWin, setLastWin] = useState(0);

  const handleBet = (id: SymbolId) => {
    if (phase !== GamePhase.IDLE && phase !== GamePhase.REVEAL) return;

    // If in Reveal phase (showing results), clicking bet resets the board implicitly for next round
    if (phase === GamePhase.REVEAL) {
      resetGame();
      // Don't place bet immediately, just reset to Idle
      return;
    }

    if (balance < selectedChip) {
      alert("Not enough money!");
      return;
    }

    setBalance(prev => prev - selectedChip);
    setBets(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + selectedChip
    }));
    playSound(600, 'sine', 0.1);
  };

  const resetGame = () => {
    setPhase(GamePhase.IDLE);
    setLastWin(0);
    setBets({});
  };

  const handleResetBets = () => {
    // Refund bets
    const totalRefund = Object.values(bets).reduce((a, b) => a + b, 0);
    setBalance(prev => prev + totalRefund);
    setBets({});
    playSound(400, 'triangle', 0.1);
  };

  const processResults = useCallback((finalResults: [SymbolId, SymbolId, SymbolId]) => {
    let winAmount = 0;
    let refundAmount = 0;

    // Calculate wins
    // Logic: If you bet on Deer, and 2 Deers appear, you get Bet + (Bet * 2)

    // 1. Count occurrences
    const counts: Record<number, number> = {};
    finalResults.forEach(r => {
      counts[r] = (counts[r] || 0) + 1;
    });

    // 2. Check bets
    Object.keys(bets).forEach((keyStr) => {
      const symbolId = parseInt(keyStr);
      const betAmt = bets[symbolId];

      if (counts[symbolId]) {
        // Win!
        refundAmount += betAmt; // Return original bet
        winAmount += betAmt * counts[symbolId]; // Add profit
      }
    });

    const totalPayout = winAmount + refundAmount;

    if (totalPayout > 0) {
      setBalance(prev => prev + totalPayout);
      setLastWin(winAmount); // Show profit only in the bubble
      playSound(800, 'sine', 0.2);
      setTimeout(() => playSound(1200, 'sine', 0.4), 200);
    }
  }, [bets]);

  const handleRoll = () => {
    if (phase === GamePhase.REVEAL) {
      // "Play Again" clicked
      resetGame();
      return;
    }

    setPhase(GamePhase.SHAKING);
    setLastWin(0);
    playSound(200, 'sawtooth', 0.5);

    // Shake for 2 seconds
    setTimeout(() => {
      // Determine results strictly
      const newResults: [SymbolId, SymbolId, SymbolId] = [
        Math.floor(Math.random() * 6),
        Math.floor(Math.random() * 6),
        Math.floor(Math.random() * 6)
      ];

      setResults(newResults);
      setPhase(GamePhase.REVEAL);
      playSound(500, 'square', 0.3);

      // Wait a moment for the reveal animation before calculating score
      setTimeout(() => {
        processResults(newResults);
      }, 1000);

    }, 2500);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 text-white font-sans select-none">
      <GameScene results={results} phase={phase} />
      <UIInterface
        balance={balance}
        bets={bets}
        phase={phase}
        selectedChip={selectedChip}
        lastWin={lastWin}
        results={results}
        onBet={handleBet}
        onSelectChip={(val) => { setSelectedChip(val); playSound(800, 'sine', 0.05); }}
        onRoll={handleRoll}
        onReset={handleResetBets}
      />
    </div>
  );
}

export default App;
