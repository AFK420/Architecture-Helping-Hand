/**
 * Architecture Helping Hand - Architectural Zoning & Area Schedule Matrix
 * Provides room scheduling, IBC / NFPA occupant load analysis, department zoning,
 * and circulation ratio calculations for architectural floor plans.
 */

import { roomArea, roomPerimeter } from './entities.js';

export const ZONING_CATEGORIES = Object.freeze({
  living: { id: 'living', name: 'Living & Social', color: '#3b82f6', tag: 'LIV' },
  sleeping: { id: 'sleeping', name: 'Sleeping & Private', color: '#8b5cf6', tag: 'SLP' },
  service: { id: 'service', name: 'Kitchen & Utility', color: '#f59e0b', tag: 'SRV' },
  sanitary: { id: 'sanitary', name: 'Sanitary & Wet', color: '#06b6d4', tag: 'SAN' },
  circulation: { id: 'circulation', name: 'Circulation & Stairs', color: '#64748b', tag: 'CIR' },
  commercial: { id: 'commercial', name: 'Office & Work', color: '#10b981', tag: 'OFF' },
  outdoor: { id: 'outdoor', name: 'Balcony & Terrace', color: '#84cc16', tag: 'OUT' }
});

/**
 * Standard IBC Chapter 10 / NFPA 101 occupant load factors in square meters per person.
 */
export const OCCUPANCY_FACTORS = Object.freeze({
  residential: { factorM2: 18.6, label: 'Residential (18.6 m²/person)' },
  assembly_unconcentrated: { factorM2: 1.4, label: 'Assembly Tables/Chairs (1.4 m²/person)' },
  // IBC 1004.5 standing space: 5 net ft²/person ≈ 0.46 m²/person
  assembly_concentrated: { factorM2: 0.46, label: 'Assembly Standing (0.46 m²/person)' },
  business: { factorM2: 9.3, label: 'Business / Office (9.3 m²/person)' },
  educational: { factorM2: 1.9, label: 'Classrooms (1.9 m²/person)' },
  kitchen_commercial: { factorM2: 18.6, label: 'Kitchen / Service (18.6 m²/person)' },
  storage: { factorM2: 27.9, label: 'Storage / Mech (27.9 m²/person)' },
  circulation: { factorM2: 9.3, label: 'Circulation (9.3 m²/person)' }
});

/**
 * Infers an architectural department zoning category from a room's name.
 *
 * @param {string} roomName
 * @returns {string} Zoning category id
 */
export function guessZoningFromRoomName(roomName = '') {
  const name = String(roomName || '').toLowerCase().trim();

  if (/bath|powder|toilet|wc|shower|restroom|en-suite|ensuite|lavatory|washroom/i.test(name)) {
    return 'sanitary';
  }
  if (/bed|master|guest|nursery|dorm|sleeping|\bsuite\b/i.test(name)) {
    return 'sleeping';
  }
  if (/kitchen|pantry|laundry|utility|storage|store|scullery|mech|boiler|hvac|garage/i.test(name)) {
    return 'service';
  }
  if (/hall|corridor|passage|foyer|entry|vestibule|stair|stairway|landing|lobby|circulation/i.test(name)) {
    return 'circulation';
  }
  if (/office|study|work|desk|studio|meeting|conference|library|boardroom/i.test(name)) {
    return 'commercial';
  }
  if (/balcony|terrace|porch|deck|veranda|patio|courtyard|roof/i.test(name)) {
    return 'outdoor';
  }

  return 'living';
}

/**
 * Infers IBC occupant load classification based on room name and zoning.
 *
 * @param {string} roomName
 * @param {string} zoning
 * @returns {string} Occupancy factor key in OCCUPANCY_FACTORS
 */
export function guessOccupancyCategory(roomName = '', zoning = null) {
  const name = String(roomName || '').toLowerCase();
  const zone = zoning || guessZoningFromRoomName(roomName);

  if (name.includes('conference') || name.includes('auditorium') || name.includes('lounge') || name.includes('dining')) {
    return 'assembly_unconcentrated';
  }
  if (zone === 'commercial' || name.includes('office') || name.includes('work')) {
    return 'business';
  }
  if (zone === 'circulation' || /corridor|hall|passage|foyer|stair|lobby/i.test(name)) {
    return 'circulation';
  }
  if (name.includes('storage') || name.includes('mech') || name.includes('garage')) {
    return 'storage';
  }
  if (zone === 'service') {
    return 'kitchen_commercial';
  }

  return 'residential';
}

