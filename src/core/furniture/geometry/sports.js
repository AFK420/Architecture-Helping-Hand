import { objectDrawing } from './primitives.js';

export const SPORTS_GEOMETRY = {
  parallelBars: () => {
    const g = objectDrawing();
    for (const x of [0.15, 0.85]) {
      g.roundRect(x - 0.04, 0, 0.08, 1, 0.02);
      g.roundRect(x - 0.14, 0.1, 0.28, 0.1, 0.02);
      g.roundRect(x - 0.14, 0.8, 0.28, 0.1, 0.02);
      g.circle(x, 0.15, 0.02);
      g.circle(x, 0.85, 0.02);
    }
    return g.entities;
  },

  dartboard: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    for (const r of [0.04, 0.08, 0.16, 0.24]) g.ellipse(0.5, 0.2, r, r * 0.6);
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      g.line(0.5 + 0.08 * Math.cos(ang), 0.2 + 0.08 * 0.6 * Math.sin(ang), 0.5 + 0.24 * Math.cos(ang), 0.2 + 0.24 * 0.6 * Math.sin(ang));
    }
    g.line(0.1, 0.85, 0.9, 0.85);
    g.line(0.5, 0.35, 0.5, 0.85);
    return g.entities;
  },

  vrZone: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.roundRect(0.08, 0.08, 0.84, 0.84, 0.08);
    g.circle(0.5, 0.5, 0.22);
    g.circle(0.5, 0.5, 0.04);
    g.roundRect(0.32, 0.38, 0.36, 0.2, 0.04);
    g.circle(0.42, 0.48, 0.05);
    g.circle(0.58, 0.48, 0.05);
    for (const [cx, cy] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) {
      g.circle(cx, cy, 0.035);
      g.line(cx, cy, 0.5, 0.5);
    }
    return g.entities;
  },

  treadmill: () => {
    const g = objectDrawing();
    g.roundRect(0, 0, 1, 1, 0.04);
    g.roundRect(0.16, 0.22, 0.68, 0.74, 0.04);
    g.rect(0.16, 0.22, 0.07, 0.74);
    g.rect(0.77, 0.22, 0.07, 0.74);
    g.roundRect(0.12, 0.04, 0.76, 0.18, 0.04);
    g.roundRect(0.22, 0.06, 0.56, 0.12, 0.02);
    g.circle(0.3, 0.14, 0.02);
    g.circle(0.7, 0.14, 0.02);
    g.rect(0.48, 0.12, 0.04, 0.03);
    g.line(0.14, 0.12, 0.14, 0.65);
    g.line(0.86, 0.12, 0.86, 0.65);
    g.rect(0.12, 0.35, 0.04, 0.12);
    g.rect(0.84, 0.35, 0.04, 0.12);
    return g.entities;
  },

  bike: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.roundRect(0, 0, 1, 0.08, 0.02);
    g.roundRect(0, 0.92, 1, 0.08, 0.02);
    g.circle(0.5, 0.58, 0.18);
    g.circle(0.5, 0.58, 0.06);
    g.line(0.34, 0.58, 0.66, 0.58);
    g.rect(0.32, 0.56, 0.05, 0.05);
    g.rect(0.63, 0.56, 0.05, 0.05);
    g.path([[0.5, 0.24], [0.42, 0.38], [0.58, 0.38]], true);
    g.line(0.5, 0.38, 0.5, 0.12);
    g.roundRect(0.24, 0.08, 0.52, 0.05, 0.02);
    g.roundRect(0.4, 0.05, 0.2, 0.08, 0.02);
    return g.entities;
  },

  benchPress: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.roundRect(0.34, 0.15, 0.32, 0.76, 0.04);
    g.pillow(0.37, 0.18, 0.26, 0.14);
    g.rect(0.18, 0.22, 0.08, 0.08);
    g.rect(0.74, 0.22, 0.08, 0.08);
    g.line(0, 0.26, 1, 0.26);
    g.rect(0.05, 0.16, 0.08, 0.2);
    g.rect(0.87, 0.16, 0.08, 0.2);
    g.rect(0.13, 0.23, 0.03, 0.06);
    g.rect(0.84, 0.23, 0.03, 0.06);
    if (o.machine) {
      g.path([[0.04, 1], [0.04, 0.04], [0.96, 0.04], [0.96, 1]]);
      g.line(0.04, 0.5, 0.96, 0.5);
      for (const [x, y] of [[0.04, 0.04], [0.96, 0.04], [0.04, 0.96], [0.96, 0.96]]) g.circle(x, y, 0.03);
    }
    return g.entities;
  },

  court: o => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    if (o.pool) {
      g.roundRect(0.04, 0.02, 0.92, 0.96, 0.02);
      for (let x = 0.15; x < 0.9; x += 0.14) {
        g.line(x, 0.02, x, 0.98);
        for (let y = 0.1; y < 0.95; y += 0.1) g.circle(x, y, 0.012);
      }
      for (const lx of [0.08, 0.88]) {
        for (const ly of [0.06, 0.9]) {
          g.circle(lx - 0.02, ly, 0.015);
          g.circle(lx + 0.02, ly, 0.015);
          g.line(lx - 0.02, ly, lx + 0.02, ly);
        }
      }
    } else if (o.tennis) {
      g.line(0.06, 0.06, 0.94, 0.06);
      g.line(0.06, 0.94, 0.94, 0.94);
      g.line(0.06, 0.06, 0.06, 0.94);
      g.line(0.94, 0.06, 0.94, 0.94);
      g.line(0.18, 0.06, 0.18, 0.94);
      g.line(0.82, 0.06, 0.82, 0.94);
      g.line(0.18, 0.27, 0.82, 0.27);
      g.line(0.18, 0.73, 0.82, 0.73);
      g.line(0.5, 0.27, 0.5, 0.73);
      g.line(0.5, 0.06, 0.5, 0.1);
      g.line(0.5, 0.94, 0.5, 0.9);
      g.line(0.02, 0.5, 0.98, 0.5);
      g.circle(0.02, 0.5, 0.015);
      g.circle(0.98, 0.5, 0.015);
      g.rect(0.48, 0.49, 0.04, 0.02);
    } else if (o.field) {
      g.line(0, 0.5, 1, 0.5);
      g.circle(0.5, 0.5, 0.12);
      g.circle(0.5, 0.5, 0.015);
      g.rect(0.2, 0, 0.6, 0.18);
      g.rect(0.2, 0.82, 0.6, 0.18);
      g.rect(0.35, 0, 0.3, 0.07);
      g.rect(0.35, 0.93, 0.3, 0.07);
      g.circle(0.5, 0.12, 0.015);
      g.arc(0.5, 0.12, 0.09, 0.09, 0.2 * Math.PI, 0.8 * Math.PI, 16);
      g.circle(0.5, 0.88, 0.015);
      g.arc(0.5, 0.88, 0.09, 0.09, 1.2 * Math.PI, 1.8 * Math.PI, 16);
      g.rect(0.4, 0, 0.2, 0.025);
      g.rect(0.4, 0.975, 0.2, 0.025);
    } else {
      g.line(0, 0.5, 1, 0.5);
      g.circle(0.5, 0.5, 0.14);
      g.rect(0.32, 0, 0.36, 0.22);
      g.rect(0.32, 0.78, 0.36, 0.22);
      g.arc(0.5, 0.22, 0.18, 0.18, 0, Math.PI, 20);
      g.arc(0.5, 0.78, 0.18, 0.18, Math.PI, 2 * Math.PI, 20);
      g.arc(0.5, 0.06, 0.42, 0.32, 0.15 * Math.PI, 0.85 * Math.PI, 24);
      g.arc(0.5, 0.94, 0.42, 0.32, 1.15 * Math.PI, 1.85 * Math.PI, 24);
      g.line(0.38, 0.05, 0.62, 0.05);
      g.circle(0.5, 0.08, 0.03);
      g.line(0.38, 0.95, 0.62, 0.95);
      g.circle(0.5, 0.92, 0.03);
    }
    return g.entities;
  },

  net: () => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    for (let x = 0.05; x < 1; x += 0.08) g.line(x, 0, x, 1);
    for (let y = 0.05; y < 1; y += 0.08) g.line(0, y, 1, y);
    g.rect(0, 0, 0.05, 1);
    g.rect(0.95, 0, 0.05, 1);
    return g.entities;
  },

  arcade: o => {
    const g = objectDrawing();
    g.path([[0, 0], [1, 0], [1, 0.6], [0.88, 1], [0.12, 1], [0, 0.6]], true);
    g.rect(0.08, 0.08, 0.84, 0.34);
    g.rect(0.12, 0.58, 0.76, 0.22);
    if (o.racing) {
      g.circle(0.5, 0.68, 0.12);
      g.circle(0.5, 0.68, 0.04);
      g.line(0.38, 0.68, 0.62, 0.68);
    } else {
      g.circle(0.28, 0.68, 0.035);
      for (let x = 0.48; x < 0.82; x += 0.09) {
        g.circle(x, 0.65, 0.022);
        g.circle(x, 0.72, 0.022);
      }
    }
    g.rect(0.38, 0.86, 0.24, 0.08);
    return g.entities;
  },

  mat: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.roundRect(0.03, 0.03, 0.94, 0.94, 0.04);
    g.circle(0.5, 0.5, 0.24);
    g.circle(0.5, 0.5, 0.12);
    g.line(0.1, 0.5, 0.9, 0.5);
    return g.entities;
  },

  squatRack: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    for (const x of [0.12, 0.88]) {
      for (const y of [0.16, 0.84]) {
        g.rect(x - 0.04, y - 0.04, 0.08, 0.08);
        g.circle(x, y, 0.02);
      }
      g.line(x, 0.16, x, 0.84);
    }
    g.line(0.12, 0.16, 0.88, 0.16);
    g.line(0.12, 0.84, 0.88, 0.84);
    g.line(0.12, 0.86, 0.88, 0.86);
    g.line(0, 0.5, 1, 0.5);
    g.line(0, 0.51, 1, 0.51);
    for (const sx of [0.03, 0.06, 0.09, 0.91, 0.94, 0.97]) {
      g.rect(sx - 0.015, 0.32, 0.03, 0.36);
    }
    g.circle(0.15, 0.5, 0.03);
    g.circle(0.85, 0.5, 0.03);
    return g.entities;
  },

  cableCrossover: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    for (const tx of [0.02, 0.82]) {
      g.roundRect(tx, 0.1, 0.16, 0.8, 0.03);
      g.rect(tx + 0.02, 0.2, 0.12, 0.6);
      for (let y = 0.24; y < 0.78; y += 0.05) g.line(tx + 0.02, y, tx + 0.14, y);
      g.circle(tx + 0.08, 0.5, 0.02);
    }
    g.rect(0.18, 0.46, 0.64, 0.08);
    g.line(0.42, 0.42, 0.58, 0.42);
    g.line(0.42, 0.58, 0.58, 0.58);
    g.line(0.46, 0.42, 0.46, 0.58);
    g.line(0.54, 0.42, 0.54, 0.58);
    g.line(0.18, 0.5, 0.28, 0.62);
    g.roundRect(0.26, 0.6, 0.05, 0.08, 0.01);
    g.line(0.82, 0.5, 0.72, 0.62);
    g.roundRect(0.69, 0.6, 0.05, 0.08, 0.01);
    return g.entities;
  },

  dumbbellRack: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.line(0.04, 0.12, 0.96, 0.12);
    g.line(0.04, 0.88, 0.96, 0.88);
    g.rect(0, 0.06, 0.04, 0.88);
    g.rect(0.96, 0.06, 0.04, 0.88);
    const count = 5;
    for (let i = 0; i < count; i++) {
      const cx = 0.1 + i * 0.19;
      g.roundRect(cx - 0.05, 0.68, 0.1, 0.22, 0.02);
      g.rect(cx - 0.04, 0.7, 0.025, 0.18);
      g.rect(cx + 0.015, 0.7, 0.025, 0.18);
      g.line(cx - 0.015, 0.79, cx + 0.015, 0.79);
      g.roundRect(cx - 0.06, 0.18, 0.12, 0.24, 0.02);
      g.rect(cx - 0.05, 0.2, 0.03, 0.2);
      g.rect(cx + 0.02, 0.2, 0.03, 0.2);
      g.line(cx - 0.02, 0.3, cx + 0.02, 0.3);
    }
    return g.entities;
  },

  kettlebellRack: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.line(0.04, 0.15, 0.96, 0.15);
    g.line(0.04, 0.85, 0.96, 0.85);
    const count = 5;
    for (let i = 0; i < count; i++) {
      const cx = 0.1 + i * 0.19;
      g.circle(cx, 0.5, 0.075);
      g.circle(cx, 0.5, 0.02);
      g.path([[cx - 0.045, 0.44], [cx - 0.04, 0.36], [cx + 0.04, 0.36], [cx + 0.045, 0.44]]);
      g.line(cx - 0.035, 0.38, cx + 0.035, 0.38);
    }
    return g.entities;
  }
};
