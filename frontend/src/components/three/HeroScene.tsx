import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// FeraSetu Brand Palette (Sovereign Blue, Saffron Orange, Settlement Emerald, Violet)
const ORANGE = '#EA580C';
const ORANGE_HOT = '#F97316';
const BLUE = '#0052FF';
const EMERALD = '#10B981';
const VIOLET = '#6366F1';
const GOLD = '#FBBF24';

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

const pointer = { x: 0, y: 0, scroll: 0 };
const dragInteraction = {
  isPointerDown: false,
  startX: 0,
  startY: 0,
  currentRotY: -0.15,
  targetRotY: -0.15,
  currentRotX: 0.18,
  targetRotX: 0.18,
};

function PointerTracker({ interactive = false }: { interactive?: boolean }) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;

      if (interactive && dragInteraction.isPointerDown) {
        const dx = e.clientX - dragInteraction.startX;
        const dy = e.clientY - dragInteraction.startY;
        dragInteraction.targetRotY += dx * 0.003;
        dragInteraction.targetRotX += dy * 0.002;
        // Bounded angle: never spins 360, keeps main circle facing viewer
        dragInteraction.targetRotY = Math.max(-0.45, Math.min(0.25, dragInteraction.targetRotY));
        dragInteraction.targetRotX = Math.max(0.05, Math.min(0.38, dragInteraction.targetRotX));
        dragInteraction.startX = e.clientX;
        dragInteraction.startY = e.clientY;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      dragInteraction.isPointerDown = true;
      dragInteraction.startX = e.clientX;
      dragInteraction.startY = e.clientY;
    };

    const onPointerUp = () => {
      dragInteraction.isPointerDown = false;
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
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('scroll', onScroll);
    };
  }, [interactive]);
  return null;
}

// ========================================================================
// THE MAIN BIG CIRCLE: Glowing Sovereign Horizon ("Engine of Your Shop")
// ========================================================================
function MainBigCircleCore({ tier, still }: { tier: Tier; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const coreMesh = useRef<THREE.Mesh>(null);
  const outerGeodesic = useRef<THREE.Mesh>(null);
  const innerGlow = useRef<THREE.Mesh>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current && !still) {
      // Serene vertical floating bob starting prominently from above without 360 spinning
      group.current.position.y = 0.45 + Math.sin(t * 0.8) * 0.06;

      if (!dragInteraction.isPointerDown) {
        // Calm subtle sway (±1.5 degrees, strictly facing forward)
        dragInteraction.targetRotY = -0.15 + Math.sin(t * 0.4) * 0.035;
        dragInteraction.targetRotX = 0.18 + Math.cos(t * 0.4) * 0.02;
      }
      dragInteraction.currentRotY += (dragInteraction.targetRotY - dragInteraction.currentRotY) * 0.08;
      dragInteraction.currentRotX += (dragInteraction.targetRotX - dragInteraction.currentRotX) * 0.08;

      group.current.rotation.y = dragInteraction.currentRotY;
      group.current.rotation.x = dragInteraction.currentRotX;
    }

    if (!still) {
      if (coreMesh.current) {
        // Breathing scale pulsation (natural heartbeat)
        const breathe = 1 + Math.sin(t * 1.2) * 0.04;
        coreMesh.current.scale.setScalar(breathe);
      }
      if (outerGeodesic.current) {
        outerGeodesic.current.rotation.z = Math.sin(t * 0.25) * 0.06;
      }
      if (ring1.current) {
        ring1.current.rotation.z = t * 0.08;
      }
      if (ring2.current) {
        ring2.current.rotation.z = -t * 0.06;
      }
      if (ring3.current) {
        ring3.current.rotation.z = t * 0.04;
      }
    }
  });

  return (
    <group ref={group} position={[0, 0.45, 0]}>
      {/* 1. Core Sovereign Nucleus: Medium-sized Emissive Faceted Sphere */}
      <mesh ref={coreMesh}>
        <icosahedronGeometry args={[0.92, tier === 'high' ? 3 : 2]} />
        <meshStandardMaterial
          color={ORANGE}
          emissive={ORANGE_HOT}
          emissiveIntensity={1.3}
          roughness={0.2}
          metalness={0.6}
          flatShading
        />
      </mesh>

      {/* 2. Outer Geodesic Wireframe Shell (Sovereign Blue Protection) */}
      <mesh ref={outerGeodesic} scale={1.25}>
        <icosahedronGeometry args={[0.92, 1]} />
        <meshStandardMaterial
          color={BLUE}
          emissive={BLUE}
          emissiveIntensity={1.2}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* 3. Luminous Inner Shimmer Glow */}
      <mesh ref={innerGlow} scale={0.65}>
        <sphereGeometry args={[0.9, 20, 20]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.6} />
      </mesh>

      {/* 4. THE MAIN BIG CIRCLE: Grand Sovereign Horizon Ring */}
      <mesh ref={ring1} rotation={[Math.PI / 2.3, 0.12, 0]}>
        <torusGeometry args={[3.8, 0.042, 16, 160]} />
        <meshStandardMaterial color={BLUE} emissive={BLUE} emissiveIntensity={1.4} roughness={0.1} />
      </mesh>

      {/* 5. Concentric Counter-Orbital Ring (Settlement Circuit) */}
      <mesh ref={ring2} rotation={[-Math.PI / 2.4, -0.18, 0]}>
        <torusGeometry args={[2.7, 0.032, 16, 140]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.2} />
      </mesh>

      {/* 6. Delicate Outer Horizon Ring (Expanded Freedom Perimeter) */}
      <mesh ref={ring3} rotation={[Math.PI / 2.8, 0.25, 0]}>
        <torusGeometry args={[4.6, 0.024, 16, 160]} />
        <meshStandardMaterial color={EMERALD} emissive={EMERALD} emissiveIntensity={1.1} />
      </mesh>
    </group>
  );
}

