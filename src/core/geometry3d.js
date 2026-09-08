/**
 * Architecture Helping Hand — 3D Geometry Engine (leaf module)
 *
 * Foundational 3D math: vectors, Mat4 transforms, bounding boxes, rays,
 * planes, minimal quaternion, camera model (world↔camera↔screen), ray
 * casting, and mesh plane-clipping. Pure, deterministic, dependency-free.
 *
 * Coordinate system (matches massing-3d.js): world is Z-up; screen Y grows
 * downward; the renderer camera is azimuth/elevation orthographic with a
 * zoom scale (px per meter) and panX/panY screen offset.
 */

// ---------------------------------------------------------------------------
// Vector3 / Point3
// ---------------------------------------------------------------------------

export const Vec3 = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
  length: (a) => Math.hypot(a.x, a.y, a.z),
  distance: (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z),
  normalize(a) {
    const len = Vec3.length(a);
    if (len < 1e-12) return { x: 0, y: 0, z: 0 };
    return { x: a.x / len, y: a.y / len, z: a.z / len };
  },
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })
};

// ---------------------------------------------------------------------------
// Mat4 (column-major 4x4, WebGL convention)
// ---------------------------------------------------------------------------

export const Mat4 = {
  identity() {
    return new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  multiply(a, b) {
    // a * b (column-major: out[col*4 + row])
    const out = new Float64Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[col * 4 + k];
        out[col * 4 + row] = s;
      }
    }
    return out;
  },
  translation(tx, ty, tz) {
    return new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1]);
  },
  scaling(sx, sy, sz) {
    return new Float64Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]);
  },
  rotationZ(radians) {
    const c = Math.cos(radians), s = Math.sin(radians);
    return new Float64Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  rotationX(radians) {
    const c = Math.cos(radians), s = Math.sin(radians);
    return new Float64Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
  },
  rotationY(radians) {
    const c = Math.cos(radians), s = Math.sin(radians);
    return new Float64Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  },
  /**
   * Mirror across an arbitrary plane through `point` with unit normal `normal`.
   * Composed as translate·R·scale(-1)·R⁻¹·translate⁻¹ where R rotates the
   * plane normal onto +X.
   */
  mirrorPlane(point, normal) {
    const n = Vec3.normalize(normal);
    const angleX = Math.atan2(n.y, n.z);          // rotate n onto the XZ plane
    const afterX = { x: 0, y: 0, z: 1 };           // placeholder — compute directly
    void afterX;
    // Direct reflection matrix for unit normal n through plane through origin:
    // I - 2·n·nᵀ
    const m = Mat4.identity();
    const xx = 1 - 2 * n.x * n.x, yy = 1 - 2 * n.y * n.y, zz = 1 - 2 * n.z * n.z;
    const xy = -2 * n.x * n.y, xz = -2 * n.x * n.z, yz = -2 * n.y * n.z;
    m[0] = xx; m[1] = xy; m[2] = xz;
    m[4] = xy; m[5] = yy; m[6] = yz;
    m[8] = xz; m[9] = yz; m[10] = zz;
    return Mat4.multiply(Mat4.translation(point.x, point.y, point.z),
      Mat4.multiply(m, Mat4.translation(-point.x, -point.y, -point.z)));
  },
  transformPoint(m, p) {
    return {
      x: m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
      y: m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
      z: m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14]
    };
  },
  transformVector(m, v) {
    return {
      x: m[0] * v.x + m[4] * v.y + m[8] * v.z,
      y: m[1] * v.x + m[5] * v.y + m[9] * v.z,
      z: m[2] * v.x + m[6] * v.y + m[10] * v.z
    };
  }
};

// ---------------------------------------------------------------------------
// BoundingBox3D
// ---------------------------------------------------------------------------

export function createBoundingBox3D() {
  return { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity, isEmpty: true };
}

export function bbox3AddPoint(box, p) {
  if (!box) return box;
  box.isEmpty = false;
  box.minX = Math.min(box.minX, p.x); box.minY = Math.min(box.minY, p.y); box.minZ = Math.min(box.minZ, p.z);
  box.maxX = Math.max(box.maxX, p.x); box.maxY = Math.max(box.maxY, p.y); box.maxZ = Math.max(box.maxZ, p.z);
  return box;
}

export function bbox3Center(box) {
  if (!box || box.isEmpty) return null;
  return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2, z: (box.minZ + box.maxZ) / 2 };
}

