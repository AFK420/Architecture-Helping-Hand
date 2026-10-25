/** Normalized CAD primitives for architectural plan blocks. Curves are sampled polylines, never raster images. */
export function objectDrawing(layer = 'A-FURN') {
  const entities = [];
  const path = (points, closed = false) => entities.push({ type: 'polyline', points, closed, layer });
  const line = (x1, y1, x2, y2) => entities.push({ type: 'line', x1, y1, x2, y2, layer });
  const rect = (x, y, w, h) => path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
  const ellipse = (x, y, rx, ry = rx, steps = 48) => path(Array.from({ length: steps }, (_, i) => {
    const a = i * 2 * Math.PI / steps;
    return [x + rx * Math.cos(a), y + ry * Math.sin(a)];
  }), true);
  const circle = (x, y, r, steps = 36) => ellipse(x, y, r, r, steps);
  const arc = (x, y, rx, ry, start, end, steps = 32) => path(Array.from({ length: steps + 1 }, (_, i) => {
    const a = start + (end - start) * i / steps;
    return [x + rx * Math.cos(a), y + ry * Math.sin(a)];
  }));

  const roundRect = (x, y, w, h, r = 0.03, steps = 6) => {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    if (r <= 0.001) return rect(x, y, w, h);
    const pts = [];
    const corner = (cx, cy, sa, ea) => {
      for (let i = 0; i <= steps; i++) {
        const a = sa + (ea - sa) * i / steps;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
    };
    corner(x + w - r, y + r, -Math.PI / 2, 0);
    corner(x + w - r, y + h - r, 0, Math.PI / 2);
    corner(x + r, y + h - r, Math.PI / 2, Math.PI);
    corner(x + r, y + r, Math.PI, 3 * Math.PI / 2);
    path(pts, true);
  };

  const pillow = (x, y, w, h) => {
    const r = Math.min(w, h) * 0.28;
    roundRect(x, y, w, h, r);
    const mx = x + w / 2, my = y + h / 2;
    if (w >= h) {
      arc(mx, my - h * 0.05, w * 0.28, h * 0.18, 0.15 * Math.PI, 0.85 * Math.PI, 16);
    } else {
      arc(mx - w * 0.05, my, w * 0.18, h * 0.28, -0.35 * Math.PI, 0.35 * Math.PI, 16);
    }
  };

  const seat = (x, y, w, h, arms = true) => {
    const backH = h * 0.22;
    const armW = arms ? w * 0.13 : 0;
    roundRect(x, y, w, h, 0.03);
    roundRect(x + armW * 0.2, y, w - armW * 0.4, backH, 0.02);
    line(x + armW * 0.2, y + backH * 0.5, x + w - armW * 0.2, y + backH * 0.5);
    const seatW = w - 2 * armW;
    const seatH = h - backH;
    roundRect(x + armW, y + backH * 0.9, seatW, seatH, 0.03);
    line(x + armW + 0.02, y + h - 0.03, x + w - armW - 0.02, y + h - 0.03);
    if (arms) {
      roundRect(x, y + backH * 0.2, armW, h - backH * 0.2, armW * 0.35);
      roundRect(x + w - armW, y + backH * 0.2, armW, h - backH * 0.2, armW * 0.35);
      line(x + armW * 0.5, y + backH * 0.35, x + armW * 0.5, y + h - 0.04);
      line(x + w - armW * 0.5, y + backH * 0.35, x + w - armW * 0.5, y + h - 0.04);
    }
  };

  const starBase = (cx, cy, r, prongs = 5) => {
    circle(cx, cy, r * 0.16);
    circle(cx, cy, r * 0.07);
    for (let i = 0; i < prongs; i++) {
      const a = i * 2 * Math.PI / prongs - Math.PI / 2;
      const ex = cx + r * Math.cos(a), ey = cy + r * Math.sin(a);
      line(cx + r * 0.16 * Math.cos(a), cy + r * 0.16 * Math.sin(a), ex, ey);
      ellipse(ex, ey, r * 0.1, r * 0.05);
    }
  };

  const wheels = (x, y, w, h) => {
    for (const xx of [x, x + w]) {
      for (const yy of [y, y + h]) {
        ellipse(xx, yy, 0.025, 0.035);
        line(xx - 0.018, yy, xx + 0.018, yy);
      }
    }
  };

  return { entities, path, line, rect, roundRect, ellipse, circle, arc, pillow, seat, starBase, wheels };
}

export function objectLayout(parts) {
  return parts.flatMap(({ geometry, x = 0, y = 0, w = 1, h = 1 }) => geometry.map(e => e.type === 'line' ? { ...e, x1: x + e.x1 * w, y1: y + e.y1 * h, x2: x + e.x2 * w, y2: y + e.y2 * h } : { ...e, points: e.points.map(([px, py]) => [x + px * w, y + py * h]) }));
}
