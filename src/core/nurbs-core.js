/**
 * Architecture Helping Hand — NURBS Core (leaf module)
 *
 * Pure de Boor / Cox-de Boor evaluators extracted from massing-3d so both
 * the massing builder and the advanced-cad entity factories can import them
 * without a bundler-order cycle. massing-3d re-exports these unchanged.
 */

// Phase 9: Rhino Computational NURBS Curve & Surface Evaluator
// ---------------------------------------------------------------------------

/**
 * Generates a standard clamped uniform knot vector for n+1 control points and degree p.
 * Length = n + p + 2.
 * @param {number} n - Last index of control points (count - 1)
 * @param {number} p - Degree of the curve
 * @returns {Array<number>} Knot vector clamped to [0, 1]
 */
export function generateClampedKnotVector(n, p) {
  const m = n + p + 1;
  const knots = new Array(m + 1);
  for (let i = 0; i <= p; i++) knots[i] = 0;
  const interior = m - 2 * p;
  for (let i = 1; i < interior; i++) {
    knots[p + i] = i / interior;
  }
  for (let i = m - p; i <= m; i++) knots[i] = 1;
  return knots;
}

/**
 * Evaluates a 2D or 3D NURBS / B-Spline curve at parameter t in [0, 1] using Cox-de Boor's algorithm.
 *
 * @param {Array<Object>} controlPoints - Array of point objects ({x, y} or {x, y, z})
 * @param {number} [degree=3] - Degree of the spline (default cubic)
 * @param {number} t - Parameter in [0, 1]
 * @param {Array<number>} [customKnots=null] - Optional custom knot vector
 * @returns {Object} Evaluated point {x, y, z}
 */
export function evaluateNurbsCurve(controlPoints = [], degree = 3, t = 0, customKnots = null) {
  if (!Array.isArray(controlPoints) || controlPoints.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  if (controlPoints.length === 1) {
    const pt = controlPoints[0];
    return { x: pt.x || 0, y: pt.y || 0, z: pt.z || 0 };
  }

  const p = Math.min(degree, controlPoints.length - 1);
  const n = controlPoints.length - 1;
  const knots = Array.isArray(customKnots) && customKnots.length === (n + p + 2)
    ? customKnots
    : generateClampedKnotVector(n, p);

  // Clamp t to [0, 1]
  const clampedT = Math.max(0, Math.min(1, t));

  // Find knot span k such that knots[k] <= clampedT < knots[k+1]
  let k = n;
  for (let i = p; i <= n; i++) {
    if (clampedT >= knots[i] && clampedT < knots[i + 1]) {
      k = i;
      break;
    }
  }
  if (clampedT >= 1) k = n;

  // Initialize de Boor working array d[0..p]
  const d = [];
  for (let j = 0; j <= p; j++) {
    const cp = controlPoints[k - p + j] || controlPoints[n];
    d[j] = {
      x: cp.x || 0,
      y: cp.y || 0,
      z: cp.z || 0
    };
  }

  // de Boor recursion
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const idx = k - p + j;
      const denom = knots[idx + p - r + 1] - knots[idx];
      const alpha = denom > 1e-9 ? (clampedT - knots[idx]) / denom : 0;
      d[j] = {
        x: (1 - alpha) * d[j - 1].x + alpha * d[j].x,
        y: (1 - alpha) * d[j - 1].y + alpha * d[j].y,
        z: (1 - alpha) * d[j - 1].z + alpha * d[j].z
      };
    }
  }

  return {
    x: Number(d[p].x.toFixed(4)),
    y: Number(d[p].y.toFixed(4)),
    z: Number(d[p].z.toFixed(4))
  };
}

/**
 * Evaluates a tensor-product NURBS / B-Spline surface at parameters (u, v) in [0, 1] x [0, 1].
 *
 * @param {Array<Array<Object>>} controlGrid - 2D grid of control points [row][col]
 * @param {number} [degreeU=3] - Degree along U axis
 * @param {number} [degreeV=3] - Degree along V axis
 * @param {number} u - Parameter along U [0, 1]
 * @param {number} v - Parameter along V [0, 1]
 * @returns {Object} Evaluated surface point {x, y, z}
 */
export function evaluateNurbsSurface(controlGrid = [], degreeU = 3, degreeV = 3, u = 0, v = 0) {
  if (!Array.isArray(controlGrid) || controlGrid.length === 0 || !Array.isArray(controlGrid[0])) {
    return { x: 0, y: 0, z: 0 };
  }

  // Evaluate each row along U to get intermediate column control points
  const intermediateCol = controlGrid.map(row => evaluateNurbsCurve(row, degreeU, u));

  // Evaluate column along V
  return evaluateNurbsCurve(intermediateCol, degreeV, v);
}

/**
 * Tessellates a NURBS surface into 3D quad faces ready for 3D projection & rendering.
 *
 * @param {Array<Array<Object>>} controlGrid - 2D grid of control points
 * @param {Object} [options]
 * @param {number} [options.samplesU=8] - Subdivision steps in U
 * @param {number} [options.samplesV=8] - Subdivision steps in V
 * @param {string} [options.color='#38bdf8'] - Face fill color
 * @param {string} [options.stroke='#0284c7'] - Edge wireframe color
 * @returns {Array<Object>} 3D quad faces array
 */
export function tessellateNurbsSurface(controlGrid = [], options = {}) {
  if (!Array.isArray(controlGrid) || controlGrid.length === 0 || !Array.isArray(controlGrid[0])) {
    return [];
  }

  const su = options.samplesU || 8;
  const sv = options.samplesV || 8;
  const color = options.color || '#38bdf8';
  const stroke = options.stroke || '#0284c7';
  const opacity = options.opacity || 0.85;

  const grid = [];
  for (let i = 0; i <= su; i++) {
    const row = [];
    const u = i / su;
    for (let j = 0; j <= sv; j++) {
      const v = j / sv;
      row.push(evaluateNurbsSurface(controlGrid, options.degreeU || 3, options.degreeV || 3, u, v));
    }
    grid.push(row);
  }

  const faces = [];
  for (let i = 0; i < su; i++) {
    for (let j = 0; j < sv; j++) {
      const p0 = grid[i][j];
      const p1 = grid[i + 1][j];
      const p2 = grid[i + 1][j + 1];
      const p3 = grid[i][j + 1];

      faces.push({
        vertices: [
          { x: p0.x, y: p0.y, z: p0.z },
          { x: p1.x, y: p1.y, z: p1.z },
          { x: p2.x, y: p2.y, z: p2.z },
          { x: p3.x, y: p3.y, z: p3.z }
        ],
        color,
        stroke,
        opacity,
        type: 'nurbs_surface'
      });
    }
  }

  return faces;
}