// ========================================================================
// SATELLITES: Storefront, WhatsApp, Bank & AI Orbiting the Main Circle
// ========================================================================
interface SatelliteData {
  r: number;
  size: number;
  speed: number;
  color: string;
  y: number;
  phase: number;
  label: string;
}

function OrbitingSatellites({ tier, still }: { tier: Tier; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const sats: SatelliteData[] = useMemo(
    () => [
      { r: 3.3, size: 0.44, speed: 0.42, color: BLUE, y: 0.5, phase: 0, label: 'Storefront' },
      { r: 3.8, size: 0.38, speed: -0.34, color: EMERALD, y: -0.7, phase: 2.2, label: '0% Bank Deposit' },
      { r: 2.8, size: 0.36, speed: 0.52, color: ORANGE, y: 1.2, phase: 4.1, label: 'Customer Cart' },
      { r: 4.2, size: 0.32, speed: -0.26, color: VIOLET, y: -0.3, phase: 1.2, label: 'Fero AI Shield' },
    ],
    []
  );

  return (
    <group ref={group}>
      {sats.map((s, i) => (
        <SatelliteNode key={i} {...s} detail={tier === 'high' ? 1 : 0} still={still} />
      ))}
    </group>
  );
}

function SatelliteNode({
  r,
  size,
  speed,
  color,
  y,
  phase,
  detail,
  still,
}: SatelliteData & { detail: number; still: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const m = ref.current;
    if (!m || still) return;
    const t = state.clock.elapsedTime * speed + phase;
    m.position.set(Math.cos(t) * r, y + Math.sin(t * 1.4) * 0.35, Math.sin(t) * r);
    m.rotation.x += 0.01;
    m.rotation.y += 0.014;
  });

  const staticPos: [number, number, number] = [Math.cos(phase) * r, y, Math.sin(phase) * r];

  return (
    <mesh ref={ref} position={staticPos}>
      <icosahedronGeometry args={[size, detail]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.4}
        wireframe
        roughness={0.2}
      />
    </mesh>
  );
}

// ========================================================================
// FREEDOM ROAMING SPHERES: Wireframe Line Spheres Roaming Freely Everywhere
// ========================================================================
interface RoamingSphereItem {
  baseX: number;
  baseY: number;
  baseZ: number;
  radius: number;
  color: string;
  speedX: number;
  speedY: number;
  speedZ: number;
  ampX: number;
  ampY: number;
  ampZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  phase: number;
  geometryType: 'icosahedron' | 'sphere';
}

