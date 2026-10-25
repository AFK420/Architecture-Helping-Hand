import { objectDrawing } from './primitives.js';

export const LANDSCAPE_GEOMETRY = {
  climbingPlant: () => {
    const g = objectDrawing('A-VEGETATION');
    g.rect(0, 0, 1, 1);
    for (let x = 0.1; x < 1; x += 0.2) g.line(x, 0, x, 1);
    g.path(Array.from({ length: 64 }, (_, i) => {
      const y = i / 63;
      return [0.5 + 0.23 * Math.sin(y * Math.PI * 5), y];
    }));
    for (let y = 0.1; y < 0.95; y += 0.1) {
      const x = 0.5 + 0.23 * Math.sin(y * Math.PI * 5);
      g.ellipse(x + 0.08, y, 0.1, 0.035);
      g.ellipse(x - 0.08, y, 0.1, 0.035);
    }
    return g.entities;
  },

  bollard: () => {
    const g = objectDrawing('A-SITE');
    g.circle(0.5, 0.5, 0.49);
    g.circle(0.5, 0.5, 0.38);
    g.circle(0.5, 0.5, 0.12);
    g.line(0.2, 0.5, 0.8, 0.5);
    g.line(0.5, 0.2, 0.5, 0.8);
    return g.entities;
  },

  tree: o => {
    const g = objectDrawing('A-VEGETATION');
    if (o.species === 'palm') {
      g.circle(0.5, 0.5, 0.08);
      g.circle(0.5, 0.5, 0.03);
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5;
        const dx = Math.cos(a), dy = Math.sin(a);
        const ex = 0.5 + 0.49 * dx, ey = 0.5 + 0.49 * dy;
        g.line(0.5, 0.5, ex, ey);
        for (let s = 0.3; s < 0.95; s += 0.14) {
          const px = 0.5 + s * 0.49 * dx, py = 0.5 + s * 0.49 * dy;
          const lx = -dy * 0.07, ly = dx * 0.07;
          g.line(px, py, px + lx + dx * 0.03, py + ly + dy * 0.03);
          g.line(px, py, px - lx + dx * 0.03, py - ly + dy * 0.03);
        }
      }
    } else if (o.species === 'cypress') {
      // Columnar / Fastigiate Mediterranean Cypress with tight needle rings
      g.circle(0.5, 0.5, 0.48);
      g.circle(0.5, 0.5, 0.38);
      g.circle(0.5, 0.5, 0.28);
      g.circle(0.5, 0.5, 0.18);
      g.circle(0.5, 0.5, 0.08);
      g.circle(0.5, 0.5, 0.03);
      for (let i = 0; i < 20; i++) {
        const a = i * Math.PI / 10;
        const r1 = (i % 2 === 0) ? 0.46 : 0.36;
        g.line(0.5 + 0.08 * Math.cos(a), 0.5 + 0.08 * Math.sin(a), 0.5 + r1 * Math.cos(a), 0.5 + r1 * Math.sin(a));
      }
    } else if (o.species === 'japanese_maple') {
      // Japanese Maple (Acer palmatum) with 7 distinct spreading foliage lobes & branching
      g.circle(0.5, 0.5, 0.07);
      g.circle(0.5, 0.5, 0.025);
      const lobes = 7;
      for (let i = 0; i < lobes; i++) {
        const a = i * 2 * Math.PI / lobes - Math.PI / 2;
        const cx = 0.5 + 0.32 * Math.cos(a);
        const cy = 0.5 + 0.32 * Math.sin(a);
        g.line(0.5 + 0.07 * Math.cos(a), 0.5 + 0.07 * Math.sin(a), cx, cy);
        g.ellipse(cx, cy, 0.14, 0.09);
        g.line(cx, cy, 0.5 + 0.47 * Math.cos(a), 0.5 + 0.47 * Math.sin(a));
        g.line(cx, cy, 0.5 + 0.43 * Math.cos(a - 0.2), 0.5 + 0.43 * Math.sin(a - 0.2));
        g.line(cx, cy, 0.5 + 0.43 * Math.cos(a + 0.2), 0.5 + 0.43 * Math.sin(a + 0.2));
      }
    } else if (o.species === 'weeping_willow') {
      // Weeping Willow with cascading radial tendril arcs
      g.circle(0.5, 0.5, 0.09);
      g.circle(0.5, 0.5, 0.03);
      g.circle(0.5, 0.5, 0.48);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        const mx = 0.5 + 0.26 * Math.cos(a);
        const my = 0.5 + 0.26 * Math.sin(a);
        const ex = 0.5 + 0.47 * Math.cos(a + 0.3);
        const ey = 0.5 + 0.47 * Math.sin(a + 0.3);
        g.path([[0.5 + 0.09 * Math.cos(a), 0.5 + 0.09 * Math.sin(a)], [mx, my], [ex, ey]]);
      }
    } else if (o.species === 'conifer') {
      g.circle(0.5, 0.5, 0.06);
      g.circle(0.5, 0.5, 0.02);
      for (const [r, count] of [[0.49, 16], [0.35, 12], [0.2, 8]]) {
        const pts = [];
        for (let i = 0; i < count; i++) {
          const a1 = i * 2 * Math.PI / count;
          const a2 = (i + 0.5) * 2 * Math.PI / count;
          pts.push([0.5 + r * Math.cos(a1), 0.5 + r * Math.sin(a1)]);
          pts.push([0.5 + r * 0.65 * Math.cos(a2), 0.5 + r * 0.65 * Math.sin(a2)]);
        }
        g.path(pts, true);
      }
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        g.line(0.5, 0.5, 0.5 + 0.48 * Math.cos(a), 0.5 + 0.48 * Math.sin(a));
      }
    } else {
      const lobes = o.species === 'olive' ? 9 : o.species === 'ornamental' ? 7 : 14;
      g.path(Array.from({ length: 96 }, (_, i) => {
        const a = i * Math.PI / 48;
        const r = 0.43 + 0.065 * Math.cos(lobes * a);
        return [0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a)];
      }), true);
      g.circle(0.5, 0.5, 0.06);
      g.circle(0.5, 0.5, 0.02);
      g.line(0.42, 0.5, 0.58, 0.5);
      g.line(0.5, 0.42, 0.5, 0.58);
      for (let i = 0; i < lobes; i++) {
        const a = i * 2 * Math.PI / lobes;
        g.line(0.5 + 0.06 * Math.cos(a), 0.5 + 0.06 * Math.sin(a), 0.5 + 0.36 * Math.cos(a), 0.5 + 0.36 * Math.sin(a));
        g.line(0.5 + 0.22 * Math.cos(a), 0.5 + 0.22 * Math.sin(a), 0.5 + 0.38 * Math.cos(a + 0.18), 0.5 + 0.38 * Math.sin(a + 0.18));
      }
    }
    return g.entities;
  },

  hedge: o => {
    const g = objectDrawing('A-VEGETATION');
    const bays = o.bays || 4;
    for (let i = 0; i < bays; i++) {
      const cx = (i + 0.5) / bays;
      g.ellipse(cx, 0.5, 0.5 / bays, 0.5);
      g.ellipse(cx, 0.5, 0.35 / bays, 0.32);
      g.line(cx, 0.15, cx, 0.85);
      g.line(cx - 0.2 / bays, 0.5, cx + 0.2 / bays, 0.5);
    }
    g.line(0, 0.5, 1, 0.5);
    return g.entities;
  },

  groundcover: o => {
    const g = objectDrawing('A-VEGETATION');
    g.rect(0, 0, 1, 1);
    for (let x = 0.1; x < 0.95; x += 0.18) {
      for (let y = 0.1; y < 0.95; y += 0.18) {
        if (o.flower) {
          g.circle(x, y, 0.03);
          for (let n = 0; n < 5; n++) {
            g.circle(x + 0.045 * Math.cos(n * 1.257), y + 0.045 * Math.sin(n * 1.257), 0.022);
          }
        } else if (o.grass) {
          g.path([[x - 0.04, y + 0.06], [x, y], [x + 0.04, y + 0.06]]);
          g.line(x, y, x, y + 0.08);
          g.line(x - 0.02, y, x - 0.05, y + 0.07);
          g.line(x + 0.02, y, x + 0.05, y + 0.07);
        } else {
          g.ellipse(x, y, 0.04, 0.025);
          g.line(x - 0.03, y, x + 0.03, y);
        }
      }
    }
    return g.entities;
  },

  planter: o => {
    const g = objectDrawing('A-SITE');
    if (o.round) {
      g.circle(0.5, 0.5, 0.49);
      g.circle(0.5, 0.5, 0.42);
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4;
        g.ellipse(0.5 + 0.22 * Math.cos(ang), 0.5 + 0.22 * Math.sin(ang), 0.14, 0.08);
      }
      g.circle(0.5, 0.5, 0.08);
    } else {
      g.roundRect(0, 0, 1, 1, 0.04);
      g.roundRect(0.06, 0.06, 0.88, 0.88, 0.03);
      for (let x = 0.2; x < 0.85; x += 0.25) {
        for (let y = 0.2; y < 0.85; y += 0.25) {
          g.circle(x, y, 0.08);
          g.line(x - 0.05, y, x + 0.05, y);
        }
      }
    }
    return g.entities;
  },

  bench: o => {
    const g = objectDrawing('A-SITE');
    g.roundRect(0, 0.08, 1, 0.84, 0.03);
    for (let y = 0.32; y < 0.88; y += 0.12) g.roundRect(0.08, y, 0.84, 0.08, 0.015);
    for (let y = 0.12; y < 0.3; y += 0.08) g.roundRect(0.08, y, 0.84, 0.06, 0.01);
    if (o.arms) {
      g.roundRect(0, 0.04, 0.08, 0.92, 0.03);
      g.roundRect(0.92, 0.04, 0.08, 0.92, 0.03);
    }
    return g.entities;
  },

  picnic: () => {
    const g = objectDrawing('A-SITE');
    for (let y = 0.28; y < 0.68; y += 0.1) g.roundRect(0.1, y, 0.8, 0.08, 0.01);
    g.roundRect(0, 0.04, 1, 0.16, 0.02);
    g.roundRect(0, 0.8, 1, 0.16, 0.02);
    g.line(0.18, 0.2, 0.18, 0.8);
    g.line(0.82, 0.2, 0.82, 0.8);
    g.line(0.18, 0.2, 0.82, 0.8);
    g.line(0.18, 0.8, 0.82, 0.2);
    return g.entities;
  },

  pergola: o => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    for (const x of [0.03, 0.91]) {
      for (const y of [0.03, 0.91]) {
        g.rect(x, y, 0.06, 0.06);
        g.circle(x + 0.03, y + 0.03, 0.015);
      }
    }
    g.rect(0, 0.04, 1, 0.05);
    g.rect(0, 0.91, 1, 0.05);
    for (let x = 0.08; x < 0.95; x += 0.12) g.rect(x, 0, 0.04, 1);
    if (o.seating) g.seat(0.2, 0.3, 0.6, 0.4);
    return g.entities;
  },

  fountain: () => {
    const g = objectDrawing('A-SITE');
    g.circle(0.5, 0.5, 0.49);
    g.circle(0.5, 0.5, 0.42);
    g.circle(0.5, 0.5, 0.26);
    g.circle(0.5, 0.5, 0.22);
    g.circle(0.5, 0.5, 0.07);
    g.circle(0.5, 0.5, 0.025);
    for (let n = 0; n < 8; n++) {
      const t = n * Math.PI / 4;
      g.line(0.5 + 0.24 * Math.cos(t), 0.5 + 0.24 * Math.sin(t), 0.5 + 0.4 * Math.cos(t), 0.5 + 0.4 * Math.sin(t));
    }
    return g.entities;
  },

  swing: () => {
    const g = objectDrawing('A-SITE');
    g.path([[0, 0], [0.06, 0.5], [0, 1]]);
    g.path([[1, 0], [0.94, 0.5], [1, 1]]);
    g.roundRect(0.04, 0.47, 0.92, 0.06, 0.02);
    for (const sx of [0.22, 0.64]) {
      g.line(sx, 0.5, sx, 0.22);
      g.line(sx + 0.14, 0.5, sx + 0.14, 0.22);
      g.roundRect(sx, 0.16, 0.14, 0.08, 0.02);
    }
    return g.entities;
  },

  slide: () => {
    const g = objectDrawing('A-SITE');
    g.rect(0.28, 0, 0.44, 0.2);
    for (let y = 0.04; y < 0.18; y += 0.04) g.line(0.28, y, 0.72, y);
    g.line(0.28, 0, 0.28, 0.25);
    g.line(0.72, 0, 0.72, 0.25);
    g.path([[0.28, 0.2], [0.22, 0.7], [0.1, 1], [0.9, 1], [0.78, 0.7], [0.72, 0.2]]);
    g.line(0.38, 0.2, 0.32, 1);
    g.line(0.62, 0.2, 0.68, 1);
    return g.entities;
  },

  bin: () => {
    const g = objectDrawing('A-SITE');
    g.roundRect(0, 0, 1, 1, 0.06);
    g.roundRect(0.08, 0.08, 0.84, 0.84, 0.04);
    g.circle(0.5, 0.5, 0.26);
    g.circle(0.5, 0.5, 0.18);
    g.line(0.18, 0.06, 0.82, 0.06);
    return g.entities;
  },

  rock: () => {
    const g = objectDrawing('A-SITE');
    g.path([[0, 0.3], [0.15, 0], [0.7, 0.04], [1, 0.4], [0.82, 0.92], [0.38, 1], [0.1, 0.75]], true);
    g.path([[0.15, 0], [0.38, 0.3], [0.7, 0.04]]);
    g.path([[0.38, 0.3], [0.82, 0.92], [0.38, 1]], true);
    g.line(0.1, 0.75, 0.38, 0.3);
    return g.entities;
  },

  hydrant: () => {
    const g = objectDrawing('A-SITE');
    // Fire Hydrant with 3-ft clear ring, 6-bolt base flange, 4.5" pumper & dual 2.5" side ports
    g.circle(0.5, 0.5, 0.48);
    g.circle(0.5, 0.5, 0.34);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      g.circle(0.5 + 0.28 * Math.cos(a), 0.5 + 0.28 * Math.sin(a), 0.025);
    }
    // Main barrel
    g.circle(0.5, 0.5, 0.2);
    // Bonnet dome
    g.circle(0.5, 0.5, 0.12);
    // Operating nut
    g.path(Array.from({ length: 5 }, (_, i) => [
      0.5 + 0.05 * Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2),
      0.5 + 0.05 * Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2)
    ]), true);
    // 4.5" Pumper nozzle (facing front/down)
    g.roundRect(0.4, 0.7, 0.2, 0.16, 0.02);
    g.circle(0.5, 0.82, 0.025);
    // Dual 2.5" hose ports (left & right)
    g.roundRect(0.14, 0.42, 0.16, 0.16, 0.02);
    g.circle(0.18, 0.5, 0.02);
    g.roundRect(0.7, 0.42, 0.16, 0.16, 0.02);
    g.circle(0.82, 0.5, 0.02);
    return g.entities;
  },

  turnstile: () => {
    const g = objectDrawing('A-SITE');
    // Optical Security Speed Gates / Turnstiles with RFID readers, tempered glass barrier wings & sensors
    // Left & right pedestal housings
    g.roundRect(0.04, 0.06, 0.2, 0.88, 0.04);
    g.roundRect(0.76, 0.06, 0.2, 0.88, 0.04);
    // Card reader / display top zones
    g.roundRect(0.08, 0.12, 0.12, 0.18, 0.02);
    g.circle(0.14, 0.21, 0.03);
    g.roundRect(0.8, 0.12, 0.12, 0.18, 0.02);
    g.circle(0.86, 0.21, 0.03);
    // Directional indicator LED arrows
    g.path([[0.14, 0.72], [0.14, 0.82], [0.11, 0.77], [0.14, 0.82], [0.17, 0.77]]);
    g.path([[0.86, 0.72], [0.86, 0.82], [0.83, 0.77], [0.86, 0.82], [0.89, 0.77]]);
    // Glass wing pivot spindles
    g.circle(0.24, 0.5, 0.035);
    g.circle(0.76, 0.5, 0.035);
    // Glass barrier wings meeting at center
    g.roundRect(0.25, 0.485, 0.24, 0.03, 0.008);
    g.roundRect(0.51, 0.485, 0.24, 0.03, 0.008);
    // Wing swing clearance arcs
    g.arc(0.24, 0.5, 0.24, 0.24, -Math.PI / 3, 0, 16);
    g.arc(0.76, 0.5, 0.24, 0.24, Math.PI, 4 * Math.PI / 3, 16);
    // Photocell safety beam sensor dots along inner faces
    for (let y = 0.3; y <= 0.7; y += 0.13) {
      g.circle(0.24, y, 0.012);
      g.circle(0.76, y, 0.012);
    }
    return g.entities;
  }
};
