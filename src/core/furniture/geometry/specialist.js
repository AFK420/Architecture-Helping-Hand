import { objectDrawing } from './primitives.js';

/** Equipment and civic/service symbols whose plan compositions cannot use furniture templates. */
export const SPECIALIST_GEOMETRY = {
  firePole: () => {
    const g = objectDrawing('A-SITE');
    g.circle(0.5, 0.5, 0.49);
    g.circle(0.5, 0.5, 0.42);
    g.circle(0.5, 0.5, 0.08);
    g.circle(0.5, 0.5, 0.03);
    g.arc(0.5, 0.5, 0.46, 0.46, 0.25 * Math.PI, 1.75 * Math.PI, 24);
    g.line(0.5 + 0.46 * Math.cos(0.25 * Math.PI), 0.5 + 0.46 * Math.sin(0.25 * Math.PI), 0.5 + 0.46 * Math.cos(1.75 * Math.PI), 0.5 + 0.46 * Math.sin(1.75 * Math.PI));
    return g.entities;
  },

  ottoman: o => {
    const g = objectDrawing();
    if (o.round) {
      g.circle(0.5, 0.5, 0.49);
      g.circle(0.5, 0.5, 0.42);
      g.circle(0.5, 0.5, 0.03);
      for (let n = 0; n < 8; n++) {
        const a = n * Math.PI / 4;
        g.line(0.5, 0.5, 0.5 + 0.42 * Math.cos(a), 0.5 + 0.42 * Math.sin(a));
        g.circle(0.5 + 0.24 * Math.cos(a), 0.5 + 0.24 * Math.sin(a), 0.018);
      }
    } else {
      g.roundRect(0, 0, 1, 1, 0.06);
      g.roundRect(0.06, 0.06, 0.88, 0.88, 0.04);
      g.line(0.06, 0.5, 0.94, 0.5);
      g.line(0.5, 0.06, 0.5, 0.94);
      for (const x of [0.28, 0.72]) {
        for (const y of [0.28, 0.72]) g.circle(x, y, 0.02);
      }
    }
    return g.entities;
  },

  cabinet: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.rect(0.04, 0.04, 0.92, 0.92);
    const drawers = o.drawers || 4;
    for (let i = 0; i < drawers; i++) {
      const y1 = i / drawers;
      const y2 = (i + 1) / drawers;
      g.line(0.04, y2, 0.96, y2);
      g.roundRect(0.35, y1 + 0.03 / drawers, 0.3, 0.04 / drawers + 0.03, 0.01);
    }
    return g.entities;
  },

  checkout: () => {
    const g = objectDrawing();
    g.path([[0, 0], [0.72, 0], [0.72, 0.2], [1, 0.2], [1, 0.8], [0.72, 0.8], [0.72, 1], [0, 1]], true);
    g.roundRect(0.06, 0.04, 0.58, 0.48, 0.02);
    for (let y = 0.1; y < 0.5; y += 0.08) g.line(0.06, y, 0.64, y);
    g.roundRect(0.12, 0.55, 0.28, 0.18, 0.02);
    g.circle(0.26, 0.64, 0.04);
    g.rect(0.44, 0.56, 0.18, 0.16);
    g.line(0.44, 0.64, 0.38, 0.64);
    g.roundRect(0.08, 0.75, 0.54, 0.22, 0.03);
    g.circle(0.35, 0.86, 0.06);
    g.roundRect(0.76, 0.1, 0.18, 0.8, 0.04);
    g.line(0.85, 0.1, 0.85, 0.9);
    return g.entities;
  },

  deskLayout: o => {
    const g = objectDrawing();
    if (o.u) {
      g.path([[0, 0], [1, 0], [1, 1], [0.72, 1], [0.72, 0.3], [0.28, 0.3], [0.28, 1], [0, 1]], true);
      g.line(0, 0.05, 1, 0.05);
      g.roundRect(0.35, 0.08, 0.3, 0.04, 0.01);
      g.starBase(0.5, 0.65, 0.2, 5);
      g.roundRect(0.36, 0.54, 0.28, 0.22, 0.04);
    } else {
      g.path([[0, 0], [1, 0], [1, 0.36], [0.36, 0.36], [0.36, 1], [0, 1]], true);
      g.line(0, 0.05, 1, 0.05);
      g.roundRect(0.44, 0.08, 0.3, 0.04, 0.01);
      g.starBase(0.65, 0.65, 0.2, 5);
      g.roundRect(0.52, 0.54, 0.26, 0.22, 0.04);
    }
    return g.entities;
  },

  reception: o => {
    const g = objectDrawing();
    const type = o.type || 'corporate';
    if (type === 'hotel') {
      // Hotel Concierge / Bell Captain Desk
      g.roundRect(0, 0, 1, 1, 0.02);
      g.rect(0, 0, 1, 0.24);
      // Traditional brass concierge call bell
      g.circle(0.82, 0.12, 0.04);
      g.circle(0.82, 0.12, 0.015);
      // Leather guest register ledger
      g.rect(0.46, 0.05, 0.18, 0.14);
      g.line(0.55, 0.05, 0.55, 0.19);
      for (let y = 0.07; y < 0.18; y += 0.025) {
        g.line(0.48, y, 0.53, y);
        g.line(0.57, y, 0.62, y);
      }
      // Pen stand
      g.circle(0.68, 0.1, 0.02);
      // Staff computer terminal & keyboard
      g.roundRect(0.16, 0.35, 0.3, 0.04, 0.01);
      g.roundRect(0.2, 0.44, 0.22, 0.1, 0.01);
      g.starBase(0.5, 0.72, 0.18, 5);
      g.roundRect(0.38, 0.6, 0.24, 0.24, 0.04);
    } else if (type === 'security') {
      // Security Command / Guard Reception Console
      g.rect(0, 0, 1, 1);
      g.arc(0.5, 0.1, 0.48, 0.1, 0, Math.PI, 20);
      // CCTV monitors
      g.roundRect(0.12, 0.14, 0.22, 0.04, 0.01);
      g.roundRect(0.39, 0.12, 0.22, 0.04, 0.01);
      g.roundRect(0.66, 0.14, 0.22, 0.04, 0.01);
      // Badge reader / intercom
      g.rect(0.06, 0.26, 0.12, 0.1);
      g.rect(0.82, 0.26, 0.12, 0.1);
      g.circle(0.88, 0.31, 0.025);
      g.starBase(0.5, 0.68, 0.2, 5);
      g.roundRect(0.36, 0.56, 0.28, 0.26, 0.04);
    } else if (type === 'counter') {
      // Commercial Concession / Checkout Transaction Counter
      g.rect(0, 0, 1, 1);
      g.rect(0, 0, 1, 0.2);
      g.line(0.02, 0.2, 0.98, 0.2);
      g.roundRect(0.54, 0.28, 0.24, 0.16, 0.02);
      g.roundRect(0.8, 0.3, 0.12, 0.14, 0.02);
      g.rect(0.38, 0.28, 0.12, 0.12);
      g.rect(0.52, 0.5, 0.4, 0.44);
      g.starBase(0.24, 0.68, 0.16, 5);
      g.roundRect(0.15, 0.58, 0.18, 0.2, 0.03);
    } else if (type === 'podium') {
      // Presentation Lectern / Speaker Podium
      g.roundRect(0, 0, 1, 1, 0.04);
      g.rect(0.08, 0.9, 0.84, 0.04);
      g.circle(0.24, 0.14, 0.02);
      g.line(0.24, 0.14, 0.28, 0.04);
      g.circle(0.76, 0.14, 0.02);
      g.line(0.76, 0.14, 0.72, 0.04);
      g.rect(0.4, 0.06, 0.2, 0.05);
      g.circle(0.84, 0.68, 0.04);
    } else {
      // Corporate Dual-Height Reception Desk with ADA Lowered Counter
      g.path([[0, 1], [0, 0], [1, 0], [1, 1], [0.78, 1], [0.78, 0.28], [0.22, 0.28], [0.22, 1]], true);
      g.line(0.04, 0.1, 0.96, 0.1);
      // High visitor transaction ledge
      g.rect(0, 0, 0.7, 0.26);
      // ADA lowered counter section
      g.rect(0.7, 0, 0.3, 0.26);
      g.circle(0.85, 0.13, 0.035);
      // Staff work surface
      g.rect(0.24, 0.28, 0.52, 0.7);
      g.roundRect(0.36, 0.34, 0.28, 0.04, 0.01);
      g.roundRect(0.38, 0.42, 0.24, 0.08, 0.015);
      g.starBase(0.5, 0.7, 0.18, 5);
      g.roundRect(0.38, 0.6, 0.24, 0.22, 0.04);
      if (o.fingerprint) {
        g.rect(0.62, 0.1, 0.18, 0.1);
        g.circle(0.71, 0.15, 0.03);
      }
    }
    return g.entities;
  },

  roundShade: o => {
    const g = objectDrawing('A-SITE');
    g.circle(0.5, 0.5, 0.49);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      g.line(0.5, 0.5, 0.5 + 0.49 * Math.cos(a), 0.5 + 0.49 * Math.sin(a));
    }
    g.circle(0.5, 0.5, 0.05);
    g.circle(0.5, 0.5, 0.02);
    if (o.gazebo) {
      g.circle(0.5, 0.5, 0.42);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        g.rect(0.5 + 0.42 * Math.cos(a) - 0.025, 0.5 + 0.42 * Math.sin(a) - 0.025, 0.05, 0.05);
      }
    }
    return g.entities;
  },

  drinkingFountain: () => {
    const g = objectDrawing('A-SITE');
    g.roundRect(0.08, 0.06, 0.84, 0.88, 0.04);
    g.roundRect(0.16, 0.32, 0.68, 0.54, 0.08);
    g.circle(0.5, 0.62, 0.04);
    g.circle(0.5, 0.62, 0.015);
    g.rect(0.24, 0.36, 0.06, 0.08);
    g.circle(0.27, 0.36, 0.02);
    g.line(0.12, 0.92, 0.88, 0.92);
    g.line(0.06, 0.45, 0.06, 0.75);
    g.line(0.94, 0.45, 0.94, 0.75);
    g.roundRect(0.25, 0.08, 0.5, 0.2, 0.02);
    g.circle(0.5, 0.18, 0.025);
    return g.entities;
  },

  firepit: () => {
    const g = objectDrawing('A-SITE');
    g.circle(0.5, 0.5, 0.49);
    g.circle(0.5, 0.5, 0.38);
    g.circle(0.5, 0.5, 0.22);
    g.line(0.25, 0.35, 0.75, 0.65);
    g.line(0.25, 0.65, 0.75, 0.35);
    g.path([[0.4, 0.6], [0.33, 0.45], [0.5, 0.18], [0.53, 0.43], [0.68, 0.55], [0.6, 0.65]], true);
    return g.entities;
  },

  pressureAppliance: o => {
    const g = objectDrawing();
    g.roundRect(0, 0, 1, 1, 0.03);
    g.rect(0.08, 0.1, 0.84, 0.8);
    g.circle(0.5, 0.55, 0.32);
    g.circle(0.5, 0.55, 0.25);
    g.line(0.5, 0.3, 0.5, 0.8);
    g.line(0.25, 0.55, 0.75, 0.55);
    for (let x = 0.2; x < 0.85; x += 0.2) g.circle(x, 0.15, 0.025);
    if (o.kiln) {
      for (let x = 0.2; x < 1; x += 0.2) g.line(x, 0.85, x, 0.95);
    }
    return g.entities;
  },

  oven: o => {
    const g = objectDrawing();
    g.roundRect(0, 0, 1, 1, 0.02);
    g.roundRect(0.08, 0.24, 0.84, 0.68, 0.04);
    g.roundRect(0.14, 0.32, 0.72, 0.52, 0.02);
    for (let x = 0.18; x < 0.9; x += 0.18) g.circle(x, 0.12, 0.03);
    g.line(0.2, 0.26, 0.8, 0.26);
    if (o.hood) {
      for (let x = 0.18; x < 0.9; x += 0.12) g.line(x, 0.36, x, 0.78);
    }
    return g.entities;
  },

  pallet: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    for (let x = 0; x < 1; x += 0.2) g.rect(x, 0, 0.12, 1);
    for (const y of [0.06, 0.82]) g.rect(0, y, 1, 0.12);
    if (o.rack) {
      g.rect(0, 0, 0.04, 1);
      g.rect(0.96, 0, 0.04, 1);
      g.line(0, 0.5, 1, 0.5);
    }
    return g.entities;
  },

  boothSeating: o => {
    const g = objectDrawing();
    g.seat(0, 0.05, 0.25, 0.9, false);
    g.seat(0.75, 0.05, 0.25, 0.9, false);
    g.roundRect(0.3, 0.08, 0.4, 0.84, 0.03);
    g.roundRect(0.34, 0.12, 0.32, 0.76, 0.02);
    const seats = o.seats || 2;
    for (let i = 1; i < seats; i++) {
      const y = 0.05 + i * 0.9 / seats;
      g.line(0, y, 0.25, y);
      g.line(0.75, y, 1, y);
    }
    return g.entities;
  },

  sportsTable: o => {
    const g = objectDrawing();
    if (o.poker) {
      // 10-Player Casino / Home Oval Poker Table
      g.roundRect(0, 0, 1, 1, 0.45);
      g.roundRect(0.04, 0.05, 0.92, 0.9, 0.4);
      for (const [cx, cy] of [[0.24, 0.12], [0.41, 0.11], [0.59, 0.11], [0.76, 0.12], [0.24, 0.88], [0.41, 0.89], [0.59, 0.89], [0.76, 0.88], [0.1, 0.5], [0.9, 0.5]]) {
        g.circle(cx, cy, 0.024);
        g.circle(cx, cy, 0.014);
      }
      g.roundRect(0.14, 0.18, 0.72, 0.64, 0.3);
      g.roundRect(0.2, 0.26, 0.6, 0.48, 0.24);
      g.roundRect(0.4, 0.18, 0.2, 0.08, 0.015);
      for (let x = 0.43; x <= 0.57; x += 0.028) g.line(x, 0.18, x, 0.26);
    } else if (o.pingpong) {
      // ITTF Regulation Table Tennis Table (9x5 ft)
      g.rect(0, 0, 1, 1);
      g.rect(0.02, 0.02, 0.96, 0.96);
      g.line(0.02, 0.5, 0.98, 0.5);
      g.line(0.5, 0, 0.5, 1);
      g.line(0.495, 0, 0.495, 1);
      g.line(0.505, 0, 0.505, 1);
      g.rect(0.48, 0, 0.04, 0.03);
      g.rect(0.48, 0.97, 0.04, 0.03);
      g.circle(0.25, 0.32, 0.055);
      g.line(0.25, 0.375, 0.25, 0.45);
      g.roundRect(0.235, 0.39, 0.03, 0.06, 0.01);
      g.circle(0.75, 0.68, 0.055);
      g.line(0.75, 0.625, 0.75, 0.55);
      g.roundRect(0.735, 0.55, 0.03, 0.06, 0.01);
      g.circle(0.38, 0.65, 0.02);
    } else if (o.foosball) {
      // Table Soccer / Foosball Table
      g.rect(0, 0, 1, 1);
      g.roundRect(0.08, 0.04, 0.84, 0.92, 0.03);
      g.rect(0.12, 0.08, 0.76, 0.84);
      g.line(0.12, 0.5, 0.88, 0.5);
      g.circle(0.5, 0.5, 0.1);
      g.circle(0.5, 0.5, 0.02);
      g.rect(0.35, 0.04, 0.3, 0.04);
      g.rect(0.35, 0.92, 0.3, 0.04);
      g.rect(0.3, 0.08, 0.4, 0.12);
      g.rect(0.3, 0.8, 0.4, 0.12);
      for (let i = 0; i < 8; i++) {
        const y = 0.14 + i * 0.103;
        g.line(0.08, y, 0.92, y);
        if (i % 2 === 0) {
          g.roundRect(0, y - 0.015, 0.08, 0.03, 0.01);
          g.rect(0.92, y - 0.015, 0.04, 0.03);
        } else {
          g.roundRect(0.92, y - 0.015, 0.08, 0.03, 0.01);
          g.rect(0.04, y - 0.015, 0.04, 0.03);
        }
        for (let x = 0.22; x < 0.85; x += 0.24) g.roundRect(x - 0.025, y - 0.03, 0.05, 0.06, 0.01);
      }
    } else if (o.hockey) {
      // Commercial Air Hockey Table
      g.roundRect(0, 0, 1, 1, 0.06);
      g.roundRect(0.05, 0.04, 0.9, 0.92, 0.04);
      g.roundRect(0.08, 0.07, 0.84, 0.86, 0.02);
      g.line(0.08, 0.5, 0.92, 0.5);
      g.circle(0.5, 0.5, 0.14);
      g.circle(0.5, 0.5, 0.02);
      g.circle(0.5, 0.22, 0.1);
      g.circle(0.5, 0.78, 0.1);
      g.roundRect(0.34, 0.04, 0.32, 0.03, 0.01);
      g.roundRect(0.34, 0.93, 0.32, 0.03, 0.01);
      g.circle(0.5, 0.24, 0.045);
      g.circle(0.5, 0.24, 0.02);
      g.circle(0.5, 0.76, 0.045);
      g.circle(0.5, 0.76, 0.02);
      g.circle(0.44, 0.42, 0.035);
      g.line(0.36, 0.02, 0.64, 0.02);
      g.line(0.36, 0.98, 0.64, 0.98);
    } else {
      g.rect(0, 0, 1, 1);
      g.rect(0.04, 0.04, 0.92, 0.92);
      g.line(0.5, 0, 0.5, 1);
      g.line(0, 0.48, 1, 0.48);
      g.line(0, 0.52, 1, 0.52);
    }
    return g.entities;
  },

  elliptical: () => {
    const g = objectDrawing();
    g.roundRect(0.08, 0, 0.84, 0.08, 0.02);
    g.roundRect(0.08, 0.92, 0.84, 0.08, 0.02);
    for (const x of [0.3, 0.7]) {
      g.ellipse(x, 0.65, 0.12, 0.22);
      g.line(x, 0.45, x, 0.08);
      g.roundRect(x - 0.06, 0.14, 0.12, 0.08, 0.02);
    }
    g.roundRect(0.32, 0.04, 0.36, 0.14, 0.02);
    g.line(0.16, 0.38, 0.84, 0.38);
    return g.entities;
  },

  rower: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.roundRect(0.12, 0, 0.76, 0.06, 0.02);
    g.circle(0.5, 0.17, 0.14);
    g.circle(0.5, 0.17, 0.05);
    g.roundRect(0.44, 0.2, 0.12, 0.76, 0.02);
    g.roundRect(0.24, 0.56, 0.52, 0.14, 0.04);
    g.roundRect(0.18, 0.26, 0.18, 0.12, 0.02);
    g.roundRect(0.64, 0.26, 0.18, 0.12, 0.02);
    g.line(0.2, 0.24, 0.8, 0.24);
    g.roundRect(0.2, 0.94, 0.6, 0.06, 0.02);
    return g.entities;
  },

  rig: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    for (const x of [0, 0.94]) {
      for (const y of [0, 0.94]) {
        g.rect(x, y, 0.06, 0.06);
        g.circle(x + 0.03, y + 0.03, 0.015);
      }
    }
    g.line(0.06, 0.15, 0.94, 0.15);
    g.line(0.06, 0.85, 0.94, 0.85);
    g.roundRect(0.12, 0.35, 0.18, 0.3, 0.02);
    g.roundRect(0.7, 0.35, 0.18, 0.3, 0.02);
    if (o.cable) {
      g.line(0.2, 0.5, 0.5, 0.68);
      g.line(0.8, 0.5, 0.5, 0.68);
    } else {
      for (let x = 0.15; x < 0.9; x += 0.16) g.line(x, 0, x, 1);
    }
    return g.entities;
  },

  seesaw: o => {
    const g = objectDrawing('A-SITE');
    g.roundRect(0, 0, 1, 1, 0.08);
    g.roundRect(0.4, 0.4, 0.2, 0.2, 0.04);
    g.circle(0.5, 0.5, 0.05);
    g.path([[0.04, 0.44], [0.96, 0.44], [0.96, 0.56], [0.04, 0.56]], true);
    for (const x of [0.12, 0.88]) {
      g.roundRect(x - 0.06, 0.36, 0.12, 0.28, 0.03);
      g.line(x, 0.3, x, 0.7);
    }
    if (o.rocker) g.ellipse(0.5, 0.5, 0.32, 0.45);
    return g.entities;
  },

  climbingFrame: () => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    for (let x = 0; x <= 1; x += 0.2) g.line(x, 0, x, 1);
    for (let y = 0; y <= 1; y += 0.2) g.line(0, y, 1, y);
    g.roundRect(0.28, 0.28, 0.44, 0.44, 0.04);
    g.circle(0.5, 0.5, 0.12);
    return g.entities;
  },

  helipad: () => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    g.line(0, 0, 0.15, 0.15);
    g.line(1, 0, 0.85, 0.15);
    g.line(0, 1, 0.15, 0.85);
    g.line(1, 1, 0.85, 0.85);
    g.circle(0.5, 0.5, 0.44);
    g.circle(0.5, 0.5, 0.42);
    g.path([[0.32, 0.24], [0.42, 0.24], [0.42, 0.45], [0.58, 0.45], [0.58, 0.24], [0.68, 0.24], [0.68, 0.76], [0.58, 0.76], [0.58, 0.55], [0.42, 0.55], [0.42, 0.76], [0.32, 0.76]], true);
    for (let n = 0; n < 12; n++) {
      const a = n * Math.PI / 6;
      g.circle(0.5 + 0.43 * Math.cos(a), 0.5 + 0.43 * Math.sin(a), 0.015);
    }
    return g.entities;
  },

  track: () => {
    const g = objectDrawing('A-SITE');
    for (let i = 0; i < 6; i++) {
      const r = 0.5 - i * 0.035;
      g.path([[0.5 - r, 0.3], ...Array.from({ length: 25 }, (_, n) => {
        const a = Math.PI + n * Math.PI / 24;
        return [0.5 + r * Math.cos(a), 0.3 + 0.3 * r / 0.5 * Math.sin(a)];
      }), [0.5 + r, 0.7], ...Array.from({ length: 25 }, (_, n) => {
        const a = n * Math.PI / 24;
        return [0.5 + r * Math.cos(a), 0.7 + 0.3 * r / 0.5 * Math.sin(a)];
      })], true);
    }
    g.line(0.6, 0.02, 0.6, 0.3);
    return g.entities;
  },

  trampoline: () => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    g.roundRect(0.08, 0.08, 0.84, 0.84, 0.04);
    g.circle(0.5, 0.5, 0.34);
    for (let x = 0.1; x < 0.9; x += 0.08) {
      g.line(x, 0, x, 0.08);
      g.line(x, 0.92, x, 1);
    }
    for (let y = 0.1; y < 0.9; y += 0.08) {
      g.line(0, y, 0.08, y);
      g.line(0.92, y, 1, y);
    }
    return g.entities;
  }
};