function FreedomRoamingSpheres({ still }: { still: boolean }) {
  const spheres: RoamingSphereItem[] = useMemo(
    () => [
      // 1. High Top Aura (above "Your business is yours")
      { baseX: 0.1, baseY: 1.85, baseZ: -0.6, radius: 0.44, color: VIOLET, speedX: 0.35, speedY: 0.45, speedZ: 0.3, ampX: 0.6, ampY: 0.35, ampZ: 0.4, rotSpeedX: 0.005, rotSpeedY: 0.008, phase: 0.2, geometryType: 'sphere' },
      // 2. High Flank Left
      { baseX: -3.2, baseY: 1.6, baseZ: 0.3, radius: 0.38, color: BLUE, speedX: 0.4, speedY: 0.5, speedZ: 0.35, ampX: 0.7, ampY: 0.4, ampZ: 0.3, rotSpeedX: 0.007, rotSpeedY: -0.009, phase: 1.1, geometryType: 'icosahedron' },
      // 3. High Flank Right
      { baseX: 3.3, baseY: 1.65, baseZ: 0.2, radius: 0.40, color: ORANGE, speedX: 0.38, speedY: 0.42, speedZ: 0.32, ampX: 0.65, ampY: 0.38, ampZ: 0.35, rotSpeedX: -0.006, rotSpeedY: 0.01, phase: 2.3, geometryType: 'icosahedron' },
      // 4. Headline Level Left
      { baseX: -2.1, baseY: 0.95, baseZ: 1.1, radius: 0.32, color: EMERALD, speedX: 0.45, speedY: 0.55, speedZ: 0.4, ampX: 0.5, ampY: 0.3, ampZ: 0.25, rotSpeedX: 0.009, rotSpeedY: 0.012, phase: 3.4, geometryType: 'icosahedron' },
      // 5. Headline Level Right
      { baseX: 2.2, baseY: 0.90, baseZ: 1.0, radius: 0.35, color: GOLD, speedX: 0.42, speedY: 0.48, speedZ: 0.38, ampX: 0.55, ampY: 0.32, ampZ: 0.3, rotSpeedX: -0.008, rotSpeedY: -0.01, phase: 4.5, geometryType: 'sphere' },
      // 6. Far Left Free Roamer
      { baseX: -4.4, baseY: 0.8, baseZ: -0.4, radius: 0.36, color: BLUE, speedX: 0.32, speedY: 0.38, speedZ: 0.28, ampX: 0.8, ampY: 0.45, ampZ: 0.4, rotSpeedX: 0.006, rotSpeedY: 0.007, phase: 5.2, geometryType: 'icosahedron' },
      // 7. Far Right Free Roamer
      { baseX: 4.5, baseY: 0.85, baseZ: -0.3, radius: 0.34, color: EMERALD, speedX: 0.34, speedY: 0.36, speedZ: 0.3, ampX: 0.75, ampY: 0.42, ampZ: 0.38, rotSpeedX: -0.007, rotSpeedY: 0.009, phase: 0.8, geometryType: 'icosahedron' },
      // 8. Foreground Floating Bubble Left
      { baseX: -1.3, baseY: 0.35, baseZ: 1.6, radius: 0.26, color: ORANGE_HOT, speedX: 0.52, speedY: 0.6, speedZ: 0.45, ampX: 0.4, ampY: 0.25, ampZ: 0.2, rotSpeedX: 0.01, rotSpeedY: 0.014, phase: 1.9, geometryType: 'icosahedron' },
      // 9. Foreground Floating Bubble Right
      { baseX: 1.4, baseY: 0.28, baseZ: 1.5, radius: 0.25, color: BLUE, speedX: 0.48, speedY: 0.58, speedZ: 0.42, ampX: 0.45, ampY: 0.28, ampZ: 0.22, rotSpeedX: -0.011, rotSpeedY: -0.012, phase: 2.7, geometryType: 'icosahedron' },
      // 10. Mid-high Left Glider
      { baseX: -3.2, baseY: 0.65, baseZ: 0.5, radius: 0.36, color: GOLD, speedX: 0.36, speedY: 0.44, speedZ: 0.34, ampX: 0.5, ampY: 0.25, ampZ: 0.3, rotSpeedX: 0.006, rotSpeedY: 0.008, phase: 3.8, geometryType: 'sphere' },
      // 11. Mid-high Right Glider
      { baseX: 3.3, baseY: 0.70, baseZ: 0.6, radius: 0.34, color: VIOLET, speedX: 0.39, speedY: 0.46, speedZ: 0.36, ampX: 0.52, ampY: 0.26, ampZ: 0.32, rotSpeedX: -0.008, rotSpeedY: 0.007, phase: 4.9, geometryType: 'icosahedron' },
      // 12. Deep Cosmic Roamer Top Center
      { baseX: -0.8, baseY: 2.1, baseZ: -1.2, radius: 0.42, color: BLUE, speedX: 0.28, speedY: 0.34, speedZ: 0.25, ampX: 0.7, ampY: 0.4, ampZ: 0.45, rotSpeedX: 0.004, rotSpeedY: 0.006, phase: 1.4, geometryType: 'icosahedron' },
      // 13. Deep Cosmic Roamer Right
      { baseX: 1.8, baseY: 2.0, baseZ: -1.0, radius: 0.38, color: EMERALD, speedX: 0.3, speedY: 0.35, speedZ: 0.26, ampX: 0.68, ampY: 0.38, ampZ: 0.42, rotSpeedX: -0.005, rotSpeedY: 0.007, phase: 2.8, geometryType: 'sphere' },
      // 14. Wide Left Glider High
      { baseX: -4.8, baseY: 1.1, baseZ: -0.6, radius: 0.35, color: ORANGE, speedX: 0.26, speedY: 0.32, speedZ: 0.24, ampX: 0.65, ampY: 0.35, ampZ: 0.4, rotSpeedX: 0.005, rotSpeedY: 0.006, phase: 3.6, geometryType: 'icosahedron' },
      // 15. Wide Right Glider High
      { baseX: 4.9, baseY: 1.15, baseZ: -0.5, radius: 0.33, color: BLUE, speedX: 0.27, speedY: 0.33, speedZ: 0.25, ampX: 0.62, ampY: 0.38, ampZ: 0.38, rotSpeedX: -0.006, rotSpeedY: 0.005, phase: 4.7, geometryType: 'icosahedron' },
      // 16. Upper Atmosphere Apex Center
      { baseX: -0.3, baseY: 2.35, baseZ: -0.5, radius: 0.32, color: EMERALD, speedX: 0.34, speedY: 0.4, speedZ: 0.3, ampX: 0.5, ampY: 0.25, ampZ: 0.28, rotSpeedX: 0.008, rotSpeedY: -0.01, phase: 0.5, geometryType: 'icosahedron' },
      // 17. Upper Flank Saffron Orb
      { baseX: -1.9, baseY: 1.35, baseZ: 0.6, radius: 0.28, color: ORANGE_HOT, speedX: 0.42, speedY: 0.48, speedZ: 0.35, ampX: 0.45, ampY: 0.24, ampZ: 0.25, rotSpeedX: -0.009, rotSpeedY: 0.011, phase: 2.1, geometryType: 'sphere' },
      // 18. Upper Flank Violet Orb
      { baseX: 2.0, baseY: 1.40, baseZ: 0.5, radius: 0.29, color: VIOLET, speedX: 0.41, speedY: 0.5, speedZ: 0.36, ampX: 0.44, ampY: 0.26, ampZ: 0.24, rotSpeedX: 0.01, rotSpeedY: -0.008, phase: 3.9, geometryType: 'icosahedron' },
    ],
    []
  );

  return (
    <group>
      {spheres.map((s, idx) => (
        <RoamingSphereNode key={idx} {...s} still={still} />
      ))}
    </group>
  );
}

