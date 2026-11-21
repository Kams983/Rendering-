/**
 * Offline caption fit check. No rendering.
 *
 *   npm run check:captions
 *
 * Builds the exact Text3D geometry (Helvetiker bold, same size/bevel/spacing as
 * the captions) with three-stdlib in Node, measures its bounding box, and
 * compares it with the visible frustum width at the caption's depth:
 *
 *   visibleWidth = 2 * distance * tan(fov / 2) * aspect
 *
 * Runs both the normal scene FOV and the lowest FOV of the punch-in.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { FontLoader, TextGeometry } from "three-stdlib";
import { ASSETS, VIDEO } from "../src/config";
import {
  SAFE_WIDTH_RATIO,
  balanceLines,
  fitScale,
  visibleExtent,
} from "../src/scene/captionFit";
import { STATIONS, captionFov } from "../src/scene/timeline";
import { cameraStateAt } from "../src/scene/cameraMath";
import { HELP_LABELS } from "../src/scene/helpLabels";

const ASPECT = VIDEO.width / VIDEO.height;
const FONT_JSON = join(process.cwd(), "public", ASSETS.font3d);

const font = new FontLoader().parse(
  JSON.parse(readFileSync(FONT_JSON, "utf8")),
);

type Box = { width: number; height: number };

const measure = (text: string, size: number): Box => {
  const geometry = new TextGeometry(text, {
    font,
    size,
    height: 0.085,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 3,
    curveSegments: 7,
    letterSpacing: 0.015,
    lineHeight: 1.18,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox ?? new THREE.Box3();
  const size3 = new THREE.Vector3();
  box.getSize(size3);
  geometry.dispose();
  return { width: size3.x, height: size3.y };
};

const pad = (value: string, width: number): string =>
  value.length >= width ? value : value + " ".repeat(width - value.length);

const row = (
  label: string,
  text: string,
  size: number,
  distance: number,
  fov: number,
  scale: number,
) => ({
  label,
  box: measure(text, size),
  distance,
  fov,
  scale,
});

/* --------------------------------------------------------------- captions */

const captionRows = (usePunchFov: boolean) =>
  STATIONS.map((station) => {
    const text = balanceLines(station.lines).join("\n");
    const distance = Math.hypot(
      station.camera[0] - station.caption[0],
      station.camera[1] - station.caption[1],
      station.camera[2] - station.caption[2],
    );
    const fov = usePunchFov ? captionFov(station) : station.fov;
    // The component always fits against the worst-case FOV, so the scale is
    // identical in both tables; only the visible width changes.
    const scale = fitScale(
      measure(text, station.size),
      distance,
      captionFov(station),
      ASPECT,
    );
    return {
      ...row(station.lines.join(" / "), text, station.size, distance, fov, scale),
      scale,
    };
  });

const printRows = (heading: string, fovLabel: string, rows: ReturnType<typeof captionRows>) => {
  console.log(`\n${heading} (${fovLabel})`);
  console.log(
    `${pad("caption", 28)}${pad("text width", 13)}${pad("visible width", 15)}` +
      `${pad("fill %", 9)}${pad("scale", 8)}result`,
  );
  let ok = true;
  for (const item of rows) {
    const extent = visibleExtent(item.distance, item.fov, ASPECT);
    const width = item.box.width * item.scale;
    const fill = (width / extent.width) * 100;
    const pass = width <= extent.width * SAFE_WIDTH_RATIO;
    ok = ok && pass;
    console.log(
      `${pad(item.label, 28)}${pad(width.toFixed(3), 13)}${pad(extent.width.toFixed(3), 15)}` +
        `${pad(fill.toFixed(1), 9)}${pad(item.scale.toFixed(3), 8)}${pass ? "PASS" : "FAIL"}`,
    );
  }
  return ok;
};

/* ---------------------------------------------------- search-bar 3D labels */

const helpStation = STATIONS[5];

const labelRows = () => {
  const cam = cameraStateAt(helpStation.start);
  const position = new THREE.Vector3(...cam.position);
  const target = new THREE.Vector3(...cam.target);
  const forward = target.clone().sub(position).normalize();
  const right = new THREE.Vector3()
    .crossVectors(forward, new THREE.Vector3(0, 1, 0))
    .normalize();

  return HELP_LABELS.map((probe) => {
    const rel = new THREE.Vector3(...probe.position).sub(position);
    const depth = Math.max(0.001, rel.dot(forward));
    const lateral = rel.dot(right);
    return { probe, depth, lateral, box: measure(probe.text, probe.size) };
  });
};

const printLabels = () => {
  console.log(
    "\nSearch-bar scene (station help): 3D labels, measured against the camera axis",
  );
  console.log(
    `${pad("label", 28)}${pad("visible width", 15)}${pad("centre offset", 15)}` +
      `${pad("text width", 12)}${pad("fill %", 9)}result`,
  );
  let ok = true;
  const cam = cameraStateAt(helpStation.start);
  for (const item of labelRows()) {
    const extent = visibleExtent(item.depth, cam.fov, ASPECT);
    // The label is centred off-axis, so its whole span from the frame centre
    // is |lateral| + half the text width, inside the 88% safe half-width.
    const reach = Math.abs(item.lateral) + item.box.width / 2;
    const pass = reach <= (extent.width * SAFE_WIDTH_RATIO) / 2;
    ok = ok && pass;
    const fill = ((Math.abs(item.lateral) * 2 + item.box.width) / extent.width) * 100;
    console.log(
      `${pad(`${item.probe.text} (3D label)`, 28)}${pad(extent.width.toFixed(3), 15)}` +
        `${pad(item.lateral.toFixed(2), 15)}${pad(item.box.width.toFixed(3), 12)}` +
        `${pad(fill.toFixed(1), 9)}${pass ? "PASS" : "FAIL"}`,
    );
  }
  return ok;
};

/* -------------------------------------------------------------- reporting */

const normalOk = printRows("Captions", "normal scene FOV", captionRows(false));
const punchOk = printRows("Captions", "lowest FOV (punch-in)", captionRows(true));
const labelsOk = printLabels();

console.log(
  `\n[captions] ${normalOk && punchOk && labelsOk ? "OK" : "FAIL"}: ` +
    `captions ${normalOk ? "fit" : "clip"} at normal FOV, ` +
    `${punchOk ? "fit" : "clip"} at punch-in FOV; ` +
    `3D search labels ${labelsOk ? "fit" : "clip"}.\n`,
);

process.exit(normalOk && punchOk && labelsOk ? 0 : 1);
