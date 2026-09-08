/**
 * 3D Geometry Engine Test Suite — Phase 7 foundational 3D math.
 * Vectors, Mat4 transforms, bounding boxes, rays, planes, clipping,
 * quaternions, camera model round-trips and ray picking.
 */

import {
  Vec3, Mat4, createBoundingBox3D, bbox3AddPoint, bbox3Center, bbox3Intersects,
  createRay, rayIntersectsBox, rayIntersectsTriangle, rayIntersectsFace,
  rayCastMesh, createPlane, planeDistanceToPoint, rayIntersectsPlane,
  clipPolygonAgainstPlane, Quat
} from '../src/core/geometry3d.js';
import {
  createCamera3D, VIEW_PRESETS, cameraViewDirection, worldToScreen3D,
  screenToWorldRay, orbitCamera, panCamera, zoomCamera
} from '../src/core/camera3d.js';

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}
function close(actual, expected, msg, delta = 1e-9) {
  const ok = Math.abs(actual - expected) <= delta;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${actual})`}: ${msg}`);
}
function assertPoint(actual, expected, msg, delta = 1e-9) {
  const ok = Math.abs(actual.x - expected.x) <= delta &&
             Math.abs(actual.y - expected.y) <= delta &&
             Math.abs((actual.z || 0) - (expected.z || 0)) <= delta;
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? '✅ PASS' : `❌ FAIL (got ${JSON.stringify(actual)})`}: ${msg}`);
}

console.log('\n--- 1. Vector3 ---');
{
  const a = { x: 1, y: 2, z: 3 }, b = { x: 4, y: 5, z: 6 };
  assertPoint(Vec3.add(a, b), { x: 5, y: 7, z: 9 }, 'add');
  assertPoint(Vec3.sub(b, a), { x: 3, y: 3, z: 3 }, 'sub');
  assertPoint(Vec3.scale(a, 2), { x: 2, y: 4, z: 6 }, 'scale');
  assert(Vec3.dot(a, b) === 32, 'dot product');
  assertPoint(Vec3.cross(vectorX(), vectorY()), { x: 0, y: 0, z: 1 }, 'cross X×Y = Z');
  close(Vec3.length(a), Math.sqrt(14), 'length');
  const n = Vec3.normalize(vectorX());
  assertPoint(n, { x: 1, y: 0, z: 0 }, 'normalize');
  assertPoint(Vec3.normalize({ x: 0, y: 0, z: 0 }), { x: 0, y: 0, z: 0 }, 'zero vector normalizes safely');
  assertPoint(Vec3.lerp(a, b, 0.5), { x: 2.5, y: 3.5, z: 4.5 }, 'lerp midpoint');
  assertClose(Vec3.distance(a, b), Math.sqrt(27), 'distance');
  function vectorX() { return { x: 1, y: 0, z: 0 }; }
  function vectorY() { return { x: 0, y: 1, z: 0 }; }
  function assertClose(a, b, m) { assert(Math.abs(a - b) < 1e-9, m); }
}

// --- 2. Mat4 ---
console.log('\n--- 2. Mat4 transforms ---');
{
  const p = { x: 1, y: 0, z: 0 };
  assertPoint(Mat4.transformPoint(Mat4.translation(1, 2, 3), p), { x: 2, y: 2, z: 3 }, 'translation');
  assertPoint(Mat4.transformPoint(Mat4.rotationZ(Math.PI / 2), p), { x: 0, y: 1, z: 0 }, 'rotate Z 90°');
  const composed = Mat4.multiply(Mat4.translation(1, 2, 3), Mat4.rotationZ(Math.PI / 2));
  assertPoint(Mat4.transformPoint(composed, p), { x: 1, y: 3, z: 3 }, 'translate ∘ rotate composition (rotate then translate)');
  const scaled = Mat4.transformPoint(Mat4.scaling(2, 3, 4), { x: 1, y: 1, z: 1 });
  assertPoint(scaled, { x: 2, y: 3, z: 4 }, 'scaling');
  const vec = Mat4.transformVector(Mat4.rotationZ(Math.PI), { x: 1, y: 0, z: 0 });
  assertPoint(vec, { x: -1, y: 0, z: 0 }, 'transformVector ignores translation');
  // mirror across z=0 flips z
  const mirrored = Mat4.transformPoint(
    Mat4.mirrorPlane({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }),
    { x: 1, y: 2, z: 5 }
  );
  assertPoint(mirrored, { x: 1, y: 2, z: -5 }, 'mirror across z=0 plane');
  // round trip: rotate 90° then back = identity
  const rot = Mat4.multiply(Mat4.rotationX(-Math.PI / 2), Mat4.rotationX(Math.PI / 2));
  assertPoint(Mat4.transformPoint(rot, p), { x: 1, y: 0, z: 0 }, 'counter rotation = identity');
}

// --- 3. BoundingBox3D ---
console.log('\n--- 3. BoundingBox3D ---');
{
  let box = createBoundingBox3D();
  assert(box.isEmpty, 'new box is empty');
  bbox3AddPoint(box, { x: 1, y: 2, z: 3 });
  bbox3AddPoint(box, { x: 4, y: 5, z: 6 });
  assert(!box.isEmpty, 'box no longer empty');
  assertPoint(bbox3Center(box), { x: 2.5, y: 3.5, z: 4.5 }, 'center');
  assert(!bbox3Intersects(box, createBoundingBox3D()), 'empty box intersects nothing');
  assert(bbox3Intersects(box, { minX: 4, minY: 5, minZ: 6, maxX: 9, maxY: 9, maxZ: 9 }), 'touching boxes intersect');
  assert(!bbox3Intersects(box, { minX: 10, minY: 0, minZ: 0, maxX: 12, maxY: 1, maxZ: 1 }), 'disjoint boxes do not intersect');
}

// --- 4. Rays ---
console.log('\n--- 4. Rays: box, triangle, mesh ---');
{
  const ray = createRay({ x: -5, y: 2.5, z: 2.5 }, { x: 1, y: 0, z: 0 });
  const slab = rayIntersectsBox(ray, { minX: 0, minY: 0, minZ: 0, maxX: 4, maxY: 5, maxZ: 5 });
  assert(slab && Math.abs(slab.tMin - 5) < 1e-9, 'ray-AABB slab tMin = 5');
  assert(rayIntersectsBox(createRay({ x: 5, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }) === null, 'ray pointing away → null');

  const tri = rayIntersectsTriangle(ray, { x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }, { x: 0, y: 0, z: 5 });
  assert(tri && Math.abs(tri.t - 5) < 1e-9, 'ray-triangle hit at t=5');
  assert(rayIntersectsTriangle(ray, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }) === null, 'ray misses small triangle');

  const boxFaces = [
    [{ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }, { x: 0, y: 5, z: 5 }, { x: 0, y: 0, z: 5 }],
    [{ x: 4, y: 0, z: 0 }, { x: 4, y: 5, z: 0 }, { x: 4, y: 5, z: 5 }, { x: 4, y: 0, z: 5 }]
  ];
  const meshHit = rayCastMesh(ray, boxFaces);
  assert(meshHit && Math.abs(meshHit.t - 5) < 1e-9 && meshHit.faceIndex === 0, 'rayCastMesh nearest face = 0 (t=5)');
  const backRay = createRay({ x: 8, y: 2.5, z: 2.5 }, { x: -1, y: 0, z: 0 });
  const backHit = rayCastMesh(backRay, boxFaces);
  assert(backHit && Math.abs(backHit.t - 4) < 1e-9 && backHit.faceIndex === 1, 'ray from +x hits near face (x=4) at t=4');
}

// --- 5. Plane + clipping ---
console.log('\n--- 5. Planes & clipping ---');
{
  const plane = createPlane({ x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
  close(planeDistanceToPoint(plane, { x: 5, y: 3, z: 1 }), 3, 'signed distance positive on normal side');
  close(planeDistanceToPoint(plane, { x: 0, y: 0, z: 0 }), -2, 'signed distance negative behind');

  const rayHit = rayIntersectsPlane(createRay({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), plane);
  assert(rayHit && Math.abs(rayHit.t - 2) < 1e-9, 'ray hits plane at x=2');
  assert(rayIntersectsPlane(createRay({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }), plane) === null, 'parallel ray never hits');

  // clip square spanning x=0..4 against plane x>=2
  const planeKeepRight = createPlane({ x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
  const square = [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 4, y: 3, z: 0 }, { x: 0, y: 3, z: 0 }];
  const clipped = clipPolygonAgainstPlane(square, planeKeepRight);
  assert(clipped.clipped, 'clipping flagged');
  assert(clipped.vertices.length === 4, 'clipped square has 4 vertices (2 corners + 2 intersections)');
  const xs = clipped.vertices.map(v => v.x);
  assert(Math.min(...xs) >= 2 - 1e-9, 'all clipped vertices on the kept side');

  // fully inside → unchanged (plane keeps x <= 10)
  const inside = clipPolygonAgainstPlane(square, createPlane({ x: 10, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }));
  assert(!inside.clipped && inside.vertices.length === 4, 'fully-inside polygon not clipped');

  // degenerate: all vertices clipped away
  const emptied = clipPolygonAgainstPlane([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }], planeKeepRight);
  assert(emptied.clipped && emptied.vertices.length === 0, 'fully-outside polygon clips to nothing');
}

// --- 6. Quaternion ---
console.log('\n--- 6. Quaternion ---');
{
  const m = Quat.toMat4(Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2));
  assertPoint(Mat4.transformPoint(m, { x: 1, y: 0, z: 0 }), { x: 0, y: 1, z: 0 }, 'quat Z-90° matches rotation matrix');
}

// --- 7. Camera: presets, round-trip, orbit/pan/zoom ---
console.log('\n--- 7. Camera model ---');
{
  for (const preset of ['perspective', 'top', 'bottom', 'front', 'back', 'left', 'right']) {
    const camera = createCamera3D({ preset, zoom: 50, panX: 500, panY: 400 });
    const world = { x: 2, y: 3, z: 1 };
    const s = worldToScreen3D(world, camera);
    const ray = screenToWorldRay(s.x, s.y, camera);
    const toP = { x: world.x - ray.origin.x, y: world.y - ray.origin.y, z: world.z - ray.origin.z };
    const along = toP.x * ray.direction.x + toP.y * ray.direction.y + toP.z * ray.direction.z;
    const closest = { x: ray.origin.x + ray.direction.x * along, y: ray.origin.y + ray.direction.y * along, z: ray.origin.z + ray.direction.z * along };
    const d = Math.hypot(closest.x - world.x, closest.y - world.y, closest.z - world.z);
    assert(d < 1e-6, `${preset}: screen → ray passes through the world point (${d.toExponential(2)})`);
  }
  assert(Object.keys(VIEW_PRESETS).length >= 11, 'all architectural view presets defined');

  const camera = createCamera3D({ preset: 'perspective', zoom: 50, panX: 500, panY: 400 });
  const orbited = orbitCamera(camera, 30, 10);
  assert(Math.abs(orbited.azimuth - 75) < 1e-9 && Math.abs(orbited.elevation - 45.264) < 1e-9, 'orbit changes azimuth/elevation');
  const clamped = orbitCamera(orbited, 0, 100);
  assert(clamped.elevation <= 89.9, 'elevation clamped before pole flip');
  const panned = panCamera(camera, 10, -10);
  assert(panned.panX === 510 && panned.panY === 390, 'pan shifts screen offset');
  const zoomed = zoomCamera(camera, 1.2);
  assert(Math.abs(zoomed.zoom - 60) < 1e-9, 'zoom scales');
  const zoomClamped = zoomCamera(camera, 100);
  assert(zoomClamped.zoom <= 400, 'zoom clamped');

  // forward/backward consistency for every preset: world → screen → ray → closest = world
  let worst = 0;
  for (const preset of Object.keys(VIEW_PRESETS)) {
    const cam = createCamera3D({ preset, zoom: 50, panX: 500, panY: 400 });
    const world = { x: 2, y: 3, z: 1 };
    const s = worldToScreen3D(world, cam);
    const ray = screenToWorldRay(s.x, s.y, cam);
    const toP = { x: world.x - ray.origin.x, y: world.y - ray.origin.y, z: world.z - ray.origin.z };
    const along = toP.x * ray.direction.x + toP.y * ray.direction.y + toP.z * ray.direction.z;
    const cp = { x: ray.origin.x + ray.direction.x * along, y: ray.origin.y + ray.direction.y * along, z: ray.origin.z + ray.direction.z * along };
    worst = Math.max(worst, Math.hypot(cp.x - world.x, cp.y - world.y, cp.z - world.z));
  }
  assert(worst < 1e-6, `world→screen→ray round-trip exact for all presets (worst ${worst.toExponential(2)})`);
}

console.log(`\n========================================`);
console.log(`3D Geometry Engine Summary: ${passed} passed, ${failed} failed.`);
console.log(`========================================`);
if (failed > 0) process.exit(1);