function RoamingSphereNode({
  baseX,
  baseY,
  baseZ,
  radius,
  color,
  speedX,
  speedY,
  speedZ,
  ampX,
  ampY,
  ampZ,
  rotSpeedX,
  rotSpeedY,
  phase,
  geometryType,
  still,
}: RoamingSphereItem & { still: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const m = meshRef.current;
    if (!m || still) return;
    const t = state.clock.elapsedTime;
    
    // Smooth harmonic wandering path through 3D space
    m.position.x = baseX + Math.sin(t * speedX + phase) * ampX;
    m.position.y = baseY + Math.cos(t * speedY + phase) * ampY;
    m.position.z = baseZ + Math.sin(t * speedZ + phase * 1.2) * ampZ;

    m.rotation.x += rotSpeedX;
    m.rotation.y += rotSpeedY;

    // Gentle breathing pulse
    const breathe = 1 + Math.sin(t * 1.4 + phase) * 0.04;
    m.scale.setScalar(breathe);
  });

  return (
    <mesh ref={meshRef} position={[baseX, baseY, baseZ]}>
      {geometryType === 'icosahedron' ? (
        <icosahedronGeometry args={[radius, 1]} />
      ) : (
        <sphereGeometry args={[radius, 12, 12]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.35}
        wireframe={true}
        transparent={true}
        opacity={0.6}
        roughness={0.2}
      />
    </mesh>
  );
}

// ========================================================================
// NEON AMBIENT PARTICLE FIELD
// ========================================================================
function ParticleField({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(ORANGE),
      new THREE.Color(BLUE),
      new THREE.Color(EMERALD),
      new THREE.Color('#FFFFFF'),
    ];
    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [count]);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.075}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Camera reacts to mouse pointer parallax gently
