/**
 * TrafficCars — Renders NPC traffic vehicles.
 *
 * Reads active traffic cars from trafficStore and renders them
 * as 3D meshes with appropriate colors and orientations.
 */

import { useMemo } from 'react';
import { useTrafficStore } from '@/stores/trafficStore';
import { TRAFFIC_VEHICLE_TEMPLATES } from '@/constants/traffic';

/* ─────────────────────────────────────────────
 * TrafficCars Component
 * ───────────────────────────────────────────── */

export function TrafficCars() {
  const activeCars = useTrafficStore((state) => state.activeCars);

  const carEntries = useMemo(() => Array.from(activeCars.entries()), [activeCars]);

  if (carEntries.length === 0) return null;

  return (
    <group>
      {carEntries.map(([carId, car]) => (
        <TrafficCar key={carId} car={car} />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────
 * Single TrafficCar Component
 * ───────────────────────────────────────────── */

interface TrafficCarProps {
  car: import('@/types/traffic').TrafficCar;
}

function TrafficCar({ car }: TrafficCarProps) {
  const template = TRAFFIC_VEHICLE_TEMPLATES.find((t) => t.category === car.category) || TRAFFIC_VEHICLE_TEMPLATES[0];

  return (
    <group
      position={[car.position.x, car.position.y + 0.5, car.position.z]}
      rotation={[0, car.rotation, 0]}
    >
      {/* Vehicle body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[car.bodyWidth, car.bodyHeight, car.bodyLength]} />
        <meshStandardMaterial color={car.color} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, car.cabinHeight * 0.6, -0.1]}>
        <boxGeometry args={[car.bodyWidth * 0.8, car.cabinHeight * 0.5, car.bodyLength * 0.45]} />
        <meshStandardMaterial color="#1d3557" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, car.cabinHeight * 0.5, car.bodyLength * 0.25]}>
        <boxGeometry args={[car.bodyWidth * 0.7, car.cabinHeight * 0.4, 0.05]} />
        <meshStandardMaterial color="#a8dadc" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>

      {/* Headlights */}
      <mesh position={[-car.bodyWidth * 0.35, 0, car.bodyLength * 0.5]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[car.bodyWidth * 0.35, 0, car.bodyLength * 0.5]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.5} />
      </mesh>

      {/* Tail lights */}
      <mesh position={[-car.bodyWidth * 0.35, 0, -car.bodyLength * 0.5]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
        <meshStandardMaterial color="#ef233c" emissive="#ef233c" emissiveIntensity={car.brakeLightsOn ? 2 : 0.5} />
      </mesh>
      <mesh position={[car.bodyWidth * 0.35, 0, -car.bodyLength * 0.5]}>
        <boxGeometry args={[0.3, 0.15, 0.05]} />
        <meshStandardMaterial color="#ef233c" emissive="#ef233c" emissiveIntensity={car.brakeLightsOn ? 2 : 0.5} />
      </mesh>

      {/* Turn signals */}
      {car.turnSignalLeft && (
        <mesh position={[-car.bodyWidth * 0.55, -0.1, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.3]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
        </mesh>
      )}
      {car.turnSignalRight && (
        <mesh position={[car.bodyWidth * 0.55, -0.1, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.3]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} />
        </mesh>
      )}

      {/* Wheels */}
      <TrafficCarWheel x={-car.bodyWidth * 0.5} z={car.bodyLength * 0.3} />
      <TrafficCarWheel x={car.bodyWidth * 0.5} z={car.bodyLength * 0.3} />
      <TrafficCarWheel x={-car.bodyWidth * 0.5} z={-car.bodyLength * 0.3} />
      <TrafficCarWheel x={car.bodyWidth * 0.5} z={-car.bodyLength * 0.3} />
    </group>
  );
}

/* ─────────────────────────────────────────────
 * TrafficCarWheel Component
 * ───────────────────────────────────────────── */

function TrafficCarWheel({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, -0.35, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.3, 0.3, 0.25, 12]} />
      <meshStandardMaterial color="#2b2d42" metalness={0.3} roughness={0.7} />
    </mesh>
  );
}
