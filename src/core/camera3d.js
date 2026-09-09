/**
 * Architecture Helping Hand — Camera Model (3D)
 *
 * One camera model shared by the 3D massing view, the 4-view split, and any
 * future 3D editing. Built on the same azimuth/elevation/zoom/pan convention
 * as massing-3d.projectPoint3D so existing renders are unaffected; this
 * module ADDS the missing direction: screen → world ray (picking) and the
 * named architectural view presets (Top/Bottom/Front/Back/Left/Right/
 * Perspective/Isometric) that the compass and view commands map to.
 */

import { Vec3 } from './geometry3d.js';

/**
 * Named view presets. azimuth/elevation in degrees (massing-3d convention),
 * orthographic projection for all architectural views.
 */
export const VIEW_PRESETS = Object.freeze({
  top:         { azimuth: 0,   elevation: 89.9, label: 'Top',      axes: { right: '+X', up: '+Y' } },
  bottom:      { azimuth: 0,   elevation: -89.9, label: 'Bottom',  axes: { right: '+X', up: '-Y' } },
  front:       { azimuth: 0,   elevation: 0,    label: 'Front',    axes: { right: '+X', up: '+Z' } },
  back:        { azimuth: 180, elevation: 0,    label: 'Back',     axes: { right: '-X', up: '+Z' } },
  left:        { azimuth: -90, elevation: 0,    label: 'Left',     axes: { right: '-Y', up: '+Z' } },
  right:       { azimuth: 90,  elevation: 0,    label: 'Right',    axes: { right: '+Y', up: '+Z' } },
  perspective: { azimuth: 45,  elevation: 35.264, label: 'Perspective', axes: { right: '+X', up: '+Z' } },
  isometric_ne:{ azimuth: 45,  elevation: 35.264, label: 'Isometric NE' },
  isometric_nw:{ azimuth: 135, elevation: 35.264, label: 'Isometric NW' },
  isometric_se:{ azimuth: -45, elevation: 35.264, label: 'Isometric SE' },
  isometric_sw:{ azimuth: -135, elevation: 35.264, label: 'Isometric SW' }
});

/** Creates a normalized camera state. */
export function createCamera3D({ preset = 'perspective', azimuth = 45, elevation = 35.264, zoom = 40, panX = 0, panY = 0, target = { x: 0, y: 0, z: 0 }, orthographic = true } = {}) {
  const p = VIEW_PRESETS[preset];
  return {
    preset: p ? preset : null,
    azimuth: p ? p.azimuth : azimuth,
    elevation: p ? p.elevation : elevation,
    zoom, panX, panY, target: { ...target },
    projection: orthographic ? 'orthographic' : 'perspective',
    orthographic
  };
}

/** View direction unit vector (the direction the depth buffer increases along).
 *  massing-3d depth = z·sinEl + (x·sinAz + y·cosAz)·cosEl, so the gradient is
 *  (sinAz·cosEl, cosAz·cosEl, sinEl). */
export function cameraViewDirection(camera) {
  const az = (camera.azimuth * Math.PI) / 180;
  const el = (camera.elevation * Math.PI) / 180;
  return Vec3.normalize({
    x: Math.sin(az) * Math.cos(el),
    y: Math.cos(az) * Math.cos(el),
    z: Math.sin(el)
  });
}

/** Camera right and up basis vectors. */
export function cameraBasis(camera) {
  const forward = cameraViewDirection(camera);
  const worldUp = { x: 0, y: 0, z: 1 };
  // forward ≈ ±worldUp for top/bottom — use a stable fallback
  const upRef = Math.abs(Vec3.dot(forward, worldUp)) > 0.999
    ? { x: 0, y: 1, z: 0 }
    : worldUp;
  const right = Vec3.normalize(Vec3.cross(forward, upRef));
  const up = Vec3.cross(right, forward);
  return { forward, right, up };
}

/** World → screen (2D). Byte-compatible with massing-3d.projectPoint3D.
 *  camera.target translates the world before projection, so the reverse
 *  (screenToWorldRay) stays an exact inverse for any target. */
export function worldToScreen3D(p, camera) {
  const az = ((camera.azimuth ?? 45) * Math.PI) / 180;
  const el = ((camera.elevation ?? 35.264) * Math.PI) / 180;
  const zoom = camera.zoom || 40;
  const cosAz = Math.cos(az), sinAz = Math.sin(az);
  const tx = p.x - (camera.target?.x || 0);
  const ty = p.y - (camera.target?.y || 0);
  const z1 = p.z - (camera.target?.z || 0);
  const x1 = tx * cosAz - ty * sinAz;
  const y1 = tx * sinAz + ty * cosAz;
  const cosEl = Math.cos(el), sinEl = Math.sin(el);
  const screenX = camera.panX + x1 * zoom;
  const screenY = camera.panY - (z1 * cosEl - y1 * sinEl) * zoom;
  const depth = z1 * sinEl + y1 * cosEl;
  return { x: screenX, y: screenY, depth };
}

/** Screen point → world ray (picking). camera.panX/panY are screen px.
 *  Exact inverse of worldToScreen3D. All world points projecting to this
 *  screen point form a line: solve for the point on that line at z=0 (or
 *  y1=0 when the view is horizontal). */
export function screenToWorldRay(screenX, screenY, camera) {
  const az = ((camera.azimuth ?? 45) * Math.PI) / 180;
  const el = ((camera.elevation ?? 35.264) * Math.PI) / 180;
  const zoom = camera.zoom || 40;
  const vx = (screenX - camera.panX) / zoom;
  const vy = (screenY - camera.panY) / zoom;
  const cosAz = Math.cos(az), sinAz = Math.sin(az);
  const cosEl = Math.cos(el), sinEl = Math.sin(el);
  let x1 = vx, y1, z1;
  if (Math.abs(sinEl) > 1e-6) {
    y1 = vy / sinEl;
    z1 = 0;
  } else {
    // horizontal view (plan): y1 = 0, solve z from vy = −z·cosEl
    y1 = 0;
    z1 = -vy / cosEl;
  }
  const origin = {
    x: x1 * cosAz + y1 * sinAz + (camera.target?.x || 0),
    y: -x1 * sinAz + y1 * cosAz + (camera.target?.y || 0),
    z: z1 + (camera.target?.z || 0)
  };
  const direction = cameraViewDirection(camera);
  return { origin, direction };
}

/** Orbit: change azimuth/elevation (clamped to avoid pole flip). */
export function orbitCamera(camera, deltaAzimuthDeg, deltaElevationDeg) {
  let azimuth = camera.azimuth + deltaAzimuthDeg;
  let elevation = camera.elevation + deltaElevationDeg;
  elevation = Math.max(-89.9, Math.min(89.9, elevation));
  if (azimuth > 180) azimuth -= 360;
  if (azimuth < -180) azimuth += 360;
  return { ...camera, azimuth, elevation };
}

/** Pan: shift the screen offset (world-anchored via target). */
export function panCamera(camera, deltaScreenX, deltaScreenY) {
  return { ...camera, panX: camera.panX + deltaScreenX, panY: camera.panY + deltaScreenY };
}

/** Zoom: scale px/meter clamped to sane architectural bounds. */
export function zoomCamera(camera, factor) {
  const zoom = Math.max(2, Math.min(400, (camera.zoom || 40) * factor));
  return { ...camera, zoom };
}
