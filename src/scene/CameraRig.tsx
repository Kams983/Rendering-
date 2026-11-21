import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
import { cameraStateAt } from "./cameraMath";

/**
 * A pure function of the frame number. No useFrame, no clock.
 * Every value comes from cameraMath.cameraStateAt, which is also what the
 * offline frame-safety check evaluates.
 */
export const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const state = cameraStateAt(frame);

  camera.position.set(state.position[0], state.position[1], state.position[2]);
  camera.lookAt(state.target[0], state.target[1], state.target[2]);
  camera.fov = state.fov;
  camera.near = state.near;
  camera.far = state.far;
  camera.updateProjectionMatrix();

  // Dutch tilt during chaos moments, applied after lookAt.
  camera.rotation.z += state.dutch;

  return null;
};
