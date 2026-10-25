import { objectDrawing } from './primitives.js';

export const STREETS_GEOMETRY = {
  vehicle: o => {
    const g = objectDrawing('A-VEHICLE');
    if (o.caravan) {
      // Travel Trailer / Caravan with A-frame hitch, pop-top vents & panoramic window
      g.rect(0, 0, 1, 1);
      // A-frame towing hitch at front
      g.path([[0.34, 0.16], [0.5, 0.01], [0.66, 0.16]]);
      g.circle(0.5, 0.02, 0.03);
      g.circle(0.44, 0.09, 0.02);
      // Caravan insulated body shell
      g.roundRect(0.04, 0.16, 0.92, 0.82, 0.08);
      // Front panoramic window
      g.roundRect(0.12, 0.18, 0.76, 0.08, 0.03);
      // Side door and step on right
      g.rect(0.92, 0.48, 0.06, 0.26);
      g.line(0.92, 0.61, 0.98, 0.61);
      // Double-glazed side windows
      g.roundRect(0.04, 0.32, 0.04, 0.22, 0.01);
      g.roundRect(0.04, 0.64, 0.04, 0.22, 0.01);
      g.roundRect(0.92, 0.24, 0.04, 0.18, 0.01);
      // Pop-top roof hatches / vent grilles
      g.roundRect(0.34, 0.35, 0.32, 0.16, 0.02);
      g.line(0.34, 0.43, 0.66, 0.43);
      g.roundRect(0.34, 0.62, 0.32, 0.16, 0.02);
      g.line(0.34, 0.7, 0.66, 0.7);
      // Rear window & taillight bumper bar
      g.roundRect(0.12, 0.92, 0.76, 0.04, 0.01);
      g.roundRect(0.06, 0.96, 0.14, 0.02, 0.005);
      g.roundRect(0.8, 0.96, 0.14, 0.02, 0.005);
    } else if (o.camper) {
      // Camper Van Conversion with pop-top roof tent & side awning
      g.roundRect(0, 0, 1, 1, 0.1);
      g.path([[0.14, 0.2], [0.86, 0.2], [0.8, 0.32], [0.2, 0.32]], true);
      g.roundRect(0.18, 0.36, 0.26, 0.2, 0.04);
      g.roundRect(0.56, 0.36, 0.26, 0.2, 0.04);
      g.rect(0.94, 0.35, 0.06, 0.42);
      g.roundRect(0.18, 0.4, 0.64, 0.46, 0.04);
      g.line(0.5, 0.88, 0.5, 1);
      g.line(0.16, 0.9, 0.84, 0.9);
    } else if (o.suv) {
      // SUV: Bold stance, flared wheel arches, roof rack rails, rear spoiler
      g.roundRect(0, 0, 1, 1, 0.12);
      g.roundRect(0.02, 0.12, 0.06, 0.22, 0.02);
      g.roundRect(0.92, 0.12, 0.06, 0.22, 0.02);
      g.roundRect(0.02, 0.66, 0.06, 0.22, 0.02);
      g.roundRect(0.92, 0.66, 0.06, 0.22, 0.02);
      g.line(0.24, 0.02, 0.24, 0.2);
      g.line(0.76, 0.02, 0.76, 0.2);
      g.path([[0.16, 0.22], [0.84, 0.22], [0.78, 0.36], [0.22, 0.36]], true);
      g.roundRect(0.18, 0.38, 0.06, 0.46, 0.02);
      g.roundRect(0.76, 0.38, 0.06, 0.46, 0.02);
      g.roundRect(0.3, 0.4, 0.4, 0.22, 0.02);
      g.path([[0.2, 0.84], [0.8, 0.84], [0.84, 0.94], [0.16, 0.94]], true);
      g.line(0.15, 0.96, 0.85, 0.96);
    } else if (o.van) {
      // Delivery / Cargo Van with bulkhead and sliding door
      g.roundRect(0, 0, 1, 1, 0.08);
      g.path([[0.16, 0.18], [0.84, 0.18], [0.78, 0.3], [0.22, 0.3]], true);
      g.rect(0.04, 0.42, 0.92, 0.03);
      g.rect(0.92, 0.46, 0.08, 0.36);
      g.line(0.5, 0.86, 0.5, 1);
      g.line(0.24, 0.5, 0.24, 0.92);
      g.line(0.76, 0.5, 0.76, 0.92);
    } else if (o.train) {
      // Passenger Train Rail Carriage with couplers, bogies & gangway vestibules
      g.roundRect(0, 0, 1, 1, 0.04);
      g.rect(0.25, 0, 0.5, 0.04);
      g.rect(0.25, 0.96, 0.5, 0.04);
      g.rect(0.44, 0, 0.12, 0.02);
      g.rect(0.44, 0.98, 0.12, 0.02);
      g.rect(0.06, 0.08, 0.88, 0.14);
      g.rect(0.06, 0.78, 0.88, 0.14);
      g.rect(0, 0.28, 0.04, 0.16);
      g.rect(0.96, 0.28, 0.04, 0.16);
      g.rect(0, 0.56, 0.04, 0.16);
      g.rect(0.96, 0.56, 0.04, 0.16);
      g.line(0.5, 0.22, 0.5, 0.78);
    } else if (o.tram) {
      // Light Rail Transit / Tram Module with Roof Pantograph Assembly
      g.roundRect(0, 0, 1, 1, 0.05);
      g.rect(0, 0.25, 0.04, 0.2);
      g.rect(0.96, 0.25, 0.04, 0.2);
      g.rect(0, 0.6, 0.04, 0.2);
      g.rect(0.96, 0.6, 0.04, 0.2);
      g.path([[0.15, 0.04], [0.85, 0.04], [0.8, 0.12], [0.2, 0.12]], true);
      g.path([[0.15, 0.96], [0.85, 0.96], [0.8, 0.88], [0.2, 0.88]], true);
      g.rect(0.35, 0.42, 0.3, 0.16);
      g.line(0.35, 0.42, 0.65, 0.58);
      g.line(0.35, 0.58, 0.65, 0.42);
      g.line(0.25, 0.5, 0.75, 0.5);
    } else if (o.bus) {
      if (o.articulated) {
        // 18m Articulated City Bus with Accordion Turntable Bellows Joint
        g.roundRect(0, 0, 1, 0.52, 0.06);
        g.circle(0.26, 0.12, 0.045);
        g.line(0.26, 0.12, 0.26, 0.16);
        g.rect(0.88, 0.06, 0.12, 0.12);
        g.rect(0.88, 0.36, 0.12, 0.12);
        // Articulation pleated bellow joint
        g.rect(0.04, 0.52, 0.92, 0.08);
        for (let y = 0.52; y <= 0.6; y += 0.016) g.line(0.04, y, 0.96, y);
        g.circle(0.5, 0.56, 0.18);
        // Rear trailer car
        g.roundRect(0, 0.6, 1, 0.4, 0.06);
        g.rect(0.88, 0.72, 0.12, 0.12);
        g.roundRect(0.25, 0.7, 0.5, 0.2, 0.02);
      } else {
        // Standard Transit Bus (12m)
        g.roundRect(0, 0, 1, 1, 0.08);
        g.arc(0.5, 0.06, 0.42, 0.06, 0, Math.PI, 16);
        g.circle(0.26, 0.14, 0.045);
        g.line(0.26, 0.14, 0.26, 0.18);
        g.rect(0.85, 0.08, 0.15, 0.12);
        g.line(0.85, 0.14, 1, 0.14);
        g.rect(0.85, 0.52, 0.15, 0.12);
        g.line(0.85, 0.58, 1, 0.58);
        for (let y = 0.22; y < 0.88; y += 0.08) {
          g.roundRect(0.08, y, 0.32, 0.06, 0.015);
          g.roundRect(0.6, y, 0.32, 0.06, 0.015);
        }
        g.rect(0.15, 0.92, 0.7, 0.05);
        for (let x = 0.2; x < 0.8; x += 0.06) g.line(x, 0.92, x, 0.97);
      }
    } else if (o.truck) {
      g.rect(0, 0, 1, 1);
      g.roundRect(0.06, 0.02, 0.88, 0.44, 0.08);
      g.path([[0.16, 0.14], [0.84, 0.14], [0.8, 0.26], [0.2, 0.26]], true);
      g.rect(0, 0.2, 0.06, 0.05);
      g.rect(0.94, 0.2, 0.06, 0.05);
      g.circle(0.32, 0.2, 0.04);
      g.rect(0.06, 0.48, 0.88, 0.5);
      g.rect(0.06, 0.95, 0.88, 0.03);
      for (let x = 0.16; x < 0.85; x += 0.08) g.line(x, 0.5, x, 0.94);
      if (o.emergency) {
        g.roundRect(0.25, 0.06, 0.5, 0.06, 0.02);
        g.circle(0.32, 0.09, 0.02);
        g.circle(0.68, 0.09, 0.02);
      }
    } else if (o.emergency) {
      g.roundRect(0, 0, 1, 1, 0.1);
      g.path([[0.18, 0.22], [0.82, 0.22], [0.76, 0.34], [0.24, 0.34]], true);
      g.rect(0, 0.25, 0.06, 0.05);
      g.rect(0.94, 0.25, 0.06, 0.05);
      g.roundRect(0.24, 0.28, 0.52, 0.08, 0.03);
      g.circle(0.32, 0.32, 0.025);
      g.circle(0.68, 0.32, 0.025);
      g.path([[0.45, 0.55], [0.55, 0.55], [0.55, 0.62], [0.62, 0.62], [0.62, 0.72], [0.55, 0.72], [0.55, 0.79], [0.45, 0.79], [0.45, 0.72], [0.38, 0.72], [0.38, 0.62], [0.45, 0.62]], true);
      g.line(0.18, 0.84, 0.82, 0.84);
      g.line(0.5, 0.44, 0.5, 0.92);
    } else {
      // Passenger Sedan Car
      g.roundRect(0, 0, 1, 1, 0.12);
      g.arc(0.5, 0.04, 0.38, 0.04, 0, Math.PI, 16);
      g.roundRect(0.12, 0.04, 0.14, 0.04, 0.02);
      g.roundRect(0.74, 0.04, 0.14, 0.04, 0.02);
      g.line(0.24, 0.06, 0.22, 0.22);
      g.line(0.76, 0.06, 0.78, 0.22);
      g.path([[0.18, 0.24], [0.82, 0.24], [0.76, 0.36], [0.24, 0.36]], true);
      g.line(0.32, 0.33, 0.44, 0.26);
      g.line(0.58, 0.33, 0.7, 0.26);
      g.roundRect(0, 0.26, 0.06, 0.05, 0.02);
      g.roundRect(0.94, 0.26, 0.06, 0.05, 0.02);
      g.roundRect(0.22, 0.36, 0.56, 0.34, 0.04);
      g.roundRect(0.32, 0.4, 0.36, 0.18, 0.02);
      g.circle(0.34, 0.32, 0.045);
      g.line(0.34, 0.32, 0.34, 0.36);
      g.path([[0.24, 0.7], [0.76, 0.7], [0.82, 0.8], [0.18, 0.8]], true);
      g.line(0.2, 0.86, 0.8, 0.86);
      g.roundRect(0.12, 0.92, 0.14, 0.04, 0.02);
      g.roundRect(0.74, 0.92, 0.14, 0.04, 0.02);
    }
    return g.entities;
  },

  bicycle: o => {
    const g = objectDrawing('A-VEHICLE');
    if (o.motorcycle) {
      // Motorcycle / Police Motorcycle
      g.rect(0, 0, 1, 1);
      g.roundRect(0.44, 0, 0.12, 0.24, 0.05);
      g.line(0.42, 0.1, 0.42, 0.3);
      g.line(0.58, 0.1, 0.58, 0.3);
      g.roundRect(0, 0.24, 1, 0.05, 0.02);
      g.circle(0.04, 0.22, 0.03);
      g.circle(0.96, 0.22, 0.03);
      g.roundRect(0.32, 0.3, 0.36, 0.22, 0.08);
      g.roundRect(0.34, 0.52, 0.32, 0.24, 0.06);
      g.line(0.34, 0.64, 0.66, 0.64);
      for (let y = 0.38; y < 0.52; y += 0.04) g.line(0.34, y, 0.66, y);
      g.line(0.66, 0.52, 0.76, 0.88);
      g.roundRect(0.72, 0.82, 0.08, 0.16, 0.02);
      g.roundRect(0.42, 0.72, 0.16, 0.28, 0.06);
      if (o.police) {
        g.circle(0.5, 0.94, 0.04);
        g.roundRect(0.18, 0.68, 0.14, 0.24, 0.02);
        g.roundRect(0.68, 0.68, 0.14, 0.24, 0.02);
      }
    } else if (o.cargo) {
      // Delivery Cargo Bike
      g.rect(0, 0, 1, 1);
      g.roundRect(0.16, 0, 0.68, 0.36, 0.04);
      g.roundRect(0.08, 0.04, 0.07, 0.24, 0.02);
      g.roundRect(0.85, 0.04, 0.07, 0.24, 0.02);
      g.roundRect(0.18, 0.38, 0.64, 0.04, 0.02);
      g.line(0.5, 0.4, 0.5, 0.7);
      g.circle(0.5, 0.64, 0.04);
      g.rect(0.34, 0.62, 0.05, 0.04);
      g.rect(0.61, 0.62, 0.05, 0.04);
      g.roundRect(0.38, 0.68, 0.24, 0.12, 0.04);
      g.roundRect(0.45, 0.76, 0.1, 0.24, 0.04);
    } else {
      // Standard Bicycle
      g.rect(0, 0, 1, 1);
      g.roundRect(0.45, 0, 0.1, 0.28, 0.04);
      g.line(0.5, 0, 0.5, 0.3);
      g.roundRect(0, 0.24, 1, 0.04, 0.02);
      g.roundRect(0.04, 0.22, 0.04, 0.08, 0.015);
      g.roundRect(0.92, 0.22, 0.04, 0.08, 0.015);
      g.line(0.5, 0.26, 0.5, 0.6);
      g.line(0.36, 0.6, 0.64, 0.6);
      g.rect(0.34, 0.58, 0.04, 0.04);
      g.rect(0.62, 0.58, 0.04, 0.04);
      g.circle(0.5, 0.6, 0.035);
      g.path([[0.5, 0.48], [0.42, 0.62], [0.58, 0.62]], true);
      g.roundRect(0.45, 0.7, 0.1, 0.3, 0.04);
      g.line(0.5, 0.7, 0.5, 1);
    }
    return g.entities;
  },

  parking: o => {
    const g = objectDrawing('A-SITE');
    g.path([[0, 0], [0, 1], [1, 1], [1, 0]]);
    g.roundRect(0.15, 0.88, 0.7, 0.05, 0.015);
    if (o.accessible) {
      g.line(0.75, 0, 0.75, 1);
      for (let y = 0.08; y < 0.95; y += 0.1) g.line(0.75, y, 1, y + 0.1);
      g.circle(0.38, 0.5, 0.12);
      g.circle(0.44, 0.3, 0.04);
      g.line(0.38, 0.5, 0.44, 0.38);
      g.line(0.44, 0.38, 0.32, 0.38);
      g.line(0.38, 0.5, 0.52, 0.5);
      g.line(0.52, 0.5, 0.52, 0.58);
    } else if (o.ev) {
      g.path([[0.52, 0.2], [0.44, 0.38], [0.52, 0.38], [0.46, 0.58]]);
      g.roundRect(0.38, 0.62, 0.24, 0.22, 0.03);
      g.circle(0.5, 0.73, 0.03);
    } else {
      g.line(0.4, 0.65, 0.4, 0.35);
      g.path([[0.4, 0.35], [0.64, 0.35], [0.64, 0.5], [0.4, 0.5]]);
    }
    return g.entities;
  },

  crossing: () => {
    const g = objectDrawing('A-SITE');
    g.line(0, 0, 1, 0);
    g.line(0, 1, 1, 1);
    for (let y = 0.04; y < 0.95; y += 0.16) g.rect(0, y, 1, 0.08);
    return g.entities;
  },

  shelter: () => {
    const g = objectDrawing('A-SITE');
    g.rect(0, 0, 1, 1);
    g.roundRect(0.08, 0.62, 0.84, 0.22, 0.02);
    g.line(0.08, 0.08, 0.92, 0.08);
    for (const x of [0.06, 0.94]) g.rect(x - 0.03, 0.08, 0.06, 0.82);
    g.line(0.1, 0.9, 0.9, 0.9);
    return g.entities;
  },

  bikeRack: o => {
    const g = objectDrawing('A-SITE');
    const bays = o.bays || 4;
    for (let i = 0; i < bays; i++) {
      const x = (i + 0.5) / bays;
      g.path([[x - 0.25 / bays, 0.98], [x - 0.25 / bays, 0.2], [x, 0.04], [x + 0.25 / bays, 0.2], [x + 0.25 / bays, 0.98]]);
      g.line(x - 0.25 / bays, 0.5, x + 0.25 / bays, 0.5);
    }
    return g.entities;
  },

  light: o => {
    const g = objectDrawing('A-SITE');
    if (o.signal) {
      // Traffic Signal Post with Cantilever Mast Arm & 3-aspect Signal Head
      g.rect(0, 0, 1, 1);
      g.circle(0.5, 0.78, 0.2);
      g.circle(0.5, 0.78, 0.08);
      for (const [x, y] of [[0.36, 0.64], [0.64, 0.64], [0.36, 0.92], [0.64, 0.92]]) g.circle(x, y, 0.025);
      g.roundRect(0.44, 0, 0.12, 0.78, 0.02);
      g.rect(0.32, 0, 0.36, 0.52);
      g.circle(0.5, 0.1, 0.065);
      g.circle(0.5, 0.26, 0.065);
      g.circle(0.5, 0.42, 0.065);
      g.rect(0.22, 0.7, 0.14, 0.16);
      g.circle(0.29, 0.78, 0.025);
    } else {
      // Complete Street Light Luminaire with Foundation Base Plate & Anchor Bolts
      g.rect(0, 0, 1, 1);
      g.circle(0.5, 0.5, 0.38);
      g.circle(0.5, 0.5, 0.18);
      g.circle(0.5, 0.5, 0.06);
      for (const [x, y] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) g.circle(x, y, 0.035);
      g.roundRect(0.44, 0, 0.12, 0.5, 0.02);
      g.roundRect(0.34, 0, 0.32, 0.24, 0.06);
      g.roundRect(0.38, 0.03, 0.24, 0.14, 0.02);
      for (let ly = 0.05; ly <= 0.15; ly += 0.04) g.line(0.38, ly, 0.62, ly);
    }
    return g.entities;
  },

  gate: () => {
    const g = objectDrawing('A-SITE');
    g.roundRect(0, 0.25, 0.12, 0.5, 0.02);
    g.circle(0.06, 0.5, 0.03);
    g.rect(0.12, 0.44, 0.88, 0.12);
    for (let x = 0.2; x < 1; x += 0.12) g.line(x, 0.44, x + 0.08, 0.56);
    g.arc(0.12, 0.5, 0.88, 0.5, -Math.PI / 2, 0, 24);
    return g.entities;
  },

  charger: o => {
    const g = objectDrawing('A-SITE');
    if (o && o.fast) {
      // Level 3 DC Fast Charger / Supercharger (Dual CCS2 / NACS holstered cables & touch kiosk)
      g.rect(0.02, 0.02, 0.96, 0.96);
      g.roundRect(0.1, 0.08, 0.8, 0.84, 0.05);
      // Status light halo top
      g.roundRect(0.2, 0.1, 0.6, 0.05, 0.01);
      // Dual side cable holsters & retractor housings
      g.roundRect(0.03, 0.28, 0.08, 0.36, 0.02);
      g.roundRect(0.89, 0.28, 0.08, 0.36, 0.02);
      // Heavy liquid-cooled cables
      g.path([[0.1, 0.32], [0.04, 0.48], [0.04, 0.74], [0.1, 0.82]]);
      g.path([[0.9, 0.32], [0.96, 0.48], [0.96, 0.74], [0.9, 0.82]]);
      // Plug handles parked in ports
      g.rect(0.04, 0.38, 0.06, 0.16);
      g.rect(0.9, 0.38, 0.06, 0.16);
      // Central high-brightness touch display
      g.roundRect(0.24, 0.2, 0.52, 0.26, 0.02);
      g.circle(0.5, 0.33, 0.05);
      g.circle(0.5, 0.33, 0.02);
      // Electric lightning bolt insignia
      g.path([[0.52, 0.5], [0.44, 0.64], [0.52, 0.64], [0.46, 0.76]]);
      // Louvered cooling vent slats at bottom
      for (let y = 0.8; y <= 0.88; y += 0.04) g.line(0.24, y, 0.76, y);
      return g.entities;
    }
    g.roundRect(0, 0, 1, 1, 0.05);
    g.rect(0.15, 0.12, 0.7, 0.24);
    g.circle(0.5, 0.24, 0.04);
    g.path([[0.5, 0.42], [0.36, 0.62], [0.52, 0.62], [0.42, 0.86]]);
    g.path([[0.9, 0.22], [0.98, 0.3], [0.98, 0.85], [0.8, 0.85]]);
    g.roundRect(0.76, 0.82, 0.12, 0.08, 0.02);
    return g.entities;
  }
};
