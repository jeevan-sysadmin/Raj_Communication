import { useRef } from 'react';
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

  const particlesCount = 300;
  const particlesPositions = new Float32Array(particlesCount * 3);
  for (let i = 0; i < particlesCount * 3; i += 3) {
    particlesPositions[i] = (Math.random() - 0.5) * 20;
    particlesPositions[i + 1] = (Math.random() - 0.5) * 20;
    particlesPositions[i + 2] = (Math.random() - 0.5) * 20;
  }

  return (
    <>
      <Stars radius={300} depth={100} count={7000} factor={6} saturation={0.5} fade speed={2} />
      <fog attach="fog" args={['#0a0e17', 10, 50]} />
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <Sphere args={[1.2, 64, 64]} position={[0, 0, -15]}>
          <meshStandardMaterial color="#FFD700" emissive="#FF6B00" emissiveIntensity={0.8} roughness={0.2} metalness={0.8} />
          <pointLight intensity={2} color="#FFD700" distance={30} />
        </Sphere>
        <Sphere args={[1.5, 32, 32]} position={[0, 0, -15]}>
          <meshBasicMaterial color="#FF9500" transparent opacity={0.2} side={THREE.BackSide} />
        </Sphere>
      </Float>
      <group ref={groupRef}>
        <Float speed={1.5} rotationIntensity={0.5}>
          <Sphere args={[0.4, 32, 32]} position={[5, 2, -10]}>
            <meshStandardMaterial color="#1cb3ff" emissive="#0088cc" emissiveIntensity={0.3} roughness={0.5} />
          </Sphere>
          <Ring args={[0.6, 0.65, 32]} position={[5, 2, -10]} rotation={[Math.PI / 4, 0, 0]}>
            <meshBasicMaterial color="#1cb3ff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </Ring>
        </Float>
        <Float speed={2} rotationIntensity={0.3}>
          <Sphere args={[0.6, 32, 32]} position={[-6, -1, -12]}>
            <meshStandardMaterial color="#ff6b8b" emissive="#ff2e5d" emissiveIntensity={0.2} roughness={0.6} />
          </Sphere>
        </Float>
        <Float speed={1} rotationIntensity={0.4}>
          <Sphere args={[0.3, 32, 32]} position={[3, -3, -8]}>
            <meshStandardMaterial color="#52dd38" emissive="#2bb120" emissiveIntensity={0.4} roughness={0.4} />
          </Sphere>
        </Float>
      </group>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlesPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.05} sizeAttenuation color="#FFFFFF" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </points>
      {Array.from({ length: 8 }).map((_, i) => (
        <Float key={i} speed={0.5 + Math.random() * 0.5}>
          <Torus args={[0.08, 0.02, 8, 24]} position={[Math.cos((i * Math.PI) / 4) * 8, Math.sin((i * Math.PI) / 4) * 8, -10 + Math.sin(i) * 2]}>
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

export default function LoginBackground3D() {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} dpr={[1, 2]}>
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
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
}
