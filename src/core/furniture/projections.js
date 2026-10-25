/**
 * Architecture Helping Hand - 2D CAD Multi-View Projections
 * Generates Front Elevation and Side Elevation CAD geometries
 * in real-world meters matching standard architectural detailing conventions.
 */

function makeLine(x1, y1, x2, y2, layer = 'A-FURN') {
  return { type: 'line', x1: Number(x1.toFixed(4)), y1: Number(y1.toFixed(4)), x2: Number(x2.toFixed(4)), y2: Number(y2.toFixed(4)), layer };
}

function makePolyline(points, closed = false, layer = 'A-FURN') {
  return { type: 'polyline', points: points.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]), closed: !!closed, layer };
}

function makeRect(x, y, w, h, layer = 'A-FURN') {
  return makePolyline([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, layer);
}

function makeCircle(x, y, r, layer = 'A-FURN') {
  return { type: 'circle', x: Number(x.toFixed(4)), y: Number(y.toFixed(4)), r: Number(r.toFixed(4)), layer };
}

function makeRoundRect(x, y, w, h, r, layer = 'A-FURN') {
  const rad = Math.min(r, w / 2, h / 2);
  if (rad <= 0.005) return makeRect(x, y, w, h, layer);
  const steps = 4;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (i * Math.PI) / (2 * steps);
    pts.push([x + rad + rad * Math.cos(a), y + rad + rad * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = 1.5 * Math.PI + (i * Math.PI) / (2 * steps);
    pts.push([x + w - rad + rad * Math.cos(a), y + rad + rad * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = 0 + (i * Math.PI) / (2 * steps);
    pts.push([x + w - rad + rad * Math.cos(a), y + h - rad + rad * Math.sin(a)]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = 0.5 * Math.PI + (i * Math.PI) / (2 * steps);
    pts.push([x + rad + rad * Math.cos(a), y + h - rad + rad * Math.sin(a)]);
  }
  return makePolyline(pts, true, layer);
}

/**
 * Builds Front Elevation CAD entities (x: width 0..w, y: height 0..h).
 */
export function buildFrontElevation(item, w, d, rawH) {
  const h = Number.isFinite(rawH) && rawH > 0 ? rawH : 0.85;
  const id = String(item.id || '').toLowerCase();
  const sub = String(item.subcategory || '').toLowerCase();
  const cat = String(item.category || '').toLowerCase();
  const lyr = 'A-FURN';
  const list = [makeLine(0, 0, w, 0, lyr)]; // Ground baseline

  if (id.includes('desk') || (cat === 'workplace' && id.includes('table')) || id.includes('bench-desk')) {
    // Front Elevation: Tabletop slab, modesty panel, legs, drawer pedestal
    list.push(makeRoundRect(0, h - 0.04, w, 0.04, 0.005, lyr));
    list.push(makeRect(0.04, 0, 0.05, h - 0.04, lyr));
    if (w >= 1.2) {
      list.push(makeRect(0.09, h * 0.35, w - 0.54, h * 0.55, lyr)); // Modesty panel
      list.push(makeRect(w - 0.45, 0.06, 0.4, h - 0.1, lyr)); // Pedestal unit
      list.push(makeLine(w - 0.45, 0.36 * h, w - 0.05, 0.36 * h, lyr));
      list.push(makeLine(w - 0.45, 0.64 * h, w - 0.05, 0.64 * h, lyr));
      list.push(makeRect(w - 0.28, 0.22 * h, 0.08, 0.02, lyr));
      list.push(makeRect(w - 0.28, 0.50 * h, 0.08, 0.02, lyr));
      list.push(makeRect(w - 0.28, 0.78 * h, 0.08, 0.02, lyr));
      list.push(makeRect(w - 0.09, 0, 0.05, h - 0.04, lyr));
    } else {
      list.push(makeRect(0.09, h * 0.4, w - 0.18, h * 0.5, lyr));
      list.push(makeRect(w - 0.09, 0, 0.05, h - 0.04, lyr));
    }
  } else if (id.includes('locker') || sub.includes('storage') || id.includes('wardrobe') || id.includes('cabinet')) {
    // Front Elevation: Plinth, louver doors, handles, cornice
    list.push(makeRect(0, 0, w, 0.08 * h, lyr));
    list.push(makeRect(0, 0, w, h, lyr));
    const bays = w > 1.2 ? 3 : w > 0.6 ? 2 : 1;
    for (let b = 0; b < bays; b++) {
      const bx = (b / bays) * w + 0.01;
      const bw = w / bays - 0.02;
      list.push(makeRect(bx, 0.08 * h, bw, 0.88 * h, lyr));
      // Top louvers
      for (let y = 0.84 * h; y <= 0.90 * h; y += 0.02 * h) list.push(makeLine(bx + 0.04, y, bx + bw - 0.04, y, lyr));
      // Bottom louvers
      for (let y = 0.14 * h; y <= 0.20 * h; y += 0.02 * h) list.push(makeLine(bx + 0.04, y, bx + bw - 0.04, y, lyr));
      // Pull handle & lock cylinder
      list.push(makeRect(bx + bw - 0.06, 0.52 * h, 0.03, 0.1 * h, lyr));
      list.push(makeCircle(bx + bw - 0.045, 0.66 * h, 0.012, lyr));
    }
    list.push(makeRect(0, h - 0.04 * h, w, 0.04 * h, lyr));
  } else if (cat === 'kitchen' || id.includes('range') || id.includes('cooker') || id.includes('oven') || id.includes('fryer')) {
    // Front Elevation: Bullet feet, main chassis, oven door with window & handle, burner dials
    list.push(makeRect(0.05, 0, 0.04, 0.08 * h, lyr));
    list.push(makeRect(w - 0.09, 0, 0.04, 0.08 * h, lyr));
    list.push(makeRect(0, 0.08 * h, w, 0.92 * h, lyr));
    list.push(makeRoundRect(0.06 * w, 0.12 * h, 0.88 * w, 0.68 * h, 0.02, lyr)); // Oven door
    list.push(makeRoundRect(0.16 * w, 0.22 * h, 0.68 * w, 0.46 * h, 0.015, lyr)); // Window
    list.push(makeRoundRect(0.12 * w, 0.72 * h, 0.76 * w, 0.025, 0.005, lyr)); // Handle bar
    list.push(makeRect(0, h - 0.14 * h, w, 0.12 * h, lyr)); // Control panel
    const dials = w > 0.8 ? 6 : 4;
    for (let i = 0; i < dials; i++) {
      const cx = ((i + 0.5) / dials) * w;
      list.push(makeCircle(cx, h - 0.08 * h, 0.022, lyr));
      list.push(makeLine(cx, h - 0.08 * h, cx, h - 0.065 * h, lyr));
    }
    list.push(makeRect(0, h, w, 0.04, lyr)); // Top grates
  } else if (id.includes('stall') || id.includes('toilet') && id.includes('ada')) {
    // Front Elevation: Commercial Toilet Stall (pilasters, door with undercut, headrail, latch)
    list.push(makeRect(0, 0, 0.08 * w, 0.08, lyr)); // Left shoe
    list.push(makeRect(w - 0.08 * w, 0, 0.08 * w, 0.08, lyr)); // Right shoe
    list.push(makeRect(0, 0, 0.08 * w, h, lyr)); // Left pilaster
    list.push(makeRect(w - 0.08 * w, 0, 0.08 * w, h, lyr)); // Right pilaster
    list.push(makeRect(0.09 * w, 0.15, 0.82 * w, h - 0.2, lyr)); // Door leaf (150mm gap)
    list.push(makeRect(w - 0.15 * w, 0.95, 0.04, 0.07, lyr)); // Latch / occupancy indicator
    list.push(makeRect(0, h - 0.05, w, 0.05, lyr)); // Overhead headrail
  } else if (id.includes('sofa') || id.includes('chair') || id.includes('recliner') || id.includes('lounge')) {
    // Front Elevation: Legs, thick seat cushion, contoured backrest, armrests
    list.push(makeRect(0.06 * w, 0, 0.04 * w, 0.38 * h, lyr));
    list.push(makeRect(0.9 * w, 0, 0.04 * w, 0.38 * h, lyr));
    list.push(makeRoundRect(0.02 * w, 0.34 * h, 0.96 * w, 0.18 * h, 0.03, lyr));
    list.push(makeRoundRect(0.05 * w, 0.48 * h, 0.9 * w, 0.50 * h, 0.04, lyr));
    list.push(makeRoundRect(0, 0.42 * h, 0.1 * w, 0.32 * h, 0.02, lyr));
    list.push(makeRoundRect(0.9 * w, 0.42 * h, 0.1 * w, 0.32 * h, 0.02, lyr));
  } else if (id.startsWith('door-') || sub.includes('doors')) {
    // Front Elevation: Frame jambs, header, door panel, lever handle
    list.push(makeRect(0, 0, 0.06, h, lyr));
    list.push(makeRect(w - 0.06, 0, 0.06, h, lyr));
    list.push(makeRect(0, h - 0.06, w, 0.06, lyr));
    list.push(makeRect(0.06, 0, w - 0.12, h - 0.06, lyr));
    list.push(makeCircle(w - 0.14, 1.0, 0.03, lyr));
    list.push(makeRect(w - 0.22, 0.985, 0.1, 0.025, lyr));
  } else if (id.includes('rack') || id.includes('squat') || id.includes('crossover')) {
    // Front Elevation: Olympic power cage uprights, pin holes, pull-up bar, barbell
    list.push(makeRect(0.04, 0, 0.12, 0.05, lyr));
    list.push(makeRect(w - 0.16, 0, 0.12, 0.05, lyr));
    list.push(makeRect(0.06, 0.05, 0.08, h - 0.1, lyr));
    list.push(makeRect(w - 0.14, 0.05, 0.08, h - 0.1, lyr));
    for (let y = 0.4; y < h - 0.2; y += 0.12) {
      list.push(makeCircle(0.1, y, 0.012, lyr));
      list.push(makeCircle(w - 0.1, y, 0.012, lyr));
    }
    list.push(makeLine(0.14, h - 0.08, w - 0.14, h - 0.08, lyr));
    list.push(makeRect(0, 1.15, w, 0.035, lyr)); // Barbell
  } else {
    // Generic Architectural Elevation
    list.push(makeRect(0, 0, w, 0.08 * h, lyr));
    list.push(makeRoundRect(0, 0.08 * h, w, 0.92 * h, 0.02, lyr));
    list.push(makeRect(0, h - 0.04, w, 0.04, lyr));
    list.push(makeLine(w / 2, 0.08 * h, w / 2, h - 0.04, lyr));
  }

  return list;
}

/**
 * Builds Side Elevation CAD entities (x: depth 0..d, y: height 0..h).
 */
export function buildSideElevation(item, w, d, rawH) {
  const h = Number.isFinite(rawH) && rawH > 0 ? rawH : 0.85;
  const id = String(item.id || '').toLowerCase();
  const sub = String(item.subcategory || '').toLowerCase();
  const cat = String(item.category || '').toLowerCase();
  const lyr = 'A-FURN';
  const list = [makeLine(0, 0, d, 0, lyr)]; // Ground baseline

  if (id.includes('desk') || (cat === 'workplace' && id.includes('table')) || id.includes('bench-desk')) {
    // Side Elevation: Top slab, front/rear legs, stretcher bar, modesty profile
    list.push(makeRoundRect(0, h - 0.04, d, 0.04, 0.005, lyr));
    list.push(makeRect(0.06, 0, 0.05, h - 0.04, lyr));
    list.push(makeRect(d - 0.11, 0, 0.05, h - 0.04, lyr));
    list.push(makeRect(0.06, 0.18 * h, d - 0.12, 0.04, lyr));
    list.push(makeRect(d - 0.11, 0.38 * h, 0.025, 0.52 * h, lyr));
  } else if (id.includes('locker') || sub.includes('storage') || id.includes('wardrobe') || id.includes('cabinet')) {
    // Side Elevation: Side casing panel, plinth, top cornice
    list.push(makeRect(0, 0, d, 0.08 * h, lyr));
    list.push(makeRoundRect(0, 0.08 * h, d, 0.92 * h, 0.015, lyr));
    list.push(makeRect(0, h - 0.04 * h, d, 0.04 * h, lyr));
  } else if (cat === 'kitchen' || id.includes('range') || id.includes('cooker') || id.includes('oven') || id.includes('fryer')) {
    // Side Elevation: Toe-kick recess, door profile, handle protrusion, rear backsplash
    list.push(makeRect(0.08, 0, d - 0.08, 0.08 * h, lyr));
    list.push(makeRect(0.04, 0.08 * h, d - 0.04, 0.92 * h, lyr));
    list.push(makeRect(0, 0.12 * h, 0.04, 0.72 * h, lyr)); // Front door
    list.push(makeRect(-0.03, 0.72 * h, 0.03, 0.025, lyr)); // Protruding handle
    list.push(makeRect(0, h - 0.04, d, 0.04, lyr)); // Counter rim
    list.push(makeRect(d - 0.03, h, 0.03, 0.08, lyr)); // Backsplash
  } else if (id.includes('stall') || id.includes('toilet') && id.includes('ada')) {
    // Side Elevation: Divider partition, wall brackets, pedestal shoe
    list.push(makeRect(0.06, 0.15, d - 0.06, h - 0.2, lyr));
    list.push(makeRect(d - 0.03, 0.4 * h, 0.03, 0.08, lyr)); // Wall bracket
    list.push(makeRect(d - 0.03, 0.8 * h, 0.03, 0.08, lyr)); // Wall bracket
    list.push(makeRect(0.08, 0, 0.06, 0.15, lyr)); // Front shoe
  } else if (id.includes('sofa') || id.includes('chair') || id.includes('recliner') || id.includes('lounge')) {
    // Side Elevation: Front leg, angled rear leg, inclined seat, reclining backrest, armrest
    list.push(makeRect(0.08 * d, 0, 0.05 * d, 0.38 * h, lyr));
    list.push(makePolyline([[0.82 * d, 0.38 * h], [0.94 * d, 0], [0.89 * d, 0], [0.77 * d, 0.38 * h]], true, lyr));
    list.push(makePolyline([[0.02 * d, 0.42 * h], [0.84 * d, 0.36 * h], [0.84 * d, 0.48 * h], [0.02 * d, 0.54 * h]], true, lyr));
    list.push(makePolyline([[0.72 * d, 0.44 * h], [0.94 * d, h], [0.84 * d, h], [0.64 * d, 0.46 * h]], true, lyr));
    list.push(makeRoundRect(0.05 * d, 0.42 * h, 0.74 * d, 0.22 * h, 0.03, lyr));
  } else if (id.startsWith('door-') || sub.includes('doors')) {
    // Side Elevation: Wall jamb thickness, door stop, door leaf, handle projection
    list.push(makeRect(0, 0, d, h, lyr));
    list.push(makeRect(0.03, 0, 0.02, h, lyr));
    list.push(makeRect(0.03, 0, 0.045, h, lyr));
    list.push(makeRect(-0.05, 1.0, 0.05, 0.025, lyr));
  } else {
    // Generic Architectural Side Elevation
    list.push(makeRect(0, 0, d, 0.08 * h, lyr));
    list.push(makeRoundRect(0, 0.08 * h, d, 0.92 * h, 0.02, lyr));
    list.push(makeRect(0, h - 0.04, d, 0.04, lyr));
  }

  return list;
}
