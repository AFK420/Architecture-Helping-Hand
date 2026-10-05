/**
 * Architecture Helping Hand — Solar Position & Shadow Engine (Phase G)
 *
 * Pure, deterministic solar geometry for site analysis. Implements the
 * NOAA solar calculator algorithm (accuracy ~1 minute for sunrise/sunset,
 * <0.01° for azimuth/elevation at architectural precision):
 *
 *   declination δ  — Spencer's four-term series
 *   equation of time E — NOAA fractional-year series
 *   hour angle H — from true solar time
 *   solar altitude α / azimuth γ — standard astronomical transformation
 *   sunrise/sunset — the hour angle where refraction-corrected altitude
 *                    (−0.833°) is crossed
 *
 * Everything is math — no network, no APIs, no faked data. The architect
 * supplies latitude, longitude, date, and (optionally) time + obstruction
 * height; the engine answers:
 *   - where the sun is (azimuth/altitude) at any minute of any day
 *   - when it rises and sets, and total daylight hours
 *   - solar noon (highest point, true south/north bearing)
 *   - shadow length cast by a vertical obstruction of height h
 *   - a full-day path (sampled) for diagram drawing
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function toNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ---------------------------------------------------------------------------
// Core solar geometry (NOAA)
// ---------------------------------------------------------------------------

/**
 * Fractional year γ (radians) for a date, NOAA approximation.
 * @param {number} dayOfYear 1..366
 */
function fractionalYear(dayOfYear) {
  return ((2 * Math.PI) / 365) * (dayOfYear - 1 + 0.5);
}

/**
 * Solar declination δ in degrees — Spencer series (NOAA form).
 * @param {number} dayOfYear 1..366
 */
export function solarDeclination(dayOfYear) {
  const g = fractionalYear(dayOfYear);
  return (0.006918
    - 0.399912 * Math.cos(g)
    + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g)
    + 0.00148 * Math.sin(3 * g)) * RAD;
}

/**
 * Equation of time E in minutes — NOAA series.
 * @param {number} dayOfYear 1..366
 */
export function equationOfTime(dayOfYear) {
  const g = fractionalYear(dayOfYear);
  return 229.18 * (0.000075
    + 0.001868 * Math.cos(g)
    - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g)
    - 0.040849 * Math.sin(2 * g));
}

/** Day of year from a YYYY-MM-DD date string (UTC-agnostic calendar day). */
export function dayOfYearFromDate(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!m) return NaN;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return NaN;
  // Day-of-year via UTC math (deterministic; no timezone involved)
  const target = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 1);
  const doy = Math.round((target - start) / 86400000) + 1;
  return doy >= 1 && doy <= 366 ? doy : NaN;
}

/**
 * True solar time (minutes from local midnight) at a given local clock time.
 * NOAA convention: the longitude correction is relative to the local time
 * zone's STANDARD MERIDIAN (15° × offset hours), not to Greenwich.
 * @param {number} minutesFromMidnight local clock time in minutes
 * @param {number} longitudeDeg east-positive
 * @param {number} eqTimeMin equation of time for the day (minutes)
 * @param {number} timezoneOffsetHours local standard offset from UTC (e.g. Amman +3)
 */
function trueSolarTimeMinutes(minutesFromMidnight, longitudeDeg, eqTimeMin, timezoneOffsetHours) {
  return minutesFromMidnight + eqTimeMin + 4 * longitudeDeg - 60 * timezoneOffsetHours;
}

/**
 * Solar position (azimuth + altitude) at a moment.
 *
 * @param {object} input
 * @param {number} input.latitudeDeg  -90..90 (north positive)
 * @param {number} input.longitudeDeg -180..180 (east positive)
 * @param {string} input.date YYYY-MM-DD
 * @param {number} input.hour 0..23 local standard time hour
 * @param {number} input.minute 0..59
 * @param {number} [input.timezoneOffsetHours] local UTC offset (default 0)
 * @returns {{ok: boolean, errors: string[], position: object|null}}
 */
export function solarPosition({ latitudeDeg, longitudeDeg, date, hour, minute, timezoneOffsetHours = 0 }) {
  const errors = [];
  const lat = toNum(latitudeDeg, NaN);
  const lon = toNum(longitudeDeg, NaN);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push('latitude must be a number between -90 and 90');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.push('longitude must be a number between -180 and 180');
  const doy = dayOfYearFromDate(date);
  if (!Number.isFinite(doy)) errors.push('date must be YYYY-MM-DD');
  const h = toNum(hour, NaN);
  const min = toNum(minute, 0);
  if (!Number.isFinite(h) || h < 0 || h > 23 || !Number.isFinite(min) || min < 0 || min > 59) {
    errors.push('time must be hour 0–23 and minute 0–59');
  }
  if (!Number.isFinite(timezoneOffsetHours) || timezoneOffsetHours < -12 || timezoneOffsetHours > 14) {
    errors.push('timezone offset must be between -12 and +14 hours');
  }
  if (errors.length > 0) return { ok: false, errors, position: null };

  const decl = solarDeclination(doy);
  const eqTime = equationOfTime(doy);
  const tst = trueSolarTimeMinutes(h * 60 + min, lon, eqTime, timezoneOffsetHours);
  const hourAngle = (tst / 4) - 180; // 1 minute = 0.25°

  const latR = lat * DEG;
  const declR = decl * DEG;
  const cosZenith = Math.sin(latR) * Math.sin(declR)
    + Math.cos(latR) * Math.cos(declR) * Math.cos(hourAngle * DEG);

  // Clamp for floating-point noise around sunrise/sunset
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith))) * RAD;
  const altitude = 90 - zenith;

  // Azimuth via the standard atan2 transformation (azimuth clockwise from
  // north): atan2(east component, north component).
  //   east  component:  x = −cos(δ)·sin(H)   (H < 0 before noon → x > 0)
  //   north component:  y = sin(δ)·cos(φ) − cos(δ)·sin(φ)·cos(H)
  // Northern-hemisphere noon (δ < φ): y < 0 → az = 180 (due south) ✓
  // Southern-hemisphere noon (δ > φ as seen from Sydney in Dec): y > 0 → az ≈ 0/360 (due north) ✓
  let azimuth;
  const H = hourAngle * DEG;
  const x = -Math.cos(declR) * Math.sin(H);
  const y = Math.sin(declR) * Math.cos(latR) - Math.cos(declR) * Math.sin(latR) * Math.cos(H);
  azimuth = Math.atan2(x, y) * RAD;
  if (azimuth < 0) azimuth += 360;

  return {
    ok: true,
    errors: [],
    position: {
      date,
      dayOfYear: doy,
      declinationDeg: decl,
      equationOfTimeMin: eqTime,
      hourAngleDeg: hourAngle,
      azimuthDeg: Math.round(azimuth * 100) / 100,
      altitudeDeg: Math.round(altitude * 100) / 100,
      isAboveHorizon: altitude > -0.833
    }
  };
}

// ---------------------------------------------------------------------------
// Sunrise / sunset / solar noon
// ---------------------------------------------------------------------------

/**
 * Sunrise, sunset, solar noon, and daylight length for a location and date.
 * Uses the −0.833° horizon (refraction + solar-disc radius).
 *
 * @returns {{ok: boolean, errors: string[], times: object|null}}
 */
export function sunTimes({ latitudeDeg, longitudeDeg, date, timezoneOffsetHours = 0 }) {
  const probe = solarPosition({ latitudeDeg, longitudeDeg, date, hour: 12, minute: 0, timezoneOffsetHours });
  if (!probe.ok) return { ok: false, errors: probe.errors, times: null };

  const lat = toNum(latitudeDeg, 0);
  const lon = toNum(longitudeDeg, 0);
  const doy = dayOfYearFromDate(date);
  const decl = solarDeclination(doy) * DEG;
  const eqTime = equationOfTime(doy);
  const latR = lat * DEG;

  const cosH0 = (Math.cos(90.833 * DEG) - Math.sin(latR) * Math.sin(decl)) /
    (Math.cos(latR) * Math.cos(decl));

  if (cosH0 > 1) {
    // Polar night
    return { ok: true, errors: [], times: { date, sunrise: null, sunset: null, solarNoon: null, daylightHours: 0, polarNight: true, midnightSun: false } };
  }
  if (cosH0 < -1) {
    // Midnight sun
    return { ok: true, errors: [], times: { date, sunrise: null, sunset: null, solarNoon: null, daylightHours: 24, polarNight: false, midnightSun: true } };
  }

  const h0 = Math.acos(cosH0) * RAD; // degrees

  // Solar noon in local clock minutes: TST=720 when hour angle = 0
  const noonMin = 720 - 4 * lon - eqTime + 60 * timezoneOffsetHours;

  const sunriseMin = noonMin - 4 * h0;
  const sunsetMin = noonMin + 4 * h0;

  const fmt = totalMin => {
    const t = ((totalMin % 1440) + 1440) % 1440;
    const hh = Math.floor(t / 60);
    const mm = Math.round(t % 60);
    return `${String(hh).padStart(2, '0')}:${String(mm === 60 ? 59 : mm).padStart(2, '0')}`;
  };

  return {
    ok: true,
    errors: [],
    times: {
      date,
      sunrise: fmt(sunriseMin),
      sunset: fmt(sunsetMin),
      solarNoon: fmt(noonMin),
      daylightHours: Math.round((2 * h0 / 15) * 100) / 100,
      polarNight: false,
      midnightSun: false
    }
  };
}

// ---------------------------------------------------------------------------
// Shadow geometry
// ---------------------------------------------------------------------------

/**
 * Shadow cast by a vertical obstruction of height h when the sun is at a
 * given altitude. Ground is flat; azimuth gives the shadow's bearing
 * (opposite the sun's azimuth — shadows point away from the sun).
 *
 * @param {number} obstructionHeightM vertical height in meters
 * @param {number} sunAltitudeDeg sun altitude in degrees
 * @returns {{ok: boolean, errors: string[], shadow: object|null}}
 */
export function shadowLength(obstructionHeightM, sunAltitudeDeg) {
  const h = toNum(obstructionHeightM, NaN);
  const alt = toNum(sunAltitudeDeg, NaN);
  const errors = [];
  if (!Number.isFinite(h) || h <= 0) errors.push('obstruction height must be a positive number (meters)');
  if (!Number.isFinite(alt) || alt <= -90 || alt > 90) errors.push('sun altitude must be between -90 and 90 degrees');
  if (errors.length > 0) return { ok: false, errors, shadow: null };

  if (alt <= 0) {
    return {
      ok: true, errors: [],
      shadow: { lengthM: null, directionDeg: null, sunBelowHorizon: true }
    };
  }

  const length = h / Math.tan(alt * DEG);
  return {
    ok: true,
    errors: [],
    shadow: {
      lengthM: Math.round(length * 100) / 100,
      directionDeg: null, // filled by the caller from the sun azimuth + 180
      sunBelowHorizon: false
    }
  };
}

/**
 * Shadow with bearing: pairs shadowLength with a solar position so the
 * shadow's ground direction (azimuth of the shadow = sun azimuth + 180°)
 * is included.
 */
