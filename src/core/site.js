/**
 * Architecture Helping Hand — Site Analysis Domain Model (Phase G)
 *
 * Structured site context capture, stored on the project document under
 * `site: { location, notes, areaM2, orientation }` (the existing v3 brief
 * site field) extended with a Phase-G `site.study` container:
 *
 *   study: {
 *     coordinates: { latDeg, lonDeg, timezoneOffsetHours, city },
 *     climate:    { summary, temperatureNotes, precipitationNotes },
 *     movement:   { vehicles, pedestrians, publicTransport, serviceAccess },
 *     views:      [{ id, directionDeg, description, quality }],
 *     opportunities: [{ id, text }],
 *     constraints:   [{ id, text }]
 *   }
 *
 * Everything is captured by the architect — the model validates and
 * derives (e.g. compass direction names from bearings). External map
 * services are launched as EXTERNAL links only, clearly labeled; nothing
 * pretends to be embedded or synced.
 */

const DIR_STEPS = 16; // 16-point compass

/** Bearing (0–360°) → 16-point compass label (N, NNE, NE, ENE, E, …). */
export function bearingToCompass(bearingDeg) {
  const b = Number(bearingDeg);
  if (!Number.isFinite(b)) return '';
  const norm = ((b % 360) + 360) % 360;
  const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(norm / (360 / DIR_STEPS)) % DIR_STEPS;
  return names[idx];
}

/** Generates a stable id for site study list items. */
export function generateSiteItemId(prefix = 'si') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Coordinates
// ---------------------------------------------------------------------------

/**
 * Validates and normalizes coordinates.
 * @returns {{ok, errors, coordinates}}
 */
export function createCoordinates(input = {}) {
  const errors = [];
  const lat = Number(input.latDeg);
  const lon = Number(input.lonDeg);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push('latitude must be between -90 and 90');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push('longitude must be between -180 and 180');
  const tz = input.timezoneOffsetHours === undefined || input.timezoneOffsetHours === ''
    ? 0 : Number(input.timezoneOffsetHours);
  if (!Number.isFinite(tz) || tz < -12 || tz > 14) errors.push('timezone offset must be between -12 and +14');
  if (errors.length > 0) return { ok: false, errors, coordinates: null };

  return {
    ok: true,
    errors: [],
    coordinates: {
      latDeg: Math.round(lat * 1e6) / 1e6,
      lonDeg: Math.round(lon * 1e6) / 1e6,
      timezoneOffsetHours: tz,
      city: typeof input.city === 'string' ? input.city.trim() : ''
    }
  };
}

/** Hemisphere descriptors for a latitude/longitude (for honest display). */
export function describeHemispheres({ latDeg, lonDeg }) {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return '';
  return `${Math.abs(latDeg)}° ${latDeg >= 0 ? 'N' : 'S'}, ${Math.abs(lonDeg)}° ${lonDeg >= 0 ? 'E' : 'W'}`;
}

// ---------------------------------------------------------------------------
// External launch links (clearly labeled, no fake embedding)
// ---------------------------------------------------------------------------

/**
 * EXTERNAL map links for a coordinate. These open the real services in a
 * new tab; the UI labels them as external launches.
 */
export function externalMapLinks({ latDeg, lonDeg }) {
  const lat = Number(latDeg);
  const lon = Number(lonDeg);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  const ll = `${lat},${lon}`;
  return [
    {
      id: 'osm',
      label: 'OpenStreetMap',
      desc: 'Free open map — view streets and context',
      url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
    },
    {
      id: 'google_maps',
      label: 'Google Maps',
      desc: 'Satellite view and street imagery',
      url: `https://www.google.com/maps/@${lat},${lon},18z`
    },
    {
      id: 'google_earth_web',
      label: 'Google Earth Web',
      desc: '3D terrain and worldwide imagery',
      url: `https://earth.google.com/web/@${lat},${lon},0a,1000d,35y,0h,0t,0r`
    },
    {
      id: 'google_maps_place',
      label: 'Google Maps (place pin)',
      desc: 'Drop a pin to measure and save the location',
      url: `https://maps.google.com/?q=${ll}`
    }
  ];
}

// ---------------------------------------------------------------------------
// Project container
// ---------------------------------------------------------------------------

