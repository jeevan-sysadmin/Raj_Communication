import { memo, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Torus, Float, Stars, Ring } from '@react-three/drei';
import * as THREE from 'three';

function CosmicBackground() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0005;
    }
  });

  const particlesPositions = useMemo(() => {
    const particlesCount = 220;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = (Math.random() - 0.5) * 20;
      positions[i + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, []);

  return (
    <>
      <Stars radius={300} depth={100} count={2200} factor={5} saturation={0.5} fade speed={0.8} />
      <fog attach="fog" args={['#0a0e17', 10, 50]} />

      <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.1}>
        <Sphere args={[1.2, 36, 36]} position={[0, 0, -15]}>
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FF6B00"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.8}
          />
          <pointLight intensity={1.6} color="#FFD700" distance={30} />
        </Sphere>

        <Sphere args={[1.5, 24, 24]} position={[0, 0, -15]}>
          <meshBasicMaterial color="#FF9500" transparent opacity={0.2} side={THREE.BackSide} />
        </Sphere>
      </Float>

      <group ref={groupRef}>
        <Float speed={1.2} rotationIntensity={0.4}>
          <Sphere args={[0.4, 20, 20]} position={[5, 2, -10]}>
            <meshStandardMaterial color="#1cb3ff" emissive="#0088cc" emissiveIntensity={0.3} roughness={0.5} />
          </Sphere>
          <Ring args={[0.6, 0.65, 24]} position={[5, 2, -10]} rotation={[Math.PI / 4, 0, 0]}>
            <meshBasicMaterial color="#1cb3ff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </Ring>
        </Float>

        <Float speed={1.4} rotationIntensity={0.3}>
          <Sphere args={[0.6, 20, 20]} position={[-6, -1, -12]}>
            <meshStandardMaterial color="#ff6b8b" emissive="#ff2e5d" emissiveIntensity={0.2} roughness={0.6} />
          </Sphere>
        </Float>
      </group>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlesPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          sizeAttenuation
          color="#FFFFFF"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {Array.from({ length: 5 }).map((_, i) => (
        <Float key={i} speed={0.5 + Math.random() * 0.3}>
          <Torus
            args={[0.08, 0.02, 8, 18]}
            position={[
              Math.cos(i * Math.PI / 2.5) * 8,
              Math.sin(i * Math.PI / 2.5) * 8,
              -10 + Math.sin(i) * 2,
            ]}
          >
            <meshStandardMaterial
              color={i % 2 === 0 ? '#FF9A23' : '#1cb3ff'}
              emissive={i % 2 === 0 ? '#FF9A23' : '#1cb3ff'}
              emissiveIntensity={0.5}
              metalness={0.9}
              roughness={0.1}
            />
          </Torus>
        </Float>
      ))}
    </>
  );
}

function LoginScene() {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#0a0e17']} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
        <pointLight position={[-10, -10, 5]} intensity={0.5} color="#1cb3ff" />
        <CosmicBackground />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate
          autoRotate
          autoRotateSpeed={0.25}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
          rotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}

export default memo(LoginScene);
