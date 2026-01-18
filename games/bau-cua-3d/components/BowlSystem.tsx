import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GamePhase } from '../types';

interface BowlSystemProps {
  phase: GamePhase;
}

const BowlSystem: React.FC<BowlSystemProps> = ({ phase }) => {
  const bowlGroupRef = useRef<THREE.Group>(null);
  const plateRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!bowlGroupRef.current) return;

    // Animation Logic
    const time = state.clock.elapsedTime;

    if (phase === GamePhase.SHAKING) {
      // Violent Shake
      const shakeX = Math.sin(time * 50) * 0.2;
      const shakeY = Math.cos(time * 45) * 0.1;
      const shakeZ = Math.sin(time * 40) * 0.2;

      bowlGroupRef.current.position.set(shakeX, -1.6 + shakeY, shakeZ);
      bowlGroupRef.current.rotation.z = Math.sin(time * 30) * 0.1;
    } else if (phase === GamePhase.REVEAL) {
      // Lift Up
      bowlGroupRef.current.position.y = THREE.MathUtils.lerp(bowlGroupRef.current.position.y, 4, 0.1);
      bowlGroupRef.current.rotation.x = THREE.MathUtils.lerp(bowlGroupRef.current.rotation.x, -0.5, 0.1);
    } else {
      // Idle / Closed
      // The bowl mesh is at y=1.2 (local). Plate rim is at y=-0.4 (world).
      // To close, we need GroupY + 1.2 = -0.4  => GroupY = -1.6
      bowlGroupRef.current.position.y = THREE.MathUtils.lerp(bowlGroupRef.current.position.y, -1.6, 0.1);
      bowlGroupRef.current.position.x = THREE.MathUtils.lerp(bowlGroupRef.current.position.x, 0, 0.1);
      bowlGroupRef.current.position.z = THREE.MathUtils.lerp(bowlGroupRef.current.position.z, 0, 0.1);
      bowlGroupRef.current.rotation.x = THREE.MathUtils.lerp(bowlGroupRef.current.rotation.x, 0, 0.1);
      bowlGroupRef.current.rotation.z = THREE.MathUtils.lerp(bowlGroupRef.current.rotation.z, 0, 0.1);
    }
  });

  // Set initial position based on phase to avoid "flying in" on mount
  React.useLayoutEffect(() => {
    if (bowlGroupRef.current && (phase === GamePhase.IDLE || phase === GamePhase.SHAKING)) {
      bowlGroupRef.current.position.set(0, -1.6, 0);
      bowlGroupRef.current.rotation.set(0, 0, 0);
    }
  }, []);

  return (
    <group>
      {/* Plate (Static base) */}
      <mesh ref={plateRef} position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.2, 0.2, 64]} />
        <meshStandardMaterial
          color="#fbbf24"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Plate Rim */}
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <torusGeometry args={[2.5, 0.1, 16, 100]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* The Moving Bowl (Lid) */}
      <group ref={bowlGroupRef}>
        {/* Bowl Mesh - inverted semi-sphere look */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <sphereGeometry args={[2.2, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#f1f5f9" // Slate 100
            metalness={0.3}
            roughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Handle on top */}
        <mesh position={[0, 2.4, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.1, 0.5, 32]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Decorative Band */}
        <mesh position={[0, 0.2, 0]}>
          <torusGeometry args={[2.2, 0.05, 16, 100]} />
          <meshStandardMaterial color="#e11d48" />
        </mesh>
      </group>
    </group>
  );
};

export default BowlSystem;