function CameraRig({ still }: { still: boolean }) {
  const { camera } = useThree();
  useFrame(() => {
    if (still) {
      camera.position.set(0, 0.35, 6.8);
      camera.lookAt(0, 0.25, 0);
      return;
    }
    const targetX = pointer.x * 1.6;
    const targetY = -pointer.y * 1.0 + 0.35;
    const scrollDolly = Math.min(pointer.scroll / 700, 1) * 2.2;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (6.8 + scrollDolly - camera.position.z) * 0.05;
    camera.lookAt(0, 0.25, 0);
  });
  return null;
}

export default function HeroScene({
  reducedMotion = false,
  interactive = true,
}: {
  reducedMotion?: boolean;
  interactive?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const tier = useTier();
  const [contextLost, setContextLost] = useState(false);
  const particleCount = tier === 'high' ? 850 : 350;

  if (!mounted || contextLost) return null;

  return (
    <Canvas
      camera={{ position: [0, 0.2, 6.8], fov: 48 }}
      dpr={tier === 'high' ? [1, 1.75] : [1, 1.2]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
      style={{
        position: interactive ? 'relative' : 'absolute',
        inset: interactive ? undefined : 0,
        width: '100%',
        height: '100%',
        touchAction: interactive ? 'none' : undefined,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          setContextLost(true);
        });
      }}
    >
      <PointerTracker interactive={interactive} />
      <CameraRig still={reducedMotion} />

      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 8, 6]} intensity={2.2} color="#FFFFFF" />
      <directionalLight position={[-6, -4, -3]} intensity={1.4} color="#EFF6FF" />
      <pointLight position={[5, 4, 4]} intensity={3.5} color={ORANGE} />
      <pointLight position={[-5, -3, -3]} intensity={2.8} color={BLUE} />
      <pointLight position={[0, 4, -5]} intensity={2.2} color={EMERALD} />

      {/* Main Big Circle (The Sovereign Core) */}
      <MainBigCircleCore tier={tier} still={reducedMotion} />

      {/* Orbiting Satellites */}
      <OrbitingSatellites tier={tier} still={reducedMotion} />

      {/* Freedom Roaming Line Wireframe Spheres (Spread everywhere to show freedom) */}
      <FreedomRoamingSpheres still={reducedMotion} />

      {/* Ambient Particle Field */}
      <ParticleField count={particleCount} />
    </Canvas>
  );
}