/**
 * Calculates a room's perimeter in meters.
 *
 * @param {Object} room
 * @returns {number}
 */
export function calculateRoomPerimeter(room) {
  if (!room) return 0;
  return roomPerimeter(room);
}

/**
 * Computes the complete room area and occupancy schedule for a floor plan.
 *
 * @param {Object|Array} docOrEntities - Document object or entities list
 * @returns {Array<Object>} List of room schedule entries
 */
export function calculateRoomSchedule(docOrEntities) {
  const entities = Array.isArray(docOrEntities)
    ? docOrEntities
    : (docOrEntities && Array.isArray(docOrEntities.entities) ? docOrEntities.entities : []);

  const rooms = entities.filter(e => e && e.kind === 'room');
  if (rooms.length === 0) return [];

  // Total floor net area for percentage calculation
  const totalNetArea = rooms.reduce((sum, r) => sum + roomArea(r), 0);

  return rooms.map((room, idx) => {
    const area = roomArea(room);
    const perimeter = calculateRoomPerimeter(room);
    const zoningKey = room.zoning || guessZoningFromRoomName(room.name);
    const zoning = ZONING_CATEGORIES[zoningKey] || ZONING_CATEGORIES.living;

    const occKey = room.occupancyCategory || guessOccupancyCategory(room.name, zoningKey);
    const occDef = OCCUPANCY_FACTORS[occKey] || OCCUPANCY_FACTORS.residential;
    const factorM2 = occDef.factorM2;

    // Occupant load: IBC rules state any fraction rounds up to next whole person, minimum 1 person
    const occupantCount = area > 0 ? Math.max(1, Math.ceil(area / factorM2)) : 0;
    const pct = totalNetArea > 0 ? (area / totalNetArea) * 100 : 0;

    return {
      id: room.id,
      number: room.number || room.roomNumber || String(101 + idx),
      name: room.name || `Room ${idx + 1}`,
      areaM2: Number(area.toFixed(2)),
      areaSqFt: Number((area * 10.7639).toFixed(1)),
      perimeterM: Number(perimeter.toFixed(2)),
      zoningKey,
      zoningName: zoning.name,
      zoningColor: zoning.color,
      zoningTag: zoning.tag,
      occupancyCategory: occKey,
      occupancyFactorM2: factorM2,
      occupantCount,
      percentOfFloor: Number(pct.toFixed(1))
    };
  });
}

/**
 * Calculates floor totals, gross internal area, circulation ratio, and total occupant load.
 *
 * @param {Object|Array} docOrEntities
 * @returns {Object} Floor summary totals
 */
export function calculateFloorTotals(docOrEntities) {
  const schedule = calculateRoomSchedule(docOrEntities);
  const entities = Array.isArray(docOrEntities)
    ? docOrEntities
    : (docOrEntities && Array.isArray(docOrEntities.entities) ? docOrEntities.entities : []);

  // Sum RAW room areas (schedule entries carry display-rounded values; summing
  // those accumulates rounding error across large floors)
  const rooms = entities.filter(e => e && e.kind === 'room');
  const netInternalArea = rooms.reduce((sum, r) => sum + roomArea(r), 0);

  // Estimate wall footprint area if walls are present
  const walls = entities.filter(e => e && e.kind === 'wall' && typeof e.x1 === 'number');
  let wallArea = 0;
  for (const w of walls) {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    const thick = w.thickness || 0.2;
    wallArea += len * thick;
  }
  // GIA = Net Internal Area + Structural Wall Footprint
  const grossInternalArea = netInternalArea + wallArea;

  const totalOccupants = schedule.reduce((sum, r) => sum + r.occupantCount, 0);

  // Circulation analysis (raw areas, like netInternalArea)
  const circulationRooms = rooms.filter(r => {
    const key = r.zoning || guessZoningFromRoomName(r.name);
    return key === 'circulation';
  });
  const circulationArea = circulationRooms.reduce((sum, r) => sum + roomArea(r), 0);
  const circulationRatio = netInternalArea > 0 ? (circulationArea / netInternalArea) * 100 : 0;

  // Breakdown by zoning department
  const zoningBreakdown = {};
  for (const key of Object.keys(ZONING_CATEGORIES)) {
    const matching = rooms.filter(r => (r.zoning || guessZoningFromRoomName(r.name)) === key);
    const area = matching.reduce((sum, r) => sum + roomArea(r), 0);
    const pct = netInternalArea > 0 ? (area / netInternalArea) * 100 : 0;
    zoningBreakdown[key] = {
      name: ZONING_CATEGORIES[key].name,
      color: ZONING_CATEGORIES[key].color,
      areaM2: Number(area.toFixed(2)),
      percentage: Number(pct.toFixed(1)),
      count: matching.length
    };
  }

  // IBC egress corridor minimum width estimate (0.2 inches per occupant = 5.08 mm per occupant, min 900mm)
  const minEgressWidthMm = Math.max(900, Math.round(totalOccupants * 5.1));

  return {
    roomCount: schedule.length,
    netInternalArea: Number(netInternalArea.toFixed(2)),
    netInternalAreaM2: Number(netInternalArea.toFixed(2)),
    grossInternalArea: Number(grossInternalArea.toFixed(2)),
    grossInternalAreaM2: Number(grossInternalArea.toFixed(2)),
    circulationArea: Number(circulationArea.toFixed(2)),
    circulationAreaM2: Number(circulationArea.toFixed(2)),
    circulationRatioPercent: Number(circulationRatio.toFixed(1)),
    circulationRatio: Number(circulationRatio.toFixed(1)),
    totalOccupants,
    minEgressWidthMm,
    egressWidthMm: minEgressWidthMm,
    zoningBreakdown
  };
}