export function bbox3Intersects(a, b) {
  return a && b && !a.isEmpty && !b.isEmpty &&
    a.minX <= b.maxX && a.maxX >= b.minX &&
    a.minY <= b.maxY && a.maxY >= b.minY &&
    a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

// ---------------------------------------------------------------------------
// Ray
// ---------------------------------------------------------------------------

export function createRay(origin, direction) {
  const dir = Vec3.normalize(direction);
  if (dir.x === 0 && dir.y === 0 && dir.z === 0) {
    throw new Error('createRay: direction must be a non-zero vector');
  }
  return { origin: { ...origin }, direction: dir };
}

/** Ray vs AABB (slab method). Returns {tMin, tMax} or null. */
export function rayIntersectsBox(ray, box) {
  let tMin = -Infinity, tMax = Infinity;
  const axes = [['minX', 'maxX', 'x'], ['minY', 'maxY', 'y'], ['minZ', 'maxZ', 'z']];
  for (const [minKey, maxKey, axis] of axes) {
    const d = ray.direction[axis];
    if (Math.abs(d) < 1e-12) {
      if (ray.origin[axis] < box[minKey] || ray.origin[axis] > box[maxKey]) return null;
      continue;
    }
    let t1 = (box[minKey] - ray.origin[axis]) / d;
    let t2 = (box[maxKey] - ray.origin[axis]) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (tMax < 0) return null; // box behind the ray
  return { tMin: Math.max(tMin, 0), tMax };
}

/** Ray vs triangle (Möller–Trumbore). Returns {t, u, v} or null. */
export function rayIntersectsTriangle(ray, v0, v1, v2) {
  const e1 = Vec3.sub(v1, v0);
  const e2 = Vec3.sub(v2, v0);
  const p = Vec3.cross(ray.direction, e2);
  const det = Vec3.dot(e1, p);
  if (Math.abs(det) < 1e-12) return null; // parallel
  const invDet = 1 / det;
  const t = Vec3.sub(ray.origin, v0);
  const u = Vec3.dot(t, p) * invDet;
  if (u < -1e-9 || u > 1 + 1e-9) return null;
  const q = Vec3.cross(t, e1);
  const v = Vec3.dot(ray.direction, q) * invDet;
  if (v < -1e-9 || u + v > 1 + 1e-9) return null;
  const tHit = Vec3.dot(e2, q) * invDet;
  if (tHit < 1e-9) return null;
  return { t: tHit, u, v };
}

/**
 * Ray vs triangle-fan face (convex polygon defined by vertex list).
 * Returns {t, point} or null.
 */
export function rayIntersectsFace(ray, vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) return null;
  for (let i = 1; i < vertices.length - 1; i++) {
    const hit = rayIntersectsTriangle(ray, vertices[0], vertices[i], vertices[i + 1]);
    if (hit) {
      return { t: hit.t, point: Vec3.add(ray.origin, Vec3.scale(ray.direction, hit.t)) };
    }
  }
  return null;
}

/** Nearest face hit across a mesh (faces = array of vertex arrays). */
export function rayCastMesh(ray, faces) {
  let best = null;
  for (let i = 0; i < faces.length; i++) {
    const hit = rayIntersectsFace(ray, faces[i]);
    if (hit && (!best || hit.t < best.t)) {
      best = { ...hit, faceIndex: i };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Plane + clipping (sectioning foundation)
// ---------------------------------------------------------------------------

/** Plane through `point` with `normal`. signedDistance > 0 = normal side. */
export function createPlane(point, normal) {
  const n = Vec3.normalize(normal);
  return { normal: n, constant: -Vec3.dot(n, point) };
}

export function planeDistanceToPoint(plane, p) {
  return Vec3.dot(plane.normal, p) + plane.constant;
}

/** Intersects a ray with a plane. Returns {t, point} or null (parallel/behind with t<0). */
export function rayIntersectsPlane(ray, plane) {
  const denom = Vec3.dot(plane.normal, ray.direction);
  if (Math.abs(denom) < 1e-12) return null;
  const t = -(Vec3.dot(plane.normal, ray.origin) + plane.constant) / denom;
  if (t < 0) return null;
  return { t, point: Vec3.add(ray.origin, Vec3.scale(ray.direction, t)) };
}

/**
 * Clips a convex polygon (vertex ring) against a plane, keeping the side the
 * normal points toward. Returns { vertices, clipped: boolean }.
 */
export function clipPolygonAgainstPlane(vertices, plane) {
  const out = [];
  let clipped = false;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const cur = vertices[i];
    const next = vertices[(i + 1) % n];
    const dCur = planeDistanceToPoint(plane, cur);
    const dNext = planeDistanceToPoint(plane, next);
    const curIn = dCur >= -1e-9;
    const nextIn = dNext >= -1e-9;
    if (curIn) out.push(cur);
    if (curIn !== nextIn) {
      // edge crosses the plane — insert intersection
      const t = dCur / (dCur - dNext);
      out.push(Vec3.lerp(cur, next, t));
      clipped = true;
    } else if (!curIn) {
      clipped = true;
    }
  }
  return { vertices: out, clipped };
}

// ---------------------------------------------------------------------------
// Quaternion (minimal — justified for orbit composition without gimbal drift)
// ---------------------------------------------------------------------------

export const Quat = {
  fromAxisAngle(axis, radians) {
    const n = Vec3.normalize(axis);
    const half = radians / 2;
    const s = Math.sin(half);
    return { x: n.x * s, y: n.y * s, z: n.z * s, w: Math.cos(half) };
  },
  toMat4(q) {
    const { x, y, z, w } = q;
    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, xz = x * z, yz = y * z;
    const wx = w * x, wy = w * y, wz = w * z;
    return new Float64Array([
      1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0,
      2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0,
      2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0,
      0, 0, 0, 1
    ]);
  }
};