export function shadowAtTime({ latitudeDeg, longitudeDeg, date, hour, minute, obstructionHeightM, timezoneOffsetHours = 0 }) {
  const pos = solarPosition({ latitudeDeg, longitudeDeg, date, hour, minute, timezoneOffsetHours });
  if (!pos.ok) return { ok: false, errors: pos.errors, shadow: null };
  const shadow = shadowLength(obstructionHeightM, pos.position.altitudeDeg);
  if (!shadow.ok) return { ok: false, errors: shadow.errors, shadow: null };

  if (shadow.shadow.sunBelowHorizon) {
    return { ok: true, errors: [], shadow: { ...shadow.shadow, obstructionHeightM: toNum(obstructionHeightM, 0), atTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` } };
  }
  return {
    ok: true,
    errors: [],
    shadow: {
      ...shadow.shadow,
      obstructionHeightM: toNum(obstructionHeightM, 0),
      shadowAzimuthDeg: Math.round(((pos.position.azimuthDeg + 180) % 360) * 100) / 100,
      sunAltitudeDeg: pos.position.altitudeDeg,
      sunAzimuthDeg: pos.position.azimuthDeg,
      atTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  };
}

// ---------------------------------------------------------------------------
// Day path (for diagrams)
// ---------------------------------------------------------------------------

/**
 * Samples the sun's path across a day (sunrise→sunset) at a fixed interval.
 * Returns points with azimuth + altitude for drawing a sun-path diagram.
 *
 * @param {object} input like sunTimes + sampleStepMinutes (default 30)
 * @returns {{ok: boolean, errors: string[], path: Array|null, times: object|null}}
 */
export function sunPathForDay({ latitudeDeg, longitudeDeg, date, timezoneOffsetHours = 0, sampleStepMinutes = 30 }) {
  const times = sunTimes({ latitudeDeg, longitudeDeg, date, timezoneOffsetHours });
  if (!times.ok) return { ok: false, errors: times.errors, path: null, times: null };
  // Polar cases have no sampled path (no sunrise/sunset crossing)
  if (times.times.sunrise === null || times.times.sunset === null) {
    return { ok: true, errors: [], path: [], times: times.times };
  }

  const parseHM = s => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  let t = parseHM(times.times.sunrise);
  const end = parseHM(times.times.sunset);
  const step = Number.isFinite(sampleStepMinutes) && sampleStepMinutes >= 5 ? Math.round(sampleStepMinutes) : 30;

  const path = [];
  while (t <= end) {
    const pos = solarPosition({ latitudeDeg, longitudeDeg, date, hour: Math.floor(t / 60), minute: t % 60, timezoneOffsetHours });
    if (pos.ok && pos.position.altitudeDeg > -0.833) {
      path.push({
        time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`,
        azimuthDeg: pos.position.azimuthDeg,
        altitudeDeg: pos.position.altitudeDeg
      });
    }
    t += step;
  }
  return { ok: true, errors: [], path, times: times.times };
}

// ---------------------------------------------------------------------------
// Design-relevant shortcuts
// ---------------------------------------------------------------------------

/**
 * The four design-critical moments of a day: sunrise, 09:00, solar noon,
 * 15:00, sunset — positions + shadow lengths for a given obstruction.
 * A quick "how far will this building's shadow reach" answer.
 */
export function shadowSummaryForDay({ latitudeDeg, longitudeDeg, date, timezoneOffsetHours = 0, obstructionHeightM = 10 }) {
  const times = sunTimes({ latitudeDeg, longitudeDeg, date, timezoneOffsetHours });
  if (!times.ok || times.times.sunrise === null) {
    return { ok: false, errors: times.errors || ['no sunrise/sunset for this location/date'], summary: null };
  }
  const probeTimes = [
    { label: 'Morning (09:00)', hour: 9, minute: 0 },
    { label: 'Solar noon', hour: 12, minute: 0 },
    { label: 'Afternoon (15:00)', hour: 15, minute: 0 }
  ];
  const entries = [];
  for (const t of probeTimes) {
    const s = shadowAtTime({ latitudeDeg, longitudeDeg, date, hour: t.hour, minute: t.minute, obstructionHeightM, timezoneOffsetHours });
    if (s.ok) {
      entries.push({
        label: t.label,
        atTime: s.shadow.atTime,
        sunAltitudeDeg: s.shadow.sunAltitudeDeg ?? null,
        sunAzimuthDeg: s.shadow.sunAzimuthDeg ?? null,
        shadowLengthM: s.shadow.lengthM,
        shadowAzimuthDeg: s.shadow.shadowAzimuthDeg ?? null,
        sunBelowHorizon: !!s.shadow.sunBelowHorizon
      });
    }
  }
  return {
    ok: true,
    errors: [],
    summary: {
      date,
      obstructionHeightM: toNum(obstructionHeightM, 0),
      times: times.times,
      shadows: entries
    }
  };
}
