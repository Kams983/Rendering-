/**
 * Layout for the "ASK / SEARCH / LEARN" 3D labels of the search-bar station.
 *
 * They used to be pinned to world x = -1.85 / 0 / +1.85, but the station camera
 * sits off-axis at x = 2.85, so at that depth ASK and LEARN fell outside the
 * frame. The layout is now built in view space: a plane perpendicular to the
 * camera axis, centred on it, so the labels sit inside the safe area at every
 * FOV the station uses.
 *
 * Pure data built with three only, so scripts/check-caption-fit.ts measures the
 * same positions the scene renders.
 */
import * as THREE from "three";
import { STATIONS } from "./timeline";

const HELP_STATION = STATIONS[5];

const CAMERA = new THREE.Vector3(...HELP_STATION.camera);
const TARGET = new THREE.Vector3(...HELP_STATION.look);
const FORWARD = TARGET.clone().sub(CAMERA).normalize();
const RIGHT = new THREE.Vector3()
  .crossVectors(FORWARD, new THREE.Vector3(0, 1, 0))
  .normalize();
const UP = new THREE.Vector3().crossVectors(RIGHT, FORWARD).normalize();

/** Distance along the camera axis where the labels float. */
const DEPTH = 5.6;

const place = (lateral: number, lift: number): [number, number, number] => {
  const point = CAMERA.clone()
    .addScaledVector(FORWARD, DEPTH)
    .addScaledVector(RIGHT, lateral)
    .addScaledVector(UP, lift);
  return [point.x, point.y, point.z];
};

export type HelpLabel = {
  text: string;
  size: number;
  /** World position, already inside the station's safe area. */
  position: [number, number, number];
};

export const HELP_LABELS: HelpLabel[] = [
  { text: "ASK", size: 0.15, position: place(-0.85, -0.16) },
  { text: "SEARCH", size: 0.2, position: place(0, 0.34) },
  { text: "LEARN", size: 0.15, position: place(0.85, -0.16) },
];
