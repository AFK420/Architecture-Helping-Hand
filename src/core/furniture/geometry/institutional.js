import { objectDrawing } from './primitives.js';

export const INSTITUTIONAL_GEOMETRY = {
  easel: () => {
    const g = objectDrawing();
    g.roundRect(0, 0.05, 1, 0.1, 0.02);
    g.path([[0.15, 0], [0.5, 1], [0.85, 0]]);
    g.line(0.08, 0.65, 0.92, 0.65);
    g.roundRect(0.12, 0.2, 0.76, 0.35, 0.02);
    g.rect(0.2, 0.24, 0.6, 0.26);
    return g.entities;
  },

  locker: o => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    const bays = o.bays || 2;
    for (let i = 0; i < bays; i++) {
      const x = i / bays;
      g.roundRect(x + 0.03 / bays, 0.04, 0.94 / bays, 0.92, 0.01);
      if (o.fire || o.gear) {
        // Fire station turnout gear locker
        g.circle(x + 0.5 / bays, 0.18, 0.14 / bays);
        g.circle(x + 0.5 / bays, 0.18, 0.05 / bays);
        g.line(x + 0.08 / bays, 0.32, x + 0.92 / bays, 0.32);
        g.path([[x + 0.2 / bays, 0.52], [x + 0.5 / bays, 0.38], [x + 0.8 / bays, 0.52], [x + 0.75 / bays, 0.75], [x + 0.25 / bays, 0.75]], true);
        g.rect(x + 0.15 / bays, 0.8, 0.7 / bays, 0.14);
        g.roundRect(x + 0.2 / bays, 0.82, 0.26 / bays, 0.1, 0.02);
        g.roundRect(x + 0.54 / bays, 0.82, 0.26 / bays, 0.1, 0.02);
      } else if (o.cubby) {
        // Childcare / school cubby
        g.line(x + 0.05 / bays, 0.3, x + 0.95 / bays, 0.3);
        g.line(x + 0.05 / bays, 0.75, x + 0.95 / bays, 0.75);
        g.circle(x + 0.35 / bays, 0.42, 0.03 / bays);
        g.circle(x + 0.65 / bays, 0.42, 0.03 / bays);
      } else {
        // Commercial steel locker
        g.rect(x + 0.68 / bays, 0.44, 0.08 / bays, 0.12);
        g.rect(x + 0.35 / bays, 0.08, 0.3 / bays, 0.06);
        for (let y = 0.16; y < 0.28; y += 0.04) g.line(x + 0.15 / bays, y, x + 0.85 / bays, y);
        for (let y = 0.72; y < 0.86; y += 0.04) g.line(x + 0.15 / bays, y, x + 0.85 / bays, y);
        g.circle(x + 0.5 / bays, 0.35, 0.02 / bays);
      }
    }
    return g.entities;
  },

  hose: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    g.rect(0.08, 0.08, 0.84, 0.84);
    g.circle(0.5, 0.5, 0.38);
    g.circle(0.5, 0.5, 0.28);
    g.circle(0.5, 0.5, 0.18);
    g.circle(0.5, 0.5, 0.08);
    g.line(0.5, 0.12, 0.88, 0.5);
    g.rect(0.82, 0.44, 0.1, 0.12);
    return g.entities;
  },

  scba: () => {
    const g = objectDrawing();
    g.rect(0, 0, 1, 1);
    for (let x = 0.2; x < 0.95; x += 0.3) {
      g.roundRect(x - 0.1, 0.12, 0.2, 0.74, 0.05);
      g.circle(x, 0.18, 0.06);
      g.circle(x, 0.18, 0.02);
      g.line(x, 0.04, x, 0.12);
      g.line(x - 0.08, 0.5, x + 0.08, 0.5);
    }
    return g.entities;
  },

  screen: o => {
    const g = objectDrawing();
    const bays = o.bays || 3;
    for (let i = 0; i < bays; i++) {
      const x = i / bays;
      g.roundRect(x + 0.02 / bays, 0.04, 0.96 / bays, 0.92, 0.02);
      g.roundRect(x + 0.06 / bays, 0.08, 0.88 / bays, 0.84, 0.01);
      g.circle(x + 0.02 / bays, 0.5, 0.015);
      g.circle(x + 0.98 / bays, 0.5, 0.015);
    }
    return g.entities;
  },

  portal: o => {
    const g = objectDrawing();
    if (o.scanner) {
      g.rect(0, 0, 1, 1);
      g.roundRect(0.18, 0.08, 0.64, 0.84, 0.04);
      g.line(0.18, 0.28, 0.82, 0.28);
      g.line(0.18, 0.72, 0.72, 0.72);
      for (let y = 0.32; y < 0.7; y += 0.06) g.line(0.24, y, 0.76, y);
      g.rect(0.04, 0.2, 0.14, 0.6);
      g.rect(0.82, 0.2, 0.14, 0.6);
    } else {
      g.rect(0, 0, 0.18, 1);
      g.rect(0.82, 0, 0.18, 1);
      g.line(0.18, 0.08, 0.82, 0.08);
      g.line(0.18, 0.92, 0.82, 0.92);
      g.line(0.18, 0.5, 0.82, 0.5);
      g.circle(0.09, 0.3, 0.03);
      g.circle(0.91, 0.3, 0.03);
    }
    return g.entities;
  },

  room: o => {
    const g = objectDrawing('A-SITE');
    g.path([[0, 1], [0, 0], [1, 0], [1, 1], [0.35, 1]]);
    g.line(0, 1, 0, 0.65);
    g.arc(0, 1, 0.35, 0.35, -Math.PI / 2, 0, 16);
    if (o.cell) {
      for (let x = 0.4; x < 0.98; x += 0.08) g.line(x, 0, x, 1);
      g.rect(0.1, 0.1, 0.25, 0.6);
      g.circle(0.78, 0.85, 0.09);
    } else if (o.booth) {
      g.roundRect(0.1, 0.08, 0.8, 0.2, 0.02);
      g.roundRect(0.55, 0.38, 0.3, 0.32, 0.04);
      g.starBase(0.7, 0.54, 0.15, 5);
    } else {
      g.rect(0.06, 0.07, 0.88, 0.2);
      g.rect(0.06, 0.73, 0.88, 0.2);
    }
    return g.entities;
  },

  stairs: o => {
    const g = objectDrawing('A-SITE');
    if (o.spiral) {
      g.circle(0.5, 0.5, 0.49);
      g.circle(0.5, 0.5, 0.08);
      g.circle(0.5, 0.5, 0.04);
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        g.line(0.5 + 0.08 * Math.cos(a), 0.5 + 0.08 * Math.sin(a), 0.5 + 0.49 * Math.cos(a), 0.5 + 0.49 * Math.sin(a));
      }
      g.arc(0.5, 0.5, 0.3, 0.3, 0, 1.7 * Math.PI, 24);
      g.circle(0.8, 0.5, 0.02);
      g.path([[0.48, 0.2], [0.55, 0.18], [0.51, 0.25]]);
    } else {
      g.line(0, 0, 0, 1);
      g.line(1, 0, 1, 1);
      g.line(0.05, 0, 0.05, 1);
      g.line(0.95, 0, 0.95, 1);
      for (let y = 0.08; y < 0.95; y += 0.075) {
        g.line(0, y, 1, y);
        g.line(0, y + 0.015, 1, y + 0.015);
      }
      g.circle(0.5, 0.88, 0.025);
      g.line(0.5, 0.88, 0.5, 0.16);
      g.path([[0.44, 0.24], [0.5, 0.16], [0.56, 0.24]]);
      if (o.l) g.rect(0.5, 0.5, 0.5, 0.5);
    }
    return g.entities;
  },

  door: o => {
    const g = objectDrawing('A-DOOR');
    const bays = o.double ? 2 : 1;
    g.rect(0, 0, 0.05, 0.1);
    g.rect(0.95, 0, 0.05, 0.1);
    g.line(0.05, 0.05, 0.95, 0.05);
    if (bays === 1) {
      g.rect(0.05, 0, 0.04, 0.9);
      g.rect(0.07, 0.76, 0.04, 0.02);
      g.arc(0.05, 0, 0.9, 0.9, 0, Math.PI / 2, 24);
    } else {
      g.rect(0.05, 0, 0.04, 0.45);
      g.rect(0.91, 0, 0.04, 0.45);
      g.arc(0.05, 0, 0.45, 0.45, 0, Math.PI / 2, 16);
      g.arc(0.95, 0, 0.45, 0.45, Math.PI / 2, Math.PI, 16);
    }
    return g.entities;
  },

  sliding: o => {
    const g = objectDrawing('A-DOOR');
    g.rect(0, 0.2, 0.06, 0.6);
    g.rect(0.94, 0.2, 0.06, 0.6);
    g.line(0.06, 0.3, 0.94, 0.3);
    g.line(0.06, 0.7, 0.94, 0.7);
    const bays = o.bays || 2;
    for (let i = 0; i < bays; i++) {
      g.roundRect(i * (0.86 / bays) + 0.06, 0.32 + i * 0.12, 0.88 / bays + 0.04, 0.18, 0.015);
    }
    g.line(0.2, 0.88, 0.8, 0.88);
    g.path([[0.72, 0.82], [0.8, 0.88], [0.72, 0.94]]);
    return g.entities;
  },

  window: () => {
    const g = objectDrawing('A-DOOR');
    g.rect(0, 0.15, 1, 0.7);
    g.rect(0.06, 0.2, 0.88, 0.6);
    g.rect(0.47, 0.2, 0.06, 0.6);
    g.line(0.06, 0.45, 0.94, 0.45);
    g.line(0.06, 0.55, 0.94, 0.55);
    g.roundRect(0, 0.82, 1, 0.08, 0.02);
    return g.entities;
  },

  lab: o => {
    const g = objectDrawing();
    g.roundRect(0, 0, 1, 1, 0.02);
    if (o.hood) {
      g.line(0.08, 0.25, 0.92, 0.25);
      g.line(0.08, 0.28, 0.92, 0.28);
      for (let y = 0.4; y < 0.9; y += 0.15) g.line(0.12, y, 0.88, y);
      g.roundRect(0.35, 0.08, 0.3, 0.06, 0.02);
      g.circle(0.04, 0.4, 0.02);
      g.circle(0.96, 0.4, 0.02);
    } else {
      g.roundRect(0.14, 0.28, 0.28, 0.44, 0.04);
      g.circle(0.28, 0.55, 0.035);
      g.rect(0.26, 0.18, 0.04, 0.1);
      g.circle(0.28, 0.18, 0.02);
      g.circle(0.6, 0.22, 0.03);
      g.circle(0.8, 0.22, 0.03);
      g.line(0.5, 0.05, 0.5, 0.95);
      g.line(0.5, 0.5, 0.95, 0.5);
    }
    return g.entities;
  },

  ramp: () => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    g.line(0.06, 0, 0.06, 1);
    g.line(0.94, 0, 0.94, 1);
    for (let y = 0.15; y < 0.9; y += 0.15) g.line(0.06, y, 0.94, y);
    g.line(0.5, 0.88, 0.5, 0.12);
    g.path([[0.42, 0.22], [0.5, 0.12], [0.58, 0.22]]);
    return g.entities;
  },

  clearance: () => {
    const g = objectDrawing('A-CLEARANCE');
    g.circle(0.5, 0.5, 0.49);
    g.line(0.12, 0.5, 0.88, 0.5);
    g.path([[0.22, 0.42], [0.12, 0.5], [0.22, 0.58]]);
    g.path([[0.78, 0.42], [0.88, 0.5], [0.78, 0.58]]);
    return g.entities;
  },

  acousticPod: o => {
    const g = objectDrawing();
    if (o && (o.meeting || (o.bays && o.bays >= 4))) {
      // 4-Person Acoustic Collaborative Pod with conference table & facing banquettes
      g.roundRect(0.02, 0.02, 0.96, 0.96, 0.06);
      g.roundRect(0.06, 0.06, 0.88, 0.88, 0.04);
      // Glass front entrance wall and door
      g.line(0.06, 0.94, 0.94, 0.94);
      g.roundRect(0.35, 0.93, 0.3, 0.02, 0.005);
      g.arc(0.35, 0.94, 0.3, 0.3, -Math.PI / 2, 0, 16);
      // Central conference table
      g.roundRect(0.32, 0.18, 0.36, 0.62, 0.04);
      g.circle(0.5, 0.49, 0.04);
      g.rect(0.46, 0.47, 0.08, 0.04);
      // Left banquette sofa
      g.roundRect(0.1, 0.2, 0.18, 0.58, 0.03);
      g.roundRect(0.06, 0.16, 0.05, 0.66, 0.02);
      // Right banquette sofa
      g.roundRect(0.72, 0.2, 0.18, 0.58, 0.03);
      g.roundRect(0.89, 0.16, 0.05, 0.66, 0.02);
      // Ceiling ventilation plenum & lighting
      g.rect(0.42, 0.08, 0.16, 0.06);
      g.circle(0.5, 0.28, 0.03);
      g.circle(0.5, 0.7, 0.03);
      return g.entities;
    }
    // 1-Person Acoustic Privacy Phone Booth with sound-dampening felt, desk shelf & stool
    g.roundRect(0.04, 0.04, 0.92, 0.92, 0.08);
    g.roundRect(0.1, 0.1, 0.8, 0.8, 0.04);
    // Glass front door with handle and swing arc
    g.line(0.1, 0.9, 0.9, 0.9);
    g.roundRect(0.2, 0.88, 0.08, 0.03, 0.01);
    g.arc(0.1, 0.9, 0.6, 0.6, -Math.PI / 2, -Math.PI / 6, 16);
    // Work shelf / laptop desk
    g.roundRect(0.14, 0.14, 0.72, 0.3, 0.02);
    // Power module & USB ports
    g.rect(0.68, 0.18, 0.14, 0.06);
    g.circle(0.72, 0.21, 0.015);
    g.circle(0.78, 0.21, 0.015);
    // Ergonomic round stool
    g.circle(0.5, 0.62, 0.16);
    g.circle(0.5, 0.62, 0.06);
    // Ceiling ventilation fan grille & LED downlight
    g.circle(0.5, 0.29, 0.07);
    g.circle(0.5, 0.29, 0.02);
    return g.entities;
  },

  mobileWhiteboard: () => {
    const g = objectDrawing();
    // Rolling Mobile Magnetic Whiteboard with H-base, locking casters & marker tray
    g.rect(0.14, 0.47, 0.72, 0.06);
    // Left & right outrigger base feet
    g.roundRect(0.08, 0.2, 0.08, 0.6, 0.03);
    g.roundRect(0.84, 0.2, 0.08, 0.6, 0.03);
    // 4 locking swivel casters
    g.circle(0.12, 0.24, 0.035);
    g.circle(0.12, 0.76, 0.035);
    g.circle(0.88, 0.24, 0.035);
    g.circle(0.88, 0.76, 0.035);
    // Double-sided magnetic whiteboard panel with aluminum trim
    g.roundRect(0.04, 0.46, 0.92, 0.08, 0.01);
    g.line(0.06, 0.48, 0.94, 0.48);
    g.line(0.06, 0.52, 0.94, 0.52);
    // Marker & eraser tray along front
    g.rect(0.2, 0.54, 0.6, 0.06);
    g.rect(0.24, 0.55, 0.14, 0.03);
    g.rect(0.42, 0.55, 0.14, 0.03);
    g.roundRect(0.62, 0.55, 0.1, 0.03, 0.01);
    // Vertical frame upright stanchions
    g.rect(0.1, 0.42, 0.04, 0.16);
    g.rect(0.86, 0.42, 0.04, 0.16);
    return g.entities;
  }
};
