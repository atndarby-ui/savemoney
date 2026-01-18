import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows, Stars } from '@react-three/drei';
import Dice from './Dice';
import BowlSystem from './BowlSystem';
import { GamePhase, SymbolId } from '../types';

interface GameSceneProps {
  results: [SymbolId, SymbolId, SymbolId];
  phase: GamePhase;
}

const GameScene: React.FC<GameSceneProps> = ({ results, phase }) => {
  return (
    <div className="absolute inset-0 z-0">
      {/* 
        Camera Position: Moved further back (z: 12) and up (y: 8) to create distance.
        FOV: Reduced slightly to 35 for a more cinematic, less distorted view.
      */}
      <Canvas shadows camera={{ position: [0, 8, 12], fov: 35 }}>
        <color attach="background" args={['#0f172a']} />

        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <spotLight
          position={[5, 15, 5]}
          angle={0.4}
          penumbra={1}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />

        <Suspense fallback={null}>
          {/* Environment for nice reflections on the bowl/dice */}
          <Environment preset="lobby" />

          {/* 
              Group Position: 
              - Lowered Y (-1) to move it away from the top UI/Header.
              - Pushed Z (-2) slightly to maintain perspective.
              - Scale (0.75) kept small.
            */}
          <group position={[0, -1, -2]} scale={0.75}>
            <BowlSystem phase={phase} />

            {/* 3 Dice positioned in a tight triangle */}
            <Dice
              index={0}
              position={[-0.55, 0.2, 0.35]}
              result={results[0]}
              phase={phase}
            />
            <Dice
              index={1}
              position={[0.55, 0.2, 0.35]}
              result={results[1]}
              phase={phase}
            />
            <Dice
              index={2}
              position={[0, 0.2, -0.55]}
              result={results[2]}
              phase={phase}
            />
          </group>

          <ContactShadows position={[0, 0.9, 0]} opacity={0.6} scale={10} blur={2.5} far={4} color="#000000" />
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
        </Suspense>

        {/* Controls - Restricted to keep the view focused on the table from above */}
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={8}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
};

export default GameScene;