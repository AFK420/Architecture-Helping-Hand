import { objectDrawing } from './primitives.js';

export const RESIDENTIAL_GEOMETRY = {
  sofa: o => {
    const g = objectDrawing();
    const count = o.seats || 3;
    g.roundRect(0, 0, 1, 1, 0.04);
    g.roundRect(0.04, 0, 0.92, 0.22, 0.03);
    g.line(0.06, 0.11, 0.94, 0.11);
    g.roundRect(0, 0.08, 0.13, 0.92, 0.04);
    g.roundRect(0.87, 0.08, 0.13, 0.92, 0.04);
    for (let i = 1; i < count; i++) {
      const sx = 0.13 + 0.74 * i / count;
      g.line(sx, 0.22, sx, 0.96);
    }
    for (let i = 0; i < count; i++) {
      const x1 = 0.15 + 0.74 * i / count;
      const x2 = 0.13 + 0.74 * (i + 1) / count - 0.02;
      g.line(x1, 0.94, x2, 0.94);
    }
    g.pillow(0.14, 0.23, 0.09, 0.24);
    g.pillow(0.77, 0.23, 0.09, 0.24);
    if (o.tufted) {
      g.arc(0.065, 0.88, 0.04, 0.05, 0, 2 * Math.PI, 16);
      g.arc(0.935, 0.88, 0.04, 0.05, 0, 2 * Math.PI, 16);
      for (let i = 0; i < 8; i++) {
        const bx = 0.16 + i * 0.09;
        g.circle(bx, 0.11, 0.016);
        g.line(bx - 0.03, 0.05, bx + 0.03, 0.17);
        g.line(bx - 0.03, 0.17, bx + 0.03, 0.05);
      }
    }
    return g.entities;
  },

  sectional: o => {
    const g = objectDrawing();
    if (o.u) {
      g.path([[0, 0], [1, 0], [1, 1], [0.72, 1], [0.72, 0.38], [0.28, 0.38], [0.28, 1], [0, 1]], true);
      g.line(0.14, 0.14, 0.86, 0.14);
      g.line(0.14, 0.14, 0.14, 0.96);
      g.line(0.86, 0.14, 0.86, 0.96);
      g.line(0.14, 0.14, 0.28, 0.38);
      g.line(0.86, 0.14, 0.72, 0.38);
      for (let y = 0.58; y < 0.95; y += 0.2) {
        g.line(0, y, 0.28, y);
        g.line(0.72, y, 1, y);
      }
      g.line(0.44, 0, 0.44, 0.38);
      g.line(0.56, 0, 0.56, 0.38);
      g.pillow(0.16, 0.18, 0.1, 0.1);
      g.pillow(0.74, 0.18, 0.1, 0.1);
    } else {
      g.path([[0, 0], [1, 0], [1, 0.38], [0.38, 0.38], [0.38, 1], [0, 1]], true);
      g.line(0.14, 0.14, 0.96, 0.14);
      g.line(0.14, 0.14, 0.14, 0.96);
      g.line(0.14, 0.14, 0.38, 0.38);
      for (let x = 0.54; x < 0.95; x += 0.2) g.line(x, 0.14, x, 0.38);
      for (let y = 0.54; y < 0.95; y += 0.2) g.line(0.14, y, 0.38, y);
      g.pillow(0.16, 0.16, 0.1, 0.1);
      g.pillow(0.86, 0.16, 0.08, 0.18);
      g.pillow(0.16, 0.86, 0.18, 0.08);
    }
    return g.entities;
  },

  chair: o => {
    const g = objectDrawing();
    if (o.salon || o.barber) {
      g.rect(0, 0, 1, 1);
      g.circle(0.5, 0.5, 0.48);
      g.circle(0.5, 0.5, 0.42);
      g.circle(0.5, 0.5, 0.14);
      g.roundRect(0.45, 0.88, 0.1, 0.12, 0.02);
      g.line(0.42, 0.95, 0.58, 0.95);
      g.roundRect(0.2, 0.3, 0.6, 0.44, 0.06);
      g.roundRect(0.22, 0.1, 0.56, 0.2, 0.05);
      g.roundRect(0.34, 0.02, 0.32, 0.09, 0.03);
      g.line(0.45, 0.1, 0.45, 0.12);
      g.line(0.55, 0.1, 0.55, 0.12);
      g.roundRect(0.08, 0.32, 0.1, 0.4, 0.03);
      g.roundRect(0.82, 0.32, 0.1, 0.4, 0.03);
      g.roundRect(0.24, 0.76, 0.52, 0.18, 0.03);
      for (let y = 0.8; y < 0.92; y += 0.04) g.line(0.28, y, 0.72, y);
    } else if (o.task) {
      g.rect(0, 0, 1, 1);
      g.starBase(0.5, 0.52, 0.46, 5);
      g.roundRect(0.15, 0.26, 0.7, 0.54, 0.1);
      g.arc(0.5, 0.76, 0.32, 0.04, 0, Math.PI, 16);
      g.roundRect(0.18, 0.04, 0.64, 0.2, 0.06);
      g.rect(0.46, 0.22, 0.08, 0.06);
      if (o.arms) {
        g.roundRect(0.04, 0.32, 0.11, 0.36, 0.04);
        g.roundRect(0.85, 0.32, 0.11, 0.36, 0.04);
        g.line(0.15, 0.5, 0.08, 0.5);
        g.line(0.85, 0.5, 0.92, 0.5);
      }
    } else if (o.wings) {
      g.roundRect(0, 0, 1, 1, 0.04);
      g.path([[0.05, 0.32], [0, 0.12], [0.15, 0], [0.85, 0], [1, 0.12], [0.95, 0.32]]);
      g.arc(0.5, 0.15, 0.45, 0.12, Math.PI, 2 * Math.PI, 24);
      g.roundRect(0, 0.12, 0.15, 0.86, 0.05);
      g.roundRect(0.85, 0.12, 0.15, 0.86, 0.05);
      g.roundRect(0.18, 0.22, 0.64, 0.72, 0.06);
      g.pillow(0.32, 0.26, 0.36, 0.16);
    } else if (o.recline) {
      g.roundRect(0, 0, 1, 1, 0.04);
      g.roundRect(0.16, 0.68, 0.68, 0.3, 0.04);
      g.line(0.16, 0.82, 0.84, 0.82);
      g.roundRect(0.14, 0.26, 0.72, 0.4, 0.04);
      g.roundRect(0.18, 0.02, 0.64, 0.22, 0.06);
      g.pillow(0.25, 0.05, 0.5, 0.14);
      if (o.arms) {
        g.roundRect(0.02, 0.12, 0.12, 0.54, 0.04);
        g.roundRect(0.86, 0.12, 0.12, 0.54, 0.04);
      }
    } else {
      g.seat(0.02, 0.02, 0.96, 0.96, o.arms);
      g.line(0.18, 0.88, 0.82, 0.88);
    }
    return g.entities;
  },

  bed: o => {
    const g = objectDrawing();
    g.roundRect(0, 0, 1, 0.08, 0.01);
    g.roundRect(0.03, 0.08, 0.94, 0.92, 0.04);
    g.roundRect(0.06, 0.11, 0.88, 0.86, 0.03);
    const pCount = o.pillows || 2;
    for (let i = 0; i < pCount; i++) {
      g.pillow(0.1 + i * 0.8 / pCount, 0.13, 0.72 / pCount, 0.2);
    }
    g.line(0.06, 0.38, 0.94, 0.38);
    g.line(0.06, 0.42, 0.94, 0.42);
    g.arc(0.5, 0.4, 0.32, 0.03, 0, Math.PI, 16);
    g.line(0.25, 0.48, 0.25, 0.92);
    g.line(0.75, 0.48, 0.75, 0.92);
    if (o.bunk) {
      for (const x of [0.03, 0.93]) {
        for (const y of [0.03, 0.93]) {
          g.circle(x + 0.02, y + 0.02, 0.03);
        }
      }
      g.line(0.2, 0.72, 0.2, 0.98);
      g.line(0.8, 0.72, 0.8, 0.98);
      for (let y = 0.76; y < 0.98; y += 0.05) g.line(0.2, y, 0.8, y);
      g.line(0.08, 0.1, 0.08, 0.9);
      g.line(0.92, 0.1, 0.92, 0.9);
    }
    if (o.trundle) {
      g.roundRect(0.08, 0.54, 0.84, 0.42, 0.03);
      g.line(0.1, 0.7, 0.9, 0.7);
      g.line(0.4, 0.98, 0.6, 0.98);
      g.ellipse(0.12, 0.95, 0.02, 0.03);
      g.ellipse(0.88, 0.95, 0.02, 0.03);
    }
    if (o.crib) {
      g.rect(0, 0, 1, 0.06);
      g.rect(0, 0.94, 1, 0.06);
      for (let i = 1; i <= 14; i++) {
        const t = i / 15;
        g.line(t, 0, t, 0.06);
        g.line(t, 0.94, t, 1);
        g.line(0, t, 0.06, t);
        g.line(0.94, t, 1, t);
      }
      g.roundRect(0.08, 0.08, 0.84, 0.84, 0.03);
      g.pillow(0.3, 0.12, 0.4, 0.18);
    }
    return g.entities;
  },

  table: o => {
    const g = objectDrawing();
    if (o.round) {
      g.circle(0.5, 0.5, 0.49);
      g.circle(0.5, 0.5, 0.44);
      if (o.dining) {
        const count = o.seats || 4;
        for (let i = 0; i < count; i++) {
          const a = i * 2 * Math.PI / count;
          const cx = 0.5 + 0.42 * Math.cos(a);
          const cy = 0.5 + 0.42 * Math.sin(a);
          g.ellipse(cx, cy, 0.06, 0.06);
          g.arc(cx, cy, 0.07, 0.07, a - Math.PI * 0.6, a + Math.PI * 0.6, 12);
        }
    } else {
        g.circle(0.5, 0.5, 0.18);
        g.line(0.15, 0.5, 0.85, 0.5);
        g.line(0.5, 0.15, 0.5, 0.85);
      }
    } else if (o.nesting) {
      g.roundRect(0, 0, 0.65, 0.85, 0.06);
      g.roundRect(0.04, 0.04, 0.57, 0.77, 0.04);
      g.roundRect(0.42, 0.22, 0.56, 0.76, 0.06);
      g.roundRect(0.46, 0.26, 0.48, 0.68, 0.04);
    } else if (o.dining) {
      g.roundRect(0.08, 0.08, 0.84, 0.84, 0.03);
      g.roundRect(0.11, 0.11, 0.78, 0.78, 0.02);
      g.line(0.2, 0.5, 0.8, 0.5);
      const count = o.seats || 4;
      const half = Math.floor(count / 2);
      for (let i = 0; i < half; i++) {
        const cx = 0.15 + 0.7 * (i + 0.5) / half;
        g.roundRect(cx - 0.06, 0, 0.12, 0.07, 0.02);
        g.roundRect(cx - 0.06, 0.93, 0.12, 0.07, 0.02);
      }
    } else {
      g.roundRect(0, 0, 1, 1, 0.03);
      g.roundRect(0.06, 0.06, 0.88, 0.88, 0.02);
      for (const x of [0.03, 0.89]) {
        for (const y of [0.03, 0.89]) g.rect(x, y, 0.08, 0.08);
      }
      g.roundRect(0.18, 0.18, 0.64, 0.64, 0.02);
    }
    return g.entities;
  },

  desk: o => {
    const g = objectDrawing();
    const type = o.type || (o.console ? 'console' : 'standard');

    if (type === 'compact') {
      // 100x50 Compact study/writing desk: slim top, laptop, desk lamp, notebook, light chair
      g.roundRect(0, 0, 1, 1, 0.02);
      // Laptop
      g.roundRect(0.35, 0.18, 0.3, 0.22, 0.015);
      g.roundRect(0.38, 0.2, 0.24, 0.09, 0.01);
      g.rect(0.44, 0.33, 0.12, 0.04);
      // Desk lamp
      g.circle(0.12, 0.14, 0.04);
      g.ellipse(0.16, 0.2, 0.05, 0.035);
      g.line(0.12, 0.14, 0.16, 0.2);
      // Notebook & pen
      g.roundRect(0.74, 0.14, 0.16, 0.24, 0.01);
      g.line(0.93, 0.14, 0.93, 0.38);
      // Study chair (4-legged curved-back wooden chair, no heavy 5-star base)
      g.roundRect(0.32, 0.58, 0.36, 0.3, 0.04);
      g.arc(0.5, 0.88, 0.2, 0.06, 0, Math.PI, 16);
      for (const cx of [0.34, 0.66]) {
        for (const cy of [0.6, 0.86]) g.circle(cx, cy, 0.015);
      }
    } else if (type === 'studio') {
      // 160x80 Creative/architecture workstation: dual angled monitors, graphics tablet, desk blotter, mobile return, mesh task chair
      g.roundRect(0, 0, 1, 1, 0.02);
      // Dual monitors angled
      g.rect(0.14, 0.08, 0.34, 0.03);
      g.rect(0.52, 0.08, 0.34, 0.03);
      g.line(0.48, 0.04, 0.52, 0.04);
      g.circle(0.5, 0.04, 0.025);
      // Graphics tablet on left
      g.roundRect(0.15, 0.2, 0.22, 0.16, 0.015);
      g.line(0.35, 0.22, 0.35, 0.34);
      // Wide blotter mat with keyboard and mouse
      g.roundRect(0.4, 0.18, 0.46, 0.24, 0.02);
      g.roundRect(0.44, 0.22, 0.26, 0.1, 0.01);
      g.ellipse(0.77, 0.27, 0.025, 0.04);
      // Mobile caddy / drawer return
      g.rect(0.04, 0.45, 0.18, 0.5);
      g.line(0.04, 0.7, 0.22, 0.7);
      // Dual grommets
      g.circle(0.08, 0.08, 0.02);
      g.circle(0.92, 0.08, 0.02);
      // High-end ergonomic task chair
      g.starBase(0.5, 0.68, 0.22, 5);
      g.roundRect(0.34, 0.54, 0.32, 0.26, 0.06);
      g.roundRect(0.28, 0.58, 0.05, 0.18, 0.02);
      g.roundRect(0.67, 0.58, 0.05, 0.18, 0.02);
      g.roundRect(0.35, 0.78, 0.3, 0.08, 0.03);
    } else if (type === 'standing') {
      // 150x75 Motorized sit-stand desk: dual T-leg columns, digital keypad, cable snake, anti-fatigue mat
      g.roundRect(0, 0, 1, 1, 0.02);
      g.rect(0.14, 0.2, 0.08, 0.6);
      g.rect(0.78, 0.2, 0.08, 0.6);
      g.line(0.25, 0.04, 0.75, 0.04);
      for (let x = 0.28; x < 0.75; x += 0.06) g.line(x, 0.02, x, 0.06);
      // Digital keypad
      g.roundRect(0.82, 0.94, 0.14, 0.04, 0.01);
      g.line(0.85, 0.96, 0.87, 0.96);
      g.line(0.9, 0.96, 0.92, 0.96);
      // Widescreen monitor on clamp arm
      g.roundRect(0.28, 0.1, 0.44, 0.04, 0.01);
      g.circle(0.5, 0.05, 0.025);
      g.roundRect(0.34, 0.22, 0.32, 0.14, 0.015);
      // Anti-fatigue mat
      g.roundRect(0.26, 0.5, 0.48, 0.44, 0.06);
      g.roundRect(0.32, 0.56, 0.36, 0.32, 0.04);
    } else if (type === 'executive') {
      // 180x90 Executive Director Desk: bow-front, double pedestals, leather blotter, executive chair + 2 visitor chairs
      g.path([[0, 0.06], [0.5, 0], [1, 0.06], [1, 1], [0, 1]], true);
      // Pedestals
      g.rect(0.04, 0.15, 0.24, 0.75);
      g.rect(0.72, 0.15, 0.24, 0.75);
      g.line(0.12, 0.35, 0.2, 0.35);
      g.line(0.12, 0.65, 0.2, 0.65);
      g.line(0.8, 0.35, 0.88, 0.35);
      g.line(0.8, 0.65, 0.88, 0.65);
      g.line(0.28, 0.28, 0.72, 0.28);
      // Leather blotter pad
      g.roundRect(0.28, 0.24, 0.44, 0.3, 0.02);
      g.roundRect(0.3, 0.26, 0.4, 0.26, 0.01);
      g.circle(0.68, 0.28, 0.015);
      // Executive director armchair
      g.starBase(0.5, 0.72, 0.22, 5);
      g.roundRect(0.32, 0.56, 0.36, 0.3, 0.06);
      g.roundRect(0.32, 0.84, 0.36, 0.1, 0.04);
      g.roundRect(0.26, 0.6, 0.06, 0.24, 0.02);
      g.roundRect(0.68, 0.6, 0.06, 0.24, 0.02);
    } else if (type === 'school_single' || type === 'school_double') {
      // Student classroom desk with pencil groove and matching school chairs
      g.roundRect(0, 0, 1, 0.62, 0.03);
      if (type === 'school_double') {
        g.roundRect(0.1, 0.05, 0.35, 0.04, 0.02);
        g.roundRect(0.55, 0.05, 0.35, 0.04, 0.02);
        g.rect(0.12, 0.16, 0.32, 0.38);
        g.rect(0.56, 0.16, 0.32, 0.38);
        for (const cx of [0.28, 0.72]) {
          g.roundRect(cx - 0.16, 0.68, 0.32, 0.24, 0.03);
          g.roundRect(cx - 0.14, 0.9, 0.28, 0.07, 0.02);
        }
    } else {
        g.roundRect(0.2, 0.05, 0.6, 0.04, 0.02);
        g.rect(0.25, 0.16, 0.5, 0.38);
        g.line(0.5, 0.16, 0.5, 0.54);
        g.roundRect(0.22, 0.68, 0.56, 0.24, 0.03);
        g.roundRect(0.24, 0.9, 0.52, 0.07, 0.02);
      }
    } else if (type === 'teacher') {
      // Teacher / Lecturer desk: front modesty panel, laptop, grading paper trays, lockable drawers
      g.roundRect(0, 0, 1, 1, 0.02);
      g.line(0.04, 0.2, 0.96, 0.2);
      g.roundRect(0.15, 0.24, 0.3, 0.22, 0.015);
      g.rect(0.68, 0.24, 0.22, 0.28);
      g.line(0.68, 0.38, 0.9, 0.38);
      g.rect(0.68, 0.6, 0.26, 0.36);
      g.starBase(0.42, 0.68, 0.2, 5);
      g.roundRect(0.3, 0.56, 0.26, 0.24, 0.04);
    } else if (type === 'carrel') {
      // Library study carrel: acoustic side privacy wings, reading light, book ledge, chair
      g.rect(0, 0, 0.05, 1);
      g.rect(0.95, 0, 0.05, 1);
      g.rect(0, 0, 1, 0.05);
      g.rect(0.05, 0.05, 0.9, 0.65);
      g.line(0.25, 0.08, 0.75, 0.08);
      g.rect(0.3, 0.2, 0.4, 0.3);
      g.roundRect(0.3, 0.68, 0.4, 0.26, 0.04);
      g.roundRect(0.32, 0.92, 0.36, 0.06, 0.02);
    } else if (type === 'pod') {
      // Workstation bench pod: center acoustic screen, dual opposing workstations
      g.rect(0, 0, 1, 1);
      g.rect(0, 0.47, 1, 0.06);
      g.roundRect(0.32, 0.38, 0.36, 0.04, 0.01);
      g.roundRect(0.32, 0.58, 0.36, 0.04, 0.01);
      g.starBase(0.5, 0.22, 0.16, 5);
      g.starBase(0.5, 0.78, 0.16, 5);
    } else if (type === 'console') {
      // Multi-screen command/security console
      g.rect(0, 0, 1, 1);
      g.arc(0.5, 0.5, 0.48, 0.48, 0, Math.PI, 24);
      g.roundRect(0.12, 0.1, 0.22, 0.04, 0.01);
      g.roundRect(0.39, 0.08, 0.22, 0.04, 0.01);
      g.roundRect(0.66, 0.1, 0.22, 0.04, 0.01);
      g.starBase(0.32, 0.65, 0.18, 5);
      g.starBase(0.68, 0.65, 0.18, 5);
    } else if (type === 'esports') {
      // Pro Esports / Gaming Workstation: ultrawide curved monitor, RGB desk pad, mechanical keyboard, gaming chair
      g.roundRect(0, 0, 1, 1, 0.02);
      g.arc(0.5, -0.05, 0.42, 0.16, 0.2 * Math.PI, 0.8 * Math.PI, 20);
      g.arc(0.5, -0.03, 0.42, 0.16, 0.2 * Math.PI, 0.8 * Math.PI, 20);
      g.circle(0.5, 0.05, 0.025);
      g.roundRect(0.18, 0.16, 0.64, 0.26, 0.02);
      g.roundRect(0.24, 0.2, 0.36, 0.12, 0.01);
      g.ellipse(0.68, 0.26, 0.025, 0.04);
      g.circle(0.68, 0.18, 0.015);
      g.roundRect(0.84, 0.1, 0.12, 0.4, 0.02);
      g.circle(0.9, 0.2, 0.03);
      g.circle(0.9, 0.38, 0.03);
      g.starBase(0.5, 0.7, 0.22, 5);
      g.roundRect(0.3, 0.54, 0.4, 0.28, 0.06);
      g.roundRect(0.24, 0.56, 0.06, 0.22, 0.02);
      g.roundRect(0.7, 0.56, 0.06, 0.22, 0.02);
      g.roundRect(0.32, 0.78, 0.36, 0.1, 0.03);
      g.pillow(0.36, 0.66, 0.28, 0.08);
    } else {
      // Standard commercial office desk (140x70)
      g.roundRect(0, 0, 1, 1, 0.02);
      g.line(0.02, 0.98, 0.98, 0.98);
      g.circle(0.88, 0.12, 0.03);
      g.circle(0.88, 0.12, 0.012);
      g.roundRect(0.24, 0.08, 0.52, 0.04, 0.01);
      g.line(0.5, 0.12, 0.5, 0.16);
      g.ellipse(0.5, 0.17, 0.08, 0.03);
      g.roundRect(0.32, 0.24, 0.36, 0.12, 0.015);
      g.line(0.38, 0.33, 0.62, 0.33);
      g.roundRect(0.72, 0.24, 0.14, 0.13, 0.015);
      g.ellipse(0.79, 0.3, 0.025, 0.04);
      g.rect(0.74, 0.42, 0.24, 0.56);
      g.line(0.74, 0.68, 0.98, 0.68);
      g.line(0.82, 0.54, 0.9, 0.54);
      g.line(0.82, 0.82, 0.9, 0.82);
      g.starBase(0.46, 0.68, 0.2, 5);
      g.roundRect(0.32, 0.56, 0.28, 0.24, 0.05);
      g.roundRect(0.33, 0.77, 0.26, 0.07, 0.02);
    }
    return g.entities;
  },

  storage: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.line(0, 0.05, 1, 0.05);
    g.line(0, 0.95, 1, 0.95);
    const bays = o.bays || 2;
    for (let i = 0; i < bays; i++) {
      const x1 = i / bays, x2 = (i + 1) / bays;
      g.rect(x1, 0, 1 / bays, 1);
      g.line(x1 + 0.03, 0.5, x1 + 0.03, 0.58);
      if (o.hanging) {
        g.line(x1 + 0.05, 0.48, x2 - 0.05, 0.48);
        for (let hx = x1 + 0.08; hx < x2 - 0.04; hx += 0.07) {
          g.path([[hx - 0.025, 0.54], [hx, 0.48], [hx + 0.025, 0.54], [hx - 0.025, 0.54]]);
        }
        g.line(x1 + 0.04, 0.2, x2 - 0.04, 0.2);
      }
    }
    return g.entities;
  },

  kitchen: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.line(0, 0.05, 1, 0.05);
    g.line(0, 0.95, 1, 0.95);
    if (o.range6) {
      // 6-Burner Commercial Restaurant Cooking Range
      g.rect(0, 0, 1, 0.08);
      g.line(0, 0.88, 1, 0.88);
      for (const x of [0.2, 0.5, 0.8]) {
        for (const y of [0.28, 0.62]) {
          g.rect(x - 0.13, y - 0.14, 0.26, 0.28);
          g.circle(x, y, 0.1);
          g.circle(x, y, 0.035);
          g.line(x - 0.12, y, x + 0.12, y);
          g.line(x, y - 0.12, x, y + 0.12);
        }
      }
      for (let k = 0; k < 6; k++) g.circle(0.12 + k * 0.15, 0.94, 0.025);
    } else if (o.fryer) {
      // Commercial Double-Vat Deep Fryer with Twin Wire Baskets
      g.rect(0, 0, 1, 0.1);
      g.roundRect(0.08, 0.14, 0.38, 0.62, 0.03);
      g.roundRect(0.54, 0.14, 0.38, 0.62, 0.03);
      g.rect(0.12, 0.18, 0.3, 0.52);
      g.rect(0.58, 0.18, 0.3, 0.52);
      g.line(0.27, 0.7, 0.27, 0.9);
      g.line(0.73, 0.7, 0.73, 0.9);
      g.circle(0.27, 0.95, 0.025);
      g.circle(0.73, 0.95, 0.025);
    } else if (o.pizza) {
      // Commercial Wood-Fired / Stone Deck Pizza Oven
      g.roundRect(0.04, 0.04, 0.92, 0.92, 0.08);
      g.arc(0.5, 0.65, 0.42, 0.28, 0, Math.PI, 24);
      g.circle(0.5, 0.2, 0.12);
      g.circle(0.5, 0.2, 0.05);
      g.circle(0.5, 0.55, 0.14);
      g.line(0.5, 0.69, 0.5, 0.98);
    } else if (o.espresso) {
      // Commercial Multi-Group Espresso Machine
      g.roundRect(0.04, 0.04, 0.92, 0.92, 0.04);
      for (let x = 0.12; x <= 0.88; x += 0.08) g.line(x, 0.08, x, 0.4);
      for (const x of [0.32, 0.68]) {
        g.circle(x, 0.55, 0.07);
        g.circle(x, 0.55, 0.025);
        g.line(x, 0.62, x - 0.04, 0.88);
        g.roundRect(x - 0.06, 0.8, 0.04, 0.14, 0.015);
      }
      g.line(0.12, 0.5, 0.06, 0.74);
      g.line(0.88, 0.5, 0.94, 0.74);
      g.rect(0.1, 0.88, 0.8, 0.08);
    } else if (o.barStation) {
      // Commercial Restaurant Bar Station & Draught Tap Tower
      g.rect(0, 0, 1, 0.24);
      g.rect(0.42, 0.06, 0.16, 0.1);
      g.circle(0.46, 0.2, 0.02);
      g.circle(0.5, 0.2, 0.02);
      g.circle(0.54, 0.2, 0.02);
      g.rect(0.06, 0.28, 0.42, 0.48);
      g.line(0.06, 0.52, 0.48, 0.52);
      g.rect(0.54, 0.28, 0.4, 0.48);
      for (const bx of [0.62, 0.74, 0.86]) {
        for (const by of [0.36, 0.5, 0.64]) g.circle(bx, by, 0.04);
      }
      g.line(0, 0.76, 1, 0.76);
      for (const x of [0.2, 0.5, 0.8]) {
        g.circle(x, 0.88, 0.09);
        g.circle(x, 0.88, 0.04);
      }
    } else {
      if (o.sink) {
        g.roundRect(0.12, 0.12, 0.76, 0.76, 0.05);
        g.roundRect(0.16, 0.18, 0.68, 0.66, 0.04);
        g.circle(0.5, 0.55, 0.045);
        g.circle(0.5, 0.55, 0.015);
        g.roundRect(0.48, 0.08, 0.04, 0.12, 0.01);
        g.circle(0.5, 0.08, 0.025);
        g.line(0.42, 0.12, 0.58, 0.12);
      }
      if (o.cooktop) {
        for (const x of [0.28, 0.72]) {
          for (const y of [0.28, 0.72]) {
            g.circle(x, y, 0.12);
            g.circle(x, y, 0.05);
            g.line(x - 0.12, y, x + 0.12, y);
            g.line(x, y - 0.12, x, y + 0.12);
          }
        }
        for (let k = 0; k < 4; k++) g.circle(0.25 + k * 0.17, 0.88, 0.025);
      }
      if (o.bar) {
        g.line(0, 0.75, 1, 0.75);
        for (let x = 0.18; x < 0.95; x += 0.28) {
          g.circle(x, 0.88, 0.09);
          g.circle(x, 0.88, 0.05);
        }
      }
      if (o.bbq) {
        g.roundRect(0.08, 0.12, 0.84, 0.76, 0.04);
        for (let x = 0.14; x < 0.86; x += 0.045) g.line(x, 0.22, x, 0.76);
        g.rect(0.25, 0.14, 0.5, 0.04);
        g.circle(0.5, 0.16, 0.025);
        for (let k = 0; k < 4; k++) g.circle(0.25 + k * 0.17, 0.82, 0.025);
      }
    }
    return g.entities;
  },

  appliance: o => {
    const g = objectDrawing();
    if (o.laundry) {
      g.roundRect(0, 0, 1, 1, 0.02);
      g.arc(0.5, 0.96, 0.44, 0.035, 0, Math.PI, 16);
      g.circle(0.5, 0.52, 0.32);
      g.circle(0.5, 0.52, 0.22);
      g.circle(0.5, 0.52, 0.16);
      g.rect(0.8, 0.48, 0.04, 0.08);
      g.rect(0.18, 0.5, 0.03, 0.04);
      g.rect(0.08, 0.08, 0.28, 0.1);
      g.circle(0.5, 0.13, 0.04);
      g.circle(0.5, 0.13, 0.015);
      g.rect(0.64, 0.08, 0.26, 0.08);
    } else if (o.fridge) {
      g.rect(0, 0, 1, 1);
      g.line(0.5, 0, 0.5, 1);
      g.rect(0.46, 0.15, 0.03, 0.45);
      g.rect(0.51, 0.15, 0.03, 0.45);
      g.line(0, 0.68, 1, 0.68);
      g.rect(0.35, 0.72, 0.3, 0.035);
      g.rect(0.12, 0.22, 0.24, 0.26);
      g.ellipse(0.24, 0.38, 0.04, 0.02);
    } else {
      g.rect(0, 0, 1, 1);
      g.rect(0.15, 0.06, 0.7, 0.04);
      g.line(0, 0.16, 1, 0.16);
      for (let i = 0; i < 4; i++) g.circle(0.6 + i * 0.09, 0.11, 0.02);
      g.line(0.1, 0.35, 0.9, 0.35);
      g.line(0.1, 0.65, 0.9, 0.65);
    }
    return g.entities;
  },

  toilet: o => {
    const g = objectDrawing();
    if (o.stall || o.cubicle) {
      if (o.accessible || o.type === 'ada') {
        // ADA Accessible Commercial Toilet Stall (1550x1550mm)
        g.rect(0, 0, 0.03, 1);
        g.line(0, 0, 1, 0);
        g.rect(0.97, 0, 0.03, 1);
        g.rect(0, 0.94, 0.15, 0.06);
        g.rect(0.85, 0.94, 0.15, 0.06);
        // 900mm clear door with hinge & swing arc
        g.rect(0.15, 0.34, 0.03, 0.6);
        g.arc(0.15, 0.94, 0.6, 0.6, -Math.PI / 2, 0, 24);
        g.circle(0.18, 0.36, 0.015);
        // 42" side grab bar
        g.roundRect(0.04, 0.15, 0.04, 0.7, 0.015);
        g.circle(0.06, 0.18, 0.025);
        g.circle(0.06, 0.82, 0.025);
        // 36" rear grab bar
        g.roundRect(0.1, 0.04, 0.55, 0.04, 0.015);
        g.circle(0.13, 0.06, 0.025);
        g.circle(0.62, 0.06, 0.025);
        // ADA Commercial toilet offset 450mm from wall
        g.ellipse(0.32, 0.48, 0.16, 0.24);
        g.ellipse(0.32, 0.5, 0.12, 0.18);
        g.circle(0.32, 0.58, 0.04);
        g.line(0.32, 0.04, 0.32, 0.24);
        g.rect(0.28, 0.14, 0.08, 0.04);
        // 1500mm wheelchair turning clearance circle (dashed)
        g.circle(0.55, 0.55, 0.35, 36);
        // Accessible paper dispenser
        g.roundRect(0.04, 0.42, 0.04, 0.16, 0.01);
      } else {
        // Standard Commercial Toilet Stall (900x1500mm)
        g.rect(0, 0, 0.03, 1);
        g.line(0, 0, 1, 0);
        g.rect(0.97, 0, 0.03, 1);
        g.rect(0, 0.94, 0.18, 0.06);
        g.rect(0.82, 0.94, 0.18, 0.06);
        // Inswing 600mm door
        g.rect(0.18, 0.32, 0.03, 0.62);
        g.arc(0.18, 0.94, 0.62, 0.62, -Math.PI / 2, 0, 24);
        g.circle(0.21, 0.35, 0.015);
        // Commercial flushometer toilet
        g.ellipse(0.5, 0.42, 0.18, 0.24);
        g.ellipse(0.5, 0.44, 0.14, 0.18);
        g.circle(0.5, 0.52, 0.04);
        g.line(0.5, 0, 0.5, 0.18);
        g.line(0.42, 0.12, 0.58, 0.12);
        g.circle(0.42, 0.12, 0.015);
        g.roundRect(0.04, 0.36, 0.04, 0.16, 0.01);
      }
    } else if (o.urinal) {
      // Wall-hung commercial urinal with porcelain privacy partitions on both sides
      g.rect(0, 0, 0.04, 0.98);
      g.rect(0.96, 0, 0.04, 0.98);
      g.circle(0.02, 0.06, 0.015);
      g.circle(0.02, 0.92, 0.015);
      g.circle(0.98, 0.06, 0.015);
      g.circle(0.98, 0.92, 0.015);
      g.path([[0.2, 0], [0.15, 0.25], [0.2, 0.75], [0.5, 0.99], [0.8, 0.75], [0.85, 0.25], [0.8, 0]], true);
      g.path([[0.26, 0.08], [0.23, 0.3], [0.28, 0.7], [0.5, 0.88], [0.72, 0.7], [0.77, 0.3], [0.74, 0.08]], true);
      g.circle(0.5, 0.74, 0.04);
      g.circle(0.5, 0.74, 0.015);
      g.line(0.5, 0, 0.5, 0.12);
      g.rect(0.46, 0.02, 0.08, 0.06);
    } else if (o.custody) {
      // Stainless steel tamper-proof prison combo toilet/basin
      g.rect(0, 0, 1, 1);
      g.ellipse(0.5, 0.65, 0.24, 0.28);
      g.circle(0.5, 0.72, 0.04);
      g.roundRect(0.2, 0.04, 0.6, 0.32, 0.06);
      g.circle(0.5, 0.2, 0.03);
      g.rect(0.47, 0.06, 0.06, 0.08);
      g.circle(0.5, 0.08, 0.015);
      for (const x of [0.15, 0.85]) {
        for (const y of [0.08, 0.92]) g.circle(x, y, 0.02);
      }
    } else if (o.type === 'bidet' || o.bidet) {
      // Sanitary bidet
      g.path([[0.24, 0.02], [0.18, 0.35], [0.22, 0.75], [0.5, 0.98], [0.78, 0.75], [0.82, 0.35], [0.76, 0.02]], true);
      g.ellipse(0.5, 0.54, 0.22, 0.3);
      g.rect(0.47, 0.06, 0.06, 0.12);
      g.circle(0.5, 0.1, 0.025);
      g.line(0.4, 0.12, 0.6, 0.12);
      g.circle(0.5, 0.68, 0.035);
      g.circle(0.5, 0.52, 0.02);
      g.line(0, 0.1, 0.1, 0.1);
      g.line(0.9, 0.1, 1, 0.1);
    } else if (o.type === 'wall_hung' || o.wall_hung) {
      // Wall-hung concealed cistern toilet
      g.rect(0.08, 0, 0.84, 0.14);
      g.rect(0.38, 0.02, 0.24, 0.06);
      g.line(0, 0.14, 1, 0.14);
      g.path([[0.24, 0.14], [0.2, 0.42], [0.26, 0.78], [0.5, 0.99], [0.74, 0.78], [0.8, 0.42], [0.76, 0.14]], true);
      g.ellipse(0.5, 0.58, 0.24, 0.3);
      g.circle(0.5, 0.72, 0.04);
      g.circle(0.38, 0.24, 0.015);
      g.circle(0.62, 0.24, 0.015);
    } else {
      // Standard close-coupled WC
      g.roundRect(0.1, 0, 0.8, 0.24, 0.03);
      g.circle(0.46, 0.12, 0.03);
      g.circle(0.54, 0.12, 0.02);
      g.circle(0.5, 0.12, 0.055);
      g.path([[0.22, 0.24], [0.15, 0.45], [0.2, 0.8], [0.5, 0.99], [0.8, 0.8], [0.85, 0.45], [0.78, 0.24]], true);
      g.ellipse(0.5, 0.62, 0.28, 0.32);
      g.ellipse(0.5, 0.66, 0.18, 0.22);
      g.circle(0.5, 0.76, 0.045);
      g.circle(0.36, 0.28, 0.018);
      g.circle(0.64, 0.28, 0.018);
      g.line(0, 0.12, 0.1, 0.12);
      g.line(0.9, 0.12, 1, 0.12);
      if (o.accessible) {
        g.rect(0, 0.1, 0.04, 0.8);
        g.circle(0.02, 0.12, 0.025);
        g.circle(0.02, 0.88, 0.025);
        g.rect(0.96, 0.1, 0.04, 0.8);
        g.circle(0.98, 0.12, 0.025);
        g.circle(0.98, 0.88, 0.025);
      }
    }
    return g.entities;
  },

  basin: o => {
    const g = objectDrawing();
    if (o.shampoo) {
      // Hair salon backwash shampoo unit: ceramic tilting basin with neck curve + attached shampoo recliner
      g.roundRect(0, 0, 1, 1, 0.04);
      // Tilting ceramic basin
      g.roundRect(0.14, 0.02, 0.72, 0.38, 0.08);
      g.arc(0.5, 0.38, 0.16, 0.06, Math.PI, 2 * Math.PI, 20);
      g.circle(0.5, 0.18, 0.045);
      g.circle(0.5, 0.18, 0.015);
      g.circle(0.74, 0.12, 0.03);
      g.line(0.74, 0.12, 0.64, 0.22);
      g.rect(0.2, 0.04, 0.6, 0.05);
      // Client reclined chair
      g.roundRect(0.2, 0.42, 0.6, 0.56, 0.06);
      g.roundRect(0.24, 0.44, 0.52, 0.18, 0.04);
      g.roundRect(0.08, 0.46, 0.1, 0.48, 0.03);
      g.roundRect(0.82, 0.46, 0.1, 0.48, 0.03);
      g.roundRect(0.26, 0.88, 0.48, 0.09, 0.02);
    } else {
      g.rect(0, 0, 1, 1);
      g.line(0, 0.04, 1, 0.04);
      const count = o.double ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const cx = (i + 0.5) / count;
        const bw = 0.78 / count, bh = 0.7;
        g.roundRect(cx - bw / 2, 0.18, bw, bh, 0.08);
        g.roundRect(cx - bw / 2 + 0.03, 0.21, bw - 0.06, bh - 0.06, 0.06);
        g.circle(cx, 0.58, 0.035);
        g.circle(cx, 0.58, 0.015);
        g.roundRect(cx - 0.02, 0.06, 0.04, 0.16, 0.01);
        g.line(cx - 0.08, 0.12, cx + 0.08, 0.12);
        g.circle(cx - 0.08, 0.12, 0.015);
        g.circle(cx + 0.08, 0.12, 0.015);
      }
    }
    return g.entities;
  },

  bath: o => {
    const g = objectDrawing();
    if (o.corner) {
      g.path([[0, 0], [1, 0], ...Array.from({ length: 33 }, (_, i) => {
        const a = i * Math.PI / 64;
        return [Math.cos(a), Math.sin(a)];
      }), [0, 1]], true);
      g.arc(0.12, 0.12, 0.76, 0.76, 0, Math.PI / 2, 24);
      g.ellipse(0.5, 0.5, 0.42, 0.42);
      g.ellipse(0.5, 0.5, 0.35, 0.35);
      g.circle(0.5, 0.5, 0.03);
      if (o.jets) {
        for (let n = 0; n < 8; n++) {
          const t = n * Math.PI / 4;
          g.circle(0.5 + 0.32 * Math.cos(t), 0.5 + 0.32 * Math.sin(t), 0.02);
        }
      }
      g.circle(0.14, 0.14, 0.035);
      g.circle(0.2, 0.14, 0.02);
    } else {
      g.roundRect(0, 0, 1, 1, 0.02);
      g.roundRect(0.06, 0.06, 0.88, 0.88, 0.14);
      g.arc(0.5, 0.24, 0.34, 0.14, 0, Math.PI, 20);
      g.rect(0.47, 0.88, 0.06, 0.08);
      g.circle(0.42, 0.92, 0.02);
      g.circle(0.58, 0.92, 0.02);
      g.circle(0.5, 0.8, 0.035);
    }
    return g.entities;
  },

  shower: o => {
    const g = objectDrawing();
    if (o.corner) {
      g.path([[0, 0], [1, 0], [1, 0.55], [0.55, 1], [0, 1]], true);
      g.circle(0.48, 0.48, 0.045);
      g.circle(0.48, 0.48, 0.02);
      for (const [x, y] of [[0, 0], [1, 0], [1, 0.55], [0.55, 1], [0, 1]]) g.line(x, y, 0.48, 0.48);
      g.line(0.08, 0.25, 0.08, 0.35);
    } else {
      g.rect(0, 0, 1, 1);
      g.circle(0.5, 0.5, 0.045);
      g.circle(0.5, 0.5, 0.02);
      for (const [x, y] of [[0, 0], [1, 0], [1, 1], [0, 1]]) g.line(x, y, 0.5, 0.5);
      g.roundRect(0.42, 0.02, 0.16, 0.04, 0.01);
      g.circle(0.5, 0.22, 0.08);
      g.circle(0.5, 0.22, 0.02);
      if (o.accessible) {
        g.rect(0.04, 0.05, 0.3, 0.28);
        for (let y = 0.1; y < 0.32; y += 0.06) g.line(0.04, y, 0.34, y);
        g.line(0.05, 0.38, 0.05, 0.9);
      }
    }
    return g.entities;
  }
};
