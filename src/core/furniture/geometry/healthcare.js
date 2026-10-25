import { objectDrawing } from './primitives.js';

export const HEALTHCARE_GEOMETRY = {
  medicalBed: o => {
    const g = objectDrawing();
    g.roundRect(0.04, 0.02, 0.92, 0.96, 0.04);
    for (const x of [0.05, 0.95]) {
      for (const y of [0.04, 0.96]) g.circle(x, y, 0.035);
    }
    g.roundRect(0.12, 0.08, 0.76, 0.26, 0.02);
    g.pillow(0.24, 0.12, 0.52, 0.16);
    g.roundRect(0.12, 0.36, 0.76, 0.22, 0.02);
    g.roundRect(0.12, 0.6, 0.76, 0.18, 0.02);
    g.roundRect(0.12, 0.8, 0.76, 0.14, 0.02);
    g.rect(0.01, 0.15, 0.06, 0.32);
    g.rect(0.93, 0.15, 0.06, 0.32);
    g.rect(0.01, 0.54, 0.06, 0.32);
    g.rect(0.93, 0.54, 0.06, 0.32);
    for (let y = 0.18; y < 0.45; y += 0.06) {
      g.line(0.01, y, 0.07, y);
      g.line(0.93, y, 0.99, y);
    }
    for (let y = 0.57; y < 0.84; y += 0.06) {
      g.line(0.01, y, 0.07, y);
      g.line(0.93, y, 0.99, y);
    }
    g.wheels(0.06, 0.06, 0.88, 0.88);
    g.circle(0.12, 0.04, 0.02);
    g.circle(0.88, 0.04, 0.02);
    if (o.icu) {
      g.rect(0.86, 0.12, 0.12, 0.22);
      g.line(0.86, 0.18, 0.76, 0.18);
      g.circle(0.92, 0.23, 0.02);
      g.rect(0.15, 0, 0.7, 0.04);
      for (let x = 0.25; x < 0.8; x += 0.12) g.circle(x, 0.02, 0.01);
    }
    if (o.stretcher) {
      g.roundRect(0.2, 0, 0.6, 0.03, 0.01);
      g.roundRect(0.2, 0.97, 0.6, 0.03, 0.01);
      g.line(0.12, 0.38, 0.88, 0.38);
      g.rect(0.46, 0.36, 0.08, 0.04);
      g.line(0.12, 0.68, 0.88, 0.68);
      g.rect(0.46, 0.66, 0.08, 0.04);
    }
    return g.entities;
  },

  medicalTable: o => {
    const g = objectDrawing();
    g.roundRect(0.05, 0.02, 0.9, 0.96, 0.04);
    g.roundRect(0.1, 0.06, 0.8, 0.88, 0.03);
    g.line(0.1, 0.35, 0.9, 0.35);
    g.pillow(0.25, 0.1, 0.5, 0.18);
    g.roundRect(0.2, 0.01, 0.6, 0.03, 0.01);
    g.line(0.1, 0.88, 0.02, 0.96);
    g.line(0.9, 0.88, 0.98, 0.96);
    g.circle(0.02, 0.96, 0.015);
    g.circle(0.98, 0.96, 0.015);
    if (o.operating) {
      g.roundRect(0, 0.35, 0.09, 0.3, 0.02);
      g.roundRect(0.91, 0.35, 0.09, 0.3, 0.02);
      g.line(0, 0.5, 0.09, 0.5);
      g.line(0.91, 0.5, 1, 0.5);
      g.circle(0.3, 0.45, 0.12);
      g.circle(0.3, 0.45, 0.04);
      g.circle(0.7, 0.45, 0.12);
      g.circle(0.7, 0.45, 0.04);
    }
    return g.entities;
  },

  dental: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.roundRect(0.22, 0.02, 0.22, 0.14, 0.04);
    g.roundRect(0.15, 0.18, 0.36, 0.32, 0.06);
    g.roundRect(0.16, 0.52, 0.34, 0.26, 0.04);
    g.roundRect(0.18, 0.8, 0.3, 0.18, 0.03);
    g.roundRect(0.08, 0.32, 0.06, 0.32, 0.02);
    g.roundRect(0.52, 0.32, 0.06, 0.32, 0.02);
    g.line(0.54, 0.38, 0.72, 0.28);
    g.line(0.72, 0.28, 0.82, 0.38);
    g.roundRect(0.68, 0.38, 0.3, 0.24, 0.02);
    for (let i = 0; i < 4; i++) g.line(0.72 + i * 0.06, 0.38, 0.72 + i * 0.06, 0.48);
    g.circle(0.68, 0.7, 0.07);
    g.circle(0.68, 0.7, 0.02);
    g.ellipse(0.78, 0.18, 0.12, 0.07);
    g.line(0.66, 0.18, 0.64, 0.22);
    g.line(0.9, 0.18, 0.92, 0.22);
    return g.entities;
  },

  wheelchair: o => {
    const g = objectDrawing();
    g.rect(0, 0.15, 0.09, 0.7);
    g.ellipse(0.045, 0.5, 0.035, 0.33);
    g.rect(0.91, 0.15, 0.09, 0.7);
    g.ellipse(0.955, 0.5, 0.035, 0.33);
    g.line(0, 0.5, 0.09, 0.5);
    g.line(0.91, 0.5, 1, 0.5);
    g.roundRect(0.15, 0.26, 0.7, 0.46, 0.04);
    g.roundRect(0.18, 0.12, 0.64, 0.14, 0.03);
    g.roundRect(0.11, 0.28, 0.06, 0.35, 0.02);
    g.roundRect(0.83, 0.28, 0.06, 0.35, 0.02);
    g.roundRect(0.18, 0.82, 0.26, 0.16, 0.02);
    g.roundRect(0.56, 0.82, 0.26, 0.16, 0.02);
    g.ellipse(0.14, 0.76, 0.03, 0.05);
    g.ellipse(0.86, 0.76, 0.03, 0.05);
    g.roundRect(0.18, 0.02, 0.05, 0.1, 0.015);
    g.roundRect(0.77, 0.02, 0.05, 0.1, 0.015);
    if (o.sports) {
      g.line(0, 0.12, 0.2, 0.83);
      g.line(1, 0.12, 0.8, 0.83);
    }
    return g.entities;
  },

  cart: o => {
    const g = objectDrawing();
    if (o.crash) {
      // Emergency Crash Cart with defibrillator, oxygen tank, CPR board, drawers & IV pole
      g.roundRect(0.04, 0.08, 0.92, 0.84, 0.04);
      // Protective corner bumpers
      g.circle(0.05, 0.09, 0.04);
      g.circle(0.95, 0.09, 0.04);
      g.circle(0.05, 0.91, 0.04);
      g.circle(0.95, 0.91, 0.04);
      g.wheels(0.08, 0.12, 0.84, 0.76);
      // Ergonomic steering push handle
      g.roundRect(0.01, 0.28, 0.04, 0.44, 0.02);
      // Defibrillator unit on upper top shelf
      g.roundRect(0.52, 0.14, 0.38, 0.36, 0.02);
      g.rect(0.56, 0.18, 0.2, 0.14);
      g.circle(0.82, 0.24, 0.035);
      g.roundRect(0.56, 0.36, 0.12, 0.1, 0.02);
      g.roundRect(0.72, 0.36, 0.12, 0.1, 0.02);
      // Oxygen cylinder tank in rear cradle
      g.circle(0.24, 0.24, 0.11);
      g.circle(0.24, 0.24, 0.09);
      g.rect(0.22, 0.22, 0.04, 0.04);
      // IV pole bracket mount
      g.circle(0.12, 0.14, 0.035);
      g.circle(0.12, 0.14, 0.015);
      // Medication / airway drawers with pulls
      g.line(0.12, 0.58, 0.88, 0.58);
      g.roundRect(0.38, 0.6, 0.24, 0.04, 0.01);
      g.line(0.12, 0.72, 0.88, 0.72);
      g.roundRect(0.38, 0.74, 0.24, 0.04, 0.01);
      g.line(0.12, 0.84, 0.88, 0.84);
      g.roundRect(0.38, 0.86, 0.24, 0.03, 0.01);
      // CPR cardiac board on rear flank
      g.rect(0.15, 0.02, 0.7, 0.04);
      return g.entities;
    }
    g.roundRect(0.04, 0.06, 0.92, 0.88, 0.04);
    for (const x of [0.05, 0.95]) {
      for (const y of [0.07, 0.93]) g.circle(x, y, 0.03);
    }
    g.roundRect(0.2, 0, 0.6, 0.04, 0.01);
    for (let y = 0.24; y < 0.85; y += 0.16) {
      g.line(0.12, y, 0.88, y);
      g.rect(0.35, y - 0.03, 0.3, 0.03);
    }
    g.wheels(0.06, 0.08, 0.88, 0.84);
    if (o.monitor) {
      g.rect(0.2, 0.12, 0.6, 0.28);
      g.line(0.5, 0.4, 0.5, 0.58);
    }
    return g.entities;
  },

  lift: () => {
    const g = objectDrawing();
    g.path([[0.12, 1], [0.12, 0.35], [0.35, 0.18], [0.65, 0.18], [0.88, 0.35], [0.88, 1]]);
    g.rect(0.42, 0.06, 0.16, 0.2);
    g.line(0.5, 0.18, 0.5, 0.72);
    g.roundRect(0.25, 0.7, 0.5, 0.06, 0.02);
    g.circle(0.28, 0.73, 0.02);
    g.circle(0.72, 0.73, 0.02);
    g.circle(0.12, 0.95, 0.035);
    g.circle(0.88, 0.95, 0.035);
    g.circle(0.35, 0.2, 0.035);
    g.circle(0.65, 0.2, 0.035);
    return g.entities;
  },

  scanner: o => {
    const g = objectDrawing();
    if (o.ct) {
      // CT Scanner with angled gantry bore, emergency stops, displays & patient couch
      g.roundRect(0.04, 0, 0.92, 0.44, 0.06);
      g.circle(0.12, 0.08, 0.025);
      g.circle(0.88, 0.08, 0.025);
      g.roundRect(0.16, 0.04, 0.14, 0.05, 0.01);
      g.roundRect(0.7, 0.04, 0.14, 0.05, 0.01);
      g.circle(0.5, 0.22, 0.2);
      g.circle(0.5, 0.22, 0.15);
      g.line(0.5, 0.08, 0.5, 0.36);
      g.line(0.36, 0.22, 0.64, 0.22);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        g.line(0.5 + 0.16 * Math.cos(a), 0.22 + 0.16 * Math.sin(a), 0.5 + 0.19 * Math.cos(a), 0.22 + 0.19 * Math.sin(a));
      }
      g.roundRect(0.28, 0.18, 0.44, 0.82, 0.03);
      g.roundRect(0.35, 0.2, 0.3, 0.12, 0.03);
      g.line(0.31, 0.34, 0.31, 0.96);
      g.line(0.69, 0.34, 0.69, 0.96);
      g.line(0.28, 0.58, 0.72, 0.58);
      g.line(0.28, 0.8, 0.72, 0.8);
      return g.entities;
    }
    g.roundRect(0.04, 0, 0.92, 0.46, 0.08);
    g.circle(0.5, 0.23, 0.22);
    g.circle(0.5, 0.23, 0.16);
    g.circle(0.5, 0.23, 0.19);
    g.roundRect(0.28, 0.18, 0.44, 0.82, 0.04);
    g.roundRect(0.36, 0.2, 0.28, 0.14, 0.03);
    g.line(0.28, 0.5, 0.72, 0.5);
    g.line(0.28, 0.75, 0.72, 0.75);
    if (o.mri) {
      g.rect(0.02, 0, 0.96, 0.48);
    }
    return g.entities;
  },

  carm: () => {
    const g = objectDrawing();
    // Mobile Surgical C-Arm System with generator chassis, C-gantry, X-ray tube & detector
    g.roundRect(0.2, 0.64, 0.6, 0.32, 0.04);
    g.roundRect(0.25, 0.94, 0.5, 0.03, 0.01);
    g.wheels(0.24, 0.66, 0.52, 0.26);
    g.roundRect(0.32, 0.68, 0.36, 0.14, 0.02);
    g.circle(0.5, 0.55, 0.08);
    g.circle(0.5, 0.55, 0.03);
    g.rect(0.46, 0.32, 0.08, 0.23);
    // Outer and inner C-shaped arc
    g.arc(0.5, 0.32, 0.44, 0.44, 0.85 * Math.PI, 2.15 * Math.PI, 32);
    g.arc(0.5, 0.32, 0.36, 0.36, 0.85 * Math.PI, 2.15 * Math.PI, 32);
    // X-Ray Tube Assembly at left arm
    g.roundRect(0.04, 0.1, 0.2, 0.22, 0.03);
    g.path([[0.24, 0.14], [0.3, 0.18], [0.3, 0.24], [0.24, 0.28]]);
    g.line(0.04, 0.21, 0.24, 0.21);
    // Flat Panel Detector / Image Intensifier at right arm
    g.circle(0.82, 0.21, 0.12);
    g.circle(0.82, 0.21, 0.03);
    g.line(0.76, 0.21, 0.88, 0.21);
    g.line(0.82, 0.15, 0.82, 0.27);
    // Central imaging axis line
    g.line(0.3, 0.21, 0.7, 0.21);
    return g.entities;
  },

  pole: () => {
    const g = objectDrawing();
    g.starBase(0.5, 0.5, 0.46, 5);
    g.circle(0.5, 0.5, 0.06);
    g.circle(0.5, 0.5, 0.02);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      g.line(0.5, 0.5, 0.5 + 0.18 * Math.cos(a), 0.5 + 0.18 * Math.sin(a));
      g.circle(0.5 + 0.2 * Math.cos(a), 0.5 + 0.2 * Math.sin(a), 0.02);
    }
    return g.entities;
  },

  walker: () => {
    const g = objectDrawing();
    g.path([[0.08, 0.95], [0.08, 0.15], [0.92, 0.15], [0.92, 0.95]]);
    g.roundRect(0.04, 0.02, 0.08, 0.16, 0.02);
    g.roundRect(0.88, 0.02, 0.08, 0.16, 0.02);
    g.roundRect(0.18, 0.32, 0.64, 0.32, 0.04);
    g.rect(0.22, 0.15, 0.56, 0.16);
    for (let x = 0.28; x < 0.75; x += 0.08) g.line(x, 0.15, x, 0.31);
    g.wheels(0.08, 0.12, 0.84, 0.8);
    return g.entities;
  },

  device: o => {
    const g = objectDrawing();
    g.roundRect(0.08, 0.06, 0.84, 0.88, 0.04);
    g.rect(0.14, 0.12, 0.72, 0.48);
    g.path([[0.18, 0.26], [0.3, 0.26], [0.34, 0.2], [0.38, 0.34], [0.42, 0.26], [0.6, 0.26], [0.64, 0.2], [0.68, 0.34], [0.72, 0.26], [0.82, 0.26]]);
    for (let x = 0.2; x < 0.85; x += 0.15) g.circle(x, 0.74, 0.035);
    if (o.pump) {
      for (let x = 0.18; x < 0.85; x += 0.24) g.rect(x, 0.15, 0.16, 0.65);
    }
    return g.entities;
  }
};