/**
 * Formats room schedule as a CSV string.
 *
 * @param {Array<Object>} schedule
 * @param {Object} totals
 * @returns {string} CSV text
 */
export function formatScheduleCSV(schedule = [], totals = null) {
  const rows = [
    ['Room #', 'Room Name', 'Zoning', 'Area (m2)', 'Area (sq ft)', 'Perimeter (m)', 'Occupants', '% of Floor']
  ];

  for (const r of schedule) {
    rows.push([
      `"${r.number}"`,
      `"${r.name}"`,
      `"${r.zoningName}"`,
      r.areaM2.toFixed(2),
      r.areaSqFt.toFixed(1),
      r.perimeterM.toFixed(2),
      String(r.occupantCount),
      `${r.percentOfFloor.toFixed(1)}%`
    ]);
  }

  if (totals) {
    rows.push([]);
    rows.push(['TOTALS', '', '', totals.netInternalAreaM2.toFixed(2), '', '', String(totals.totalOccupants), '100.0%']);
    rows.push(['Gross Internal Area (GIA)', '', '', totals.grossInternalAreaM2.toFixed(2), '', '', '', '']);
    rows.push(['Circulation Ratio', '', '', `${totals.circulationRatioPercent}%`, '', '', '', '']);
  }

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Formats room schedule as a clean monospace ASCII table.
 *
 * @param {Array<Object>} schedule
 * @param {Object} totals
 * @returns {string} Monospace text
 */
export function formatScheduleASCII(schedule = [], totals = null) {
  if (!schedule || schedule.length === 0) return 'No rooms found in floor plan.';

  const pad = (str, len) => String(str).padEnd(len, ' ');
  const padNum = (num, len) => String(num).padStart(len, ' ');

  const header = `${pad('ROOM #', 8)} | ${pad('NAME', 20)} | ${pad('ZONING', 18)} | ${padNum('AREA (m²)', 10)} | ${padNum('PERIM (m)', 10)} | ${padNum('OCC', 4)} | ${padNum('%', 6)}`;
  const divider = '-'.repeat(header.length);

  const lines = [header, divider];

  for (const r of schedule) {
    lines.push(
      `${pad(r.number, 8)} | ${pad(r.name, 20)} | ${pad(r.zoningName, 18)} | ${padNum(r.areaM2.toFixed(2), 10)} | ${padNum(r.perimeterM.toFixed(2), 10)} | ${padNum(r.occupantCount, 4)} | ${padNum(r.percentOfFloor.toFixed(1) + '%', 6)}`
    );
  }

  lines.push(divider);

  if (totals) {
    lines.push(
      `${pad('TOTAL NET', 8)} | ${pad(`${schedule.length} Rooms`, 20)} | ${pad('All Zones', 18)} | ${padNum(totals.netInternalAreaM2.toFixed(2), 10)} | ${padNum('-', 10)} | ${padNum(totals.totalOccupants, 4)} | ${padNum('100.0%', 6)}`
    );
    lines.push(`Gross Internal Area (GIA): ${totals.grossInternalAreaM2.toFixed(2)} m² · Circulation Ratio: ${totals.circulationRatioPercent}%`);
  }

  return lines.join('\n');
}