const SITE_STUDY_SHAPE = () => ({
  coordinates: null,
  climate: { summary: '', temperatureNotes: '', precipitationNotes: '' },
  movement: { vehicles: '', pedestrians: '', publicTransport: '', serviceAccess: '' },
  views: [],
  opportunities: [],
  constraints: []
});

/**
 * Ensures the project has a canonical site.study container (defensive
 * enrichment — same philosophy as ensureResearchContainer).
 * @param {object} project
 */
export function ensureSiteStudy(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error('ensureSiteStudy requires a project object');
  }
  if (!project.site || typeof project.site !== 'object' || Array.isArray(project.site)) {
    project.site = { location: '', notes: '', areaM2: null, orientation: '' };
  }
  if (!project.site.study || typeof project.site.study !== 'object' || Array.isArray(project.site.study)) {
    project.site.study = SITE_STUDY_SHAPE();
  }
  const s = project.site.study;
  for (const [key, def] of Object.entries(SITE_STUDY_SHAPE())) {
    if (s[key] === undefined || s[key] === null || typeof s[key] !== typeof def) s[key] = def;
  }
  for (const arrKey of ['views', 'opportunities', 'constraints']) {
    if (!Array.isArray(s[arrKey])) s[arrKey] = [];
  }
  return s;
}

/** Creates a validated view entry (bearing + description + quality). */
export function createViewEntry(input = {}) {
  const errors = [];
  const bearing = Number(input.bearingDeg);
  if (!Number.isFinite(bearing) || bearing < 0 || bearing >= 360) errors.push('bearing must be 0–359 degrees');
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!description) errors.push('description is required');
  if (errors.length > 0) return { ok: false, errors, view: null };
  const quality = ['good', 'fair', 'blocked'].includes(input.quality) ? input.quality : 'fair';
  return {
    ok: true,
    errors: [],
    view: Object.freeze({
      id: typeof input.id === 'string' && input.id ? input.id : generateSiteItemId('view'),
      bearingDeg: Math.round(bearing),
      compass: bearingToCompass(bearing),
      description,
      quality,
      createdAt: input.createdAt || new Date().toISOString()
    })
  };
}

/** Creates a validated opportunity/constraint entry. */
export function createSiteFactor(input = {}) {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) return { ok: false, errors: ['text is required'], factor: null };
  if (text.length > 500) return { ok: false, errors: ['text must be 500 characters or fewer'], factor: null };
  const kind = input.kind === 'constraint' ? 'constraint' : 'opportunity';
  return {
    ok: true,
    errors: [],
    factor: Object.freeze({
      id: typeof input.id === 'string' && input.id ? input.id : generateSiteItemId(kind === 'constraint' ? 'con' : 'opp'),
      kind,
      text,
      createdAt: input.createdAt || new Date().toISOString()
    })
  };
}

/**
 * Site study completeness snapshot for the dashboard: which sections the
 * architect has filled, derived from real data only.
 */
export function siteStudySnapshot(project) {
  const study = ensureSiteStudy(project);
  const hasCoords = !!(study.coordinates && Number.isFinite(study.coordinates.latDeg));
  const strFilled = v => typeof v === 'string' && v.trim().length > 0;
  const climateFilled = strFilled(study.climate?.summary)
    || strFilled(study.climate?.temperatureNotes)
    || strFilled(study.climate?.precipitationNotes);
  const movementFilled = strFilled(study.movement?.vehicles)
    || strFilled(study.movement?.pedestrians)
    || strFilled(study.movement?.publicTransport)
    || strFilled(study.movement?.serviceAccess);
  return {
    hasCoordinates: hasCoords,
    hemisphereLabel: hasCoords ? describeHemispheres(study.coordinates) : '',
    city: hasCoords ? (study.coordinates.city || '') : '',
    climateFilled,
    movementFilled,
    viewCount: study.views.length,
    opportunityCount: study.opportunities.length,
    constraintCount: study.constraints.length,
    siteAreaM2: Number.isFinite(project.site?.areaM2) ? project.site.areaM2 : null,
    siteLocation: typeof project.site?.location === 'string' ? project.site.location : '',
    siteNotes: typeof project.site?.notes === 'string' ? project.site.notes : '',
    completeness: [
      hasCoords, climateFilled, study.views.length > 0,
      study.opportunities.length > 0, study.constraints.length > 0
    ].filter(Boolean).length,
    completenessTotal: 5
  };
}
