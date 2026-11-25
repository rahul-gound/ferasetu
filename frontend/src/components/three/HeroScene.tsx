import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Brand palette (matches FeraSetu orange + Sovereign Blue + Emerald accents)
const ORANGE = '#ff6b35';
const ORANGE_HOT = '#ff9a6c';
const BLUE = '#0052FF';
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
    let scrollTicking = false;
    const onScroll = () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          pointer.scroll = window.scrollY;
          scrollTicking = false;
        });
        scrollTicking = true;
      }
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

// The glowing "engine of your shop" — a breathing, faceted Sovereign Core with outer wireframe shell.
function Core({ tier, still }: { tier: Tier; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (still) return;
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.position.y = 0.2 + Math.sin(t * 1.1) * 0.22;
    }
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.22;
      mesh.current.rotation.x = Math.sin(t * 0.25) * 0.2;
      const breathe = 1 + Math.sin(t * 0.9) * 0.045;
      mesh.current.scale.setScalar(breathe);
    }
    if (shell.current) {
      shell.current.rotation.y = -t * 0.14;
      shell.current.rotation.z = Math.cos(t * 0.2) * 0.15;
    }
  });

  return (
    <group ref={group} position={[0, 0.2, 0]}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.65, tier === 'high' ? 3 : 2]} />
        <meshStandardMaterial
          color={ORANGE}
          emissive={ORANGE}
          emissiveIntensity={1.2}
          roughness={0.22}
          metalness={0.65}
          flatShading
        />
      </mesh>
      {/* Outer geodesic wireframe cage */}
      <mesh ref={shell} scale={1.18}>
        <icosahedronGeometry args={[1.65, 1]} />
        <meshStandardMaterial
          color={BLUE}
          emissive={BLUE}
          emissiveIntensity={0.85}
          wireframe
          transparent
          opacity={0.45}
        />
      </mesh>
      {/* Inner hot glow */}
      <mesh scale={0.7}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={ORANGE_HOT} transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

// Wireframe satellites orbiting the core — "your products in motion".
function Satellites({ tier, still }: { tier: Tier; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const sats = useMemo(
    () => [
      { r: 3.1, size: 0.48, speed: 0.45, color: INDIGO, y: 0.7, phase: 0 },
      { r: 3.7, size: 0.38, speed: -0.32, color: EMERALD, y: -1.0, phase: 2.1 },
      { r: 2.7, size: 0.36, speed: 0.6, color: ORANGE_HOT, y: 1.5, phase: 4.2 },
      { r: 4.3, size: 0.3, speed: -0.24, color: BLUE, y: -0.5, phase: 1.0 },
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
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} wireframe roughness={0.4} />
    </mesh>
  );
}

// Neon particle starfield backdrop.
function Starfield({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color(ORANGE), new THREE.Color(BLUE), new THREE.Color(EMERALD), new THREE.Color(INDIGO)];
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
        size={0.09}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const tier = useTier();
  const [contextLost, setContextLost] = useState(false);
  const starCount = tier === 'high' ? 900 : 400;

  if (!mounted || contextLost) return null;

  return (
    <Canvas
      camera={{ position: [0, 0.2, 7], fov: 52 }}
      dpr={tier === 'high' ? [1, 1.75] : [1, 1.2]}
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

      <ambientLight intensity={0.75} />
      <pointLight position={[5, 5, 5]} intensity={3.2} color={ORANGE} />
      <pointLight position={[-6, -3, -4]} intensity={2.2} color={BLUE} />
      <pointLight position={[0, 4, -6]} intensity={1.6} color={EMERALD} />

      <Core tier={tier} still={reducedMotion} />
      <Satellites tier={tier} still={reducedMotion} />
      <Starfield count={starCount} />
    </Canvas>
  );
}
