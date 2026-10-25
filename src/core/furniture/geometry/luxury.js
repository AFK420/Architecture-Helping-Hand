import { objectDrawing } from './primitives.js';

export const LUXURY_GEOMETRY = {
  piano: () => {
    const g = objectDrawing();
    g.path([[0, 0], [1, 0], ...Array.from({ length: 32 }, (_, i) => {
      const t = i / 31;
      return [1 - 0.18 * t - 0.22 * Math.sin(t * Math.PI / 2), t];
    }), [0, 1]], true);
    g.path([[0.04, 0.04], [0.96, 0.04], ...Array.from({ length: 32 }, (_, i) => {
      const t = i / 31;
      return [0.96 - 0.18 * t - 0.22 * Math.sin(t * Math.PI / 2), 0.04 + 0.92 * t];
    }), [0.04, 0.96]], true);
    for (let y = 0.15; y < 0.9; y += 0.1) g.line(0.2, y, 0.7 - 0.2 * y, y);
    g.rect(0.04, 0.06, 0.16, 0.88);
    for (let y = 0.08; y < 0.93; y += 0.035) {
      g.line(0.04, y, 0.2, y);
      g.rect(0.04, y, 0.09, 0.018);
    }
    g.line(0.24, 0.2, 0.24, 0.8);
    g.line(0.26, 0.1, 0.75, 0.65);
    return g.entities;
  },

  poolTable: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.rect(0.08, 0.08, 0.84, 0.84);
    g.rect(0.11, 0.11, 0.78, 0.78);
    for (const x of [0.08, 0.92]) {
      for (const y of [0.08, 0.5, 0.92]) g.circle(x, y, 0.035);
    }
    for (const x of [0.25, 0.5, 0.75]) {
      g.circle(x, 0.04, 0.008);
      g.circle(x, 0.96, 0.008);
    }
    for (const y of [0.25, 0.75]) {
      g.circle(0.04, y, 0.008);
      g.circle(0.96, y, 0.008);
    }
    g.line(0.25, 0.11, 0.25, 0.89);
    g.circle(0.25, 0.5, 0.02);
    g.circle(0.7, 0.5, 0.018);
    g.path([[0.66, 0.5], [0.8, 0.4], [0.8, 0.6]], true);
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        g.circle(0.68 + row * 0.024, 0.5 + (col - row / 2) * 0.026, 0.012);
      }
    }
    g.line(0.14, 0.2, 0.86, 0.8);
    g.line(0.14, 0.8, 0.86, 0.2);
    return g.entities;
  },

  fireplace: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.rect(0, 0.84, 1, 0.16);
    g.rect(0.08, 0, 0.84, 0.84);
    g.rect(0.16, 0.12, 0.68, 0.56);
    for (let x = 0.2; x < 0.82; x += 0.07) {
      g.line(x, 0.14, x + 0.04, 0.28);
      g.line(x + 0.04, 0.28, x, 0.42);
      g.line(x, 0.42, x + 0.04, 0.56);
    }
    g.rect(0.24, 0.32, 0.52, 0.28);
    g.roundRect(0.28, 0.38, 0.44, 0.08, 0.03);
    g.roundRect(0.32, 0.46, 0.36, 0.07, 0.025);
    g.path([[0.45, 0.52], [0.4, 0.38], [0.5, 0.18], [0.55, 0.4], [0.6, 0.5]], true);
    return g.entities;
  },

  wine: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    const bays = o.bays || 4;
    for (let i = 0; i < bays; i++) {
      const x1 = i / bays, x2 = (i + 1) / bays;
      g.rect(x1, 0, 1 / bays, 1);
      g.line(x1, 0, x2, 1);
      g.line(x1, 1, x2, 0);
      for (let j = 0; j < 3; j++) {
        const y = (j + 0.5) / 3;
        g.circle((x1 + x2) / 2, y, 0.18 / bays);
        g.circle((x1 + x2) / 2, y, 0.07 / bays);
      }
    }
    return g.entities;
  },

  cinemaRow: o => {
    const g = objectDrawing();
    const seats = o.seats || 4;
    for (let i = 0; i < seats; i++) {
      const sw = 1 / seats, sx = i * sw;
      g.roundRect(sx, 0, sw * 0.96, 0.82, sw * 0.08);
      g.roundRect(sx + sw * 0.12, 0.2, sw * 0.72, 0.44, sw * 0.06);
      g.roundRect(sx + sw * 0.15, 0.04, sw * 0.66, 0.16, sw * 0.04);
      g.roundRect(sx + sw * 0.15, 0.64, sw * 0.66, 0.34, sw * 0.04);
      g.circle(sx + sw * 0.07, 0.35, sw * 0.035);
      g.circle(sx + sw * 0.07, 0.35, sw * 0.015);
      g.circle(sx + sw * 0.89, 0.35, sw * 0.035);
      g.circle(sx + sw * 0.89, 0.35, sw * 0.015);
    }
    return g.entities;
  }
};
