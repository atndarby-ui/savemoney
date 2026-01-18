import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { GamePhase, SymbolId } from '../types';
import { GAME_ITEMS, DICE_ROTATIONS } from '../constants';

interface DiceProps {
  position: [number, number, number];
  result: SymbolId;
  phase: GamePhase;
  index: number;
}

// Order for mapping faces: Right, Left, Top, Bottom, Front, Back
// We need to match this with the rotation logic in constants.ts
const FACE_OFFSETS = [
  { id: SymbolId.DEER,    pos: [0.41, 0, 0],   rot: [0, Math.PI / 2, 0] },    // Right (+x)
  { id: SymbolId.GOURD,   pos: [-0.41, 0, 0],  rot: [0, -Math.PI / 2, 0] },   // Left (-x)
  { id: SymbolId.CHICKEN, pos: [0, 0.41, 0],   rot: [-Math.PI / 2, 0, 0] },   // Top (+y)
  { id: SymbolId.FISH,    pos: [0, -0.41, 0],  rot: [Math.PI / 2, 0, 0] },    // Bottom (-y)
  { id: SymbolId.CRAB,    pos: [0, 0, 0.41],   rot: [0, 0, 0] },              // Front (+z)
  { id: SymbolId.SHRIMP,  pos: [0, 0, -0.41],  rot: [0, Math.PI, 0] }         // Back (-z)
];

const Dice: React.FC<DiceProps> = ({ position, result, phase, index }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Random initial rotation
  const initialRotation = useMemo(() => {
     return [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number];
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (phase === GamePhase.SHAKING) {
      // Violent rotation
      const speed = 15;
      meshRef.current.rotation.x += (speed + index) * delta;
      meshRef.current.rotation.y += (speed - index) * delta;
      meshRef.current.rotation.z += (speed + index) * delta;
      
      // Jiggle position
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 25 + index) * 0.15;
      meshRef.current.position.x = position[0] + Math.cos(state.clock.elapsedTime * 20) * 0.08;
      meshRef.current.position.z = position[2] + Math.sin(state.clock.elapsedTime * 20) * 0.08;
    } else {
      // Smoothly settle to target rotation
      const target = DICE_ROTATIONS[result];
      const lerpFactor = 0.15;

      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, target[0], lerpFactor);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, target[1], lerpFactor);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, target[2], lerpFactor);

      // Return to origin
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, position[0], lerpFactor);
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, position[1], lerpFactor);
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, position[2], lerpFactor);
    }
  });

  return (
    <group>
      <RoundedBox 
        ref={meshRef} 
        args={[0.8, 0.8, 0.8]} // Size
        radius={0.15} // Rounded corners
        smoothness={4} 
        position={position} 
        rotation={initialRotation} 
        castShadow
      >
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />

        {/* Render Faces */}
        {FACE_OFFSETS.map((face) => (
          <Text
            key={face.id}
            position={face.pos as [number, number, number]}
            rotation={face.rot as [number, number, number]}
            fontSize={0.55}
            color="black" // Fallback color, emoji has its own
            renderOrder={1} // Ensure it renders on top
            characters="🦌🍐🐔🐟🦀🦐" // Preload characters
          >
            {GAME_ITEMS[face.id].icon}
          </Text>
        ))}
      </RoundedBox>
    </group>
  );
};

export default Dice;