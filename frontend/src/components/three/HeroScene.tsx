import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Brand palette (matches FeraSetu orange + neon accents)
const ORANGE = '#ff6b35';
const ORANGE_HOT = '#ff9a6c';
const INDIGO = '#6366f1';
const EMERALD = '#10b981';

type Tier = 'high' | 'low';

function useTier(): Tier {
  return useMemo<Tier>(() => {
    if (typeof navigator === 'undefined') return 'high';
    const cores = navigator.hardwareConcurrency ?? 8;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (cores <= 4 || mem <= 4 || coarse) return 'low';
    return 'high';
  }, []);
}

// Shared pointer state (normalized -0.5..0.5), updated outside the render loop.
const pointer = { x: 0, y: 0, scroll: 0 };

function PointerTracker() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
    };
    const onScroll = () => {
      pointer.scroll = window.scrollY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return null;
}

// The glowing "engine of your shop" — a distorted, breathing emissive core.
function Core({ tier, still }: { tier: Tier; still: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = mesh.current;
    if (!m || still) return;
    const t = state.clock.elapsedTime;
    m.rotation.y = t * 0.2;
    m.rotation.x = Math.sin(t * 0.25) * 0.2;
    const breathe = 1 + Math.sin(t * 0.9) * 0.04;
    m.scale.setScalar(breathe);
  });
  const core = (
    <>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.75, tier === 'high' ? 16 : 6]} />
        <MeshDistortMaterial
          color={ORANGE}
          emissive={ORANGE}
          emissiveIntensity={2.3}
          roughness={0.15}
          metalness={0.7}
          distort={tier === 'high' ? 0.42 : 0.3}
          speed={still ? 0 : 1.8}
        />
      </mesh>
      {/* Inner hot glow */}
      <mesh scale={0.66}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={ORANGE_HOT} transparent opacity={0.6} />
      </mesh>
    </>
  );
  if (still) return <group position={[0, 0.2, 0]}>{core}</group>;
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.8} position={[0, 0.2, 0]}>
      {core}
    </Float>
  );
}

// Wireframe satellites orbiting the core — "your products in motion".
function Satellites({ tier, still }: { tier: Tier; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const sats = useMemo(
    () => [
      { r: 3.1, size: 0.5, speed: 0.45, color: INDIGO, y: 0.7, phase: 0 },
      { r: 3.7, size: 0.38, speed: -0.32, color: EMERALD, y: -1.0, phase: 2.1 },
      { r: 2.7, size: 0.36, speed: 0.6, color: ORANGE_HOT, y: 1.5, phase: 4.2 },
      { r: 4.3, size: 0.3, speed: -0.24, color: INDIGO, y: -0.5, phase: 1.0 },
      { r: 2.4, size: 0.28, speed: 0.5, color: EMERALD, y: 0.2, phase: 5.3 },
    ],
    []
  );
  useFrame((state) => {
    if (group.current && !still) group.current.rotation.y = state.clock.elapsedTime * 0.1;
  });
  return (
    <group ref={group}>
      {sats.map((s, i) => (
        <Orbiter key={i} {...s} detail={tier === 'high' ? 1 : 0} still={still} />
      ))}
    </group>
  );
}

function Orbiter({
  r, size, speed, color, y, phase, detail, still,
}: {
  r: number; size: number; speed: number; color: string; y: number; phase: number; detail: number; still: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  // Static fallback position so reduced-motion still shows the satellites in place.
  const staticPos = useMemo<[number, number, number]>(
    () => [Math.cos(phase) * r, y, Math.sin(phase) * r],
    [r, y, phase]
  );
  useFrame((state) => {
    const m = ref.current;
    if (!m || still) return;
    const t = state.clock.elapsedTime * speed + phase;
    m.position.set(Math.cos(t) * r, y + Math.sin(t * 1.3) * 0.4, Math.sin(t) * r);
    m.rotation.x += 0.01;
    m.rotation.y += 0.012;
  });
  return (
    <mesh ref={ref} position={staticPos}>
      <icosahedronGeometry args={[size, detail]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} wireframe roughness={0.4} />
    </mesh>
  );
}

// Neon particle starfield backdrop.
function Starfield({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color(ORANGE), new THREE.Color(INDIGO), new THREE.Color(EMERALD), new THREE.Color('#ffffff')];
    for (let i = 0; i < count; i++) {
      const radius = 7 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.085}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Camera reacts to pointer (parallax) and scroll (dolly out as you read).
function CameraRig({ still }: { still: boolean }) {
  const { camera } = useThree();
  useFrame(() => {
    if (still) { camera.position.set(0, 0.2, 7); camera.lookAt(0, 0, 0); return; }
    const targetX = pointer.x * 2.4;
    const targetY = -pointer.y * 1.8 + 0.2;
    const scrollDolly = Math.min(pointer.scroll / 700, 1) * 2.5;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (7 + scrollDolly - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const tier = useTier();
  const [contextLost, setContextLost] = useState(false);
  const starCount = tier === 'high' ? 1600 : 600;
  const bloom = tier === 'high';

  if (contextLost) return null;

  return (
    <Canvas
      camera={{ position: [0, 0.2, 7], fov: 52 }}
      dpr={tier === 'high' ? [1, 1.8] : [1, 1.2]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          setContextLost(true);
        });
      }}
    >
      <PointerTracker />
      <CameraRig still={reducedMotion} />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={3} color={ORANGE} />
      <pointLight position={[-6, -3, -4]} intensity={2} color={INDIGO} />
      <pointLight position={[0, 4, -6]} intensity={1.4} color={EMERALD} />

      <Core tier={tier} still={reducedMotion} />
      <Satellites tier={tier} still={reducedMotion} />
      <Starfield count={starCount} />

      {bloom && (
        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={1.6} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur radius={0.85} />
          <Vignette eskil={false} offset={0.2} darkness={0.9} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
