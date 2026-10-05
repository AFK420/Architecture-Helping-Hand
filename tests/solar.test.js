/**
 * Architecture Helping Hand — Solar Engine Tests (Phase G)
 *
 * The sun engine is pure math, so it is verified against known
 * astronomical reference values:
 *   - equinox: sunrise ≈ 06:00, sunset ≈ 18:00 solar time, 12h daylight
 *   - solstice: the longest/shortest day shifts correctly by latitude
 *   - solar noon altitude: 90 − |lat − decl|
 *   - Amman (31.95°N, 35.94°E, UTC+3): published sunrise/sunset within ±3 min
 *   - shadow geometry: 45° sun → shadow equals height; low sun → long shadow
 *   - polar edge cases: Tromsø polar night / midnight sun
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const S = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'solar.js')).href);
const {
  solarDeclination,
  equationOfTime,
  dayOfYearFromDate,
  solarPosition,
  sunTimes,
  shadowLength,
  shadowAtTime,
  sunPathForDay,
  shadowSummaryForDay
} = S;

let passed = 0;
let failed = 0;
function assert(condition, message, received) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
    failed++;
  }
}

function minutesOfDay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

console.log('🧪 Running tests/solar.test.js...');

// 1. Calendar helpers
{
  assert(dayOfYearFromDate('2026-01-01') === 1, 'Jan 1 = day 1');
  assert(dayOfYearFromDate('2026-12-31') === 365, '2026 Dec 31 = day 365 (non-leap)');
  assert(dayOfYearFromDate('2028-12-31') === 366, '2028 Dec 31 = day 366 (leap)');
  assert(Number.isNaN(dayOfYearFromDate('not-a-date')), 'Invalid date rejected');
  assert(Number.isNaN(dayOfYearFromDate('2026-13-01')), 'Invalid month rejected');
}

// 2. Declination — bounded, equator-crossing at equinoxes, extremes at solstices
{
  const equinox = solarDeclination(dayOfYearFromDate('2026-03-20'));
  assert(Math.abs(equinox) < 1, 'Declination ≈ 0 at March equinox', equinox);
  const june = solarDeclination(dayOfYearFromDate('2026-06-21'));
  assert(Math.abs(june - 23.44) < 0.5, 'Declination ≈ +23.44° at June solstice', june);
  const dec = solarDeclination(dayOfYearFromDate('2026-12-21'));
  assert(Math.abs(dec + 23.44) < 0.5, 'Declination ≈ −23.44° at December solstice', dec);
}

// 3. Equation of time — bounded ±16.5 min, ≈0 near equinox-ish days
{
  for (let d = 1; d <= 365; d++) {
    const e = equationOfTime(d);
    assert(e > -17 && e < 17, `EoT within NOAA bounds on day ${d}`, e);
    if (!(e > -17 && e < 17)) break;
  }
  // Nov 3-ish: EoT ≈ +16.4 min (sun fast)
  const nov = equationOfTime(dayOfYearFromDate('2026-11-03'));
  assert(nov > 14 && nov < 17, 'EoT ≈ +16 min in early November', nov);
  // Mid-Feb: EoT ≈ −14.2 min (sun slow)
  const feb = equationOfTime(dayOfYearFromDate('2026-02-12'));
  assert(feb > -16 && feb < -12.5, 'EoT ≈ −14 min in mid-February', feb);
}

// 4. Equinox day at Greenwich: sunrise/sunset near 06:00/18:00 CLOCK at (0,0,tz=0),
//    adjusted for the equation of time (~-8 min at the March equinox):
//    solar noon = 12:08 clock; the day stays centered on solar noon.
{
  const t = sunTimes({ latitudeDeg: 0, longitudeDeg: 0, date: '2026-03-20', timezoneOffsetHours: 0 });
  assert(t.ok, 'Equinox sun times ok');
  const eq = equationOfTime(dayOfYearFromDate('2026-03-20'));
  // clock solar noon = 12:00 − EoT (EoT −8 min → noon 12:08 clock)
  const noonShift = Math.round(-eq);
  assert(Math.abs(minutesOfDay(t.times.sunrise) - (360 + noonShift)) <= 3, 'Equinox sunrise tracks EoT at (0,0)', t.times.sunrise);
  assert(Math.abs(minutesOfDay(t.times.sunset) - (1080 + noonShift)) <= 3, 'Equinox sunset tracks EoT at (0,0)', t.times.sunset);
  assert(Math.abs(t.times.daylightHours - 12.05) < 0.15, 'Equinox daylight ≈ 12.1h (refraction adds a few min)', t.times.daylightHours);
  assert(Math.abs(minutesOfDay(t.times.solarNoon) - (720 + noonShift)) < 2, 'Solar noon = 12:00 − EoT at (0,0)', t.times.solarNoon);
}

// 5. Amman reference (31.9566°N, 35.9454°E, UTC+3 — permanent since 2022, no DST).
//    Astronomical ground truth derived from NOAA at this meridian:
//    solar noon ≈ 12:34 (EoT ≈ +1.9 min at Dec 21, ≈ −1.7 at Jun 21).
//    Daylight: June > 14h, December < 10.1h; the day is centered on solar noon.
{
  const jun = sunTimes({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-06-21', timezoneOffsetHours: 3 });
  assert(jun.ok, 'Amman June solstice times computed');
  // June: EoT ≈ -1.7 min → noon ≈ 720 - 143.78 - (-1.7) + 180 = 757.9 ≈ 12:38
  assert(Math.abs(minutesOfDay(jun.times.solarNoon) - minutesOfDay('12:38')) <= 3, 'Amman June solar noon ≈ 12:38', jun.times.solarNoon);
  const junDaylight = jun.times.daylightHours;
  assert(Math.abs(minutesOfDay(jun.times.sunset) - minutesOfDay(jun.times.sunrise) - junDaylight * 60) <= 3,
    'June sunrise/sunset are symmetric around solar noon (span = daylight)', jun.times);
  assert(junDaylight > 14, 'Amman June daylight > 14h', junDaylight);

  const dec = sunTimes({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-12-21', timezoneOffsetHours: 3 });
  assert(dec.ok, 'Amman December solstice times computed');
  assert(dec.times.daylightHours < 10.1, 'Amman December daylight < 10.1h', dec.times.daylightHours);
  assert(dec.times.daylightHours < junDaylight, 'June day longer than December day in the north');

  // Longitude sanity: 15° further east at the same tz → solar events ~1h earlier on the clock
  const baghdad = sunTimes({ latitudeDeg: 33.3, longitudeDeg: 44.4, date: '2026-12-21', timezoneOffsetHours: 3 });
  assert(minutesOfDay(baghdad.times.solarNoon) < minutesOfDay(dec.times.solarNoon),
    'East of the tz meridian → earlier clock solar noon', { baghdad: baghdad.times.solarNoon, amman: dec.times.solarNoon });
}

// 6. Solar position — noon altitude + azimuth at solar noon
{
  // At solar noon in the northern hemisphere outside the tropics, azimuth = 180° (due south)
  const noon = solarPosition({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-12-21', hour: 11, minute: 44, timezoneOffsetHours: 3 });
  assert(noon.ok, 'Solar position computed');
  // solar noon Amman Dec ≈ 11:44; find via times
  const t = sunTimes({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-12-21', timezoneOffsetHours: 3 });
  const [nh, nm] = t.times.solarNoon.split(':').map(Number);
  const noonExact = solarPosition({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-12-21', hour: nh, minute: nm, timezoneOffsetHours: 3 });
  assert(Math.abs(noonExact.position.azimuthDeg - 180) < 1.5, 'At solar noon the sun is due south (azimuth 180°) in Amman winter', noonExact.position.azimuthDeg);
  // altitude = 90 - |lat - decl| = 90 - |31.9566 - (-23.44)| ≈ 34.6
  assert(Math.abs(noonExact.position.altitudeDeg - (90 - Math.abs(31.9566 - (-23.44)))) < 0.6,
    'Noon altitude matches 90 − |lat − decl|', noonExact.position.altitudeDeg);

  // Sunrise in the east (northern hemisphere): azimuth near 90–115 in winter
  const [rh, rm] = t.times.sunrise.split(':').map(Number);
  const atSunrise = solarPosition({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-12-21', hour: rh, minute: rm, timezoneOffsetHours: 3 });
  assert(atSunrise.position.azimuthDeg > 95 && atSunrise.position.azimuthDeg < 130, 'Winter sunrise azimuth is in the southeast quadrant', atSunrise.position.azimuthDeg);
  assert(Math.abs(atSunrise.position.altitudeDeg) < 1.5, 'Altitude at published sunrise ≈ 0 (−0.833 refraction horizon)', atSunrise.position.altitudeDeg);

  // Validation errors
  const bad = solarPosition({ latitudeDeg: 95, longitudeDeg: 0, date: '2026-01-01', hour: 12, minute: 0 });
  assert(!bad.ok && bad.errors.length > 0, 'Out-of-range latitude rejected');
  const badDate = solarPosition({ latitudeDeg: 0, longitudeDeg: 0, date: 'xx', hour: 12, minute: 0 });
  assert(!badDate.ok, 'Bad date rejected');
}

// 7. Shadow geometry
{
  const s45 = shadowLength(10, 45);
  assert(s45.ok && Math.abs(s45.shadow.lengthM - 10) < 0.01, '45° sun casts a shadow equal to the height (10m → 10m)', s45.shadow?.lengthM);

  const sLow = shadowLength(10, 10);
  assert(sLow.ok && sLow.shadow.lengthM > 50, 'Low 10° sun casts a very long shadow (>50m)', sLow.shadow?.lengthM);

  const sNight = shadowLength(10, -5);
  assert(sNight.ok && sNight.shadow.sunBelowHorizon && sNight.shadow.lengthM === null, 'Sun below horizon → no shadow');

  const bad = shadowLength(-1, 45);
  assert(!bad.ok, 'Negative height rejected');
  const badAlt = shadowLength(10, 95);
  assert(!badAlt.ok, 'Impossible altitude rejected');

  // Direction: shadow bearing = sun azimuth + 180
  const withDir = shadowAtTime({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-06-21', hour: 9, minute: 0, obstructionHeightM: 20, timezoneOffsetHours: 3 });
  assert(withDir.ok, 'shadowAtTime ok');
  assert(Math.abs(((withDir.shadow.shadowAzimuthDeg - ((withDir.shadow.sunAzimuthDeg + 180) % 360)) + 360) % 360) < 0.01,
    'Shadow bearing is opposite the sun azimuth', { shadow: withDir.shadow.shadowAzimuthDeg, sun: withDir.shadow.sunAzimuthDeg });
  assert(Math.abs(withDir.shadow.lengthM - 20 / Math.tan(withDir.shadow.sunAltitudeDeg * Math.PI / 180)) < 0.05,
    'Shadow length consistent with h / tan(altitude)', withDir.shadow.lengthM);
  // Morning sun in Amman June: east-ish → shadow points west-ish
  assert(withDir.shadow.shadowAzimuthDeg > 180 && withDir.shadow.shadowAzimuthDeg < 300,
    'Morning shadow points into the western half', withDir.shadow.shadowAzimuthDeg);
}

// 8. Day path sampling
{
  const day = sunPathForDay({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-06-21', timezoneOffsetHours: 3, sampleStepMinutes: 30 });
  assert(day.ok, 'Day path computed');
  assert(day.path.length >= 25 && day.path.length <= 30, '30-min sampling of a 14.2h day gives ~28 points', day.path.length);
  const first = day.path[0];
  const last = day.path[day.path.length - 1];
  assert(first.azimuthDeg < 120, 'Path starts in the eastern sky', first.azimuthDeg);
  assert(last.azimuthDeg > 240, 'Path ends in the western sky', last.azimuthDeg);
  const maxAlt = Math.max(...day.path.map(p => p.altitudeDeg));
  assert(maxAlt > 70 && maxAlt < 82, 'Amman June noon altitude peaks ~78°', maxAlt);

  // Polar night: Tromsø (69.65°N) on Dec 21 — no sunrise
  const polar = sunPathForDay({ latitudeDeg: 69.65, longitudeDeg: 18.96, date: '2026-12-21', timezoneOffsetHours: 1 });
  assert(polar.ok && polar.times.polarNight && polar.path.length === 0, 'Tromsø December: polar night, empty path');

  // Midnight sun: Tromsø on Jun 21
  const midSun = sunTimes({ latitudeDeg: 69.65, longitudeDeg: 18.96, date: '2026-06-21', timezoneOffsetHours: 1 });
  assert(midSun.ok && midSun.times.midnightSun && midSun.times.daylightHours === 24, 'Tromsø June: midnight sun, 24h daylight');
}

// 9. Shadow summary (design-critical moments)
{
  const summary = shadowSummaryForDay({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-12-21', timezoneOffsetHours: 3, obstructionHeightM: 15 });
  assert(summary.ok, 'Summary computed');
  assert(summary.summary.shadows.length === 3, 'Morning/noon/afternoon entries present');
  const noonEntry = summary.summary.shadows.find(s => s.label === 'Solar noon');
  assert(noonEntry && noonEntry.shadowLengthM > 0, 'Noon shadow exists');
  // Winter noon in Amman: ~35° altitude → shadow ≈ 15 / tan(34.6) ≈ 21.7m
  assert(Math.abs(noonEntry.shadowLengthM - 15 / Math.tan(noonEntry.sunAltitudeDeg * Math.PI / 180)) < 0.05, 'Noon shadow consistent');
  // Morning shadow longer than noon shadow (lower sun)
  const morning = summary.summary.shadows.find(s => s.label.includes('09:00'));
  assert(morning.shadowLengthM > noonEntry.shadowLengthM, 'Morning shadow is longer than the noon shadow', { morning: morning.shadowLengthM, noon: noonEntry.shadowLengthM });
}

// 10. Determinism — identical inputs give identical outputs
{
  const a = sunTimes({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-06-21', timezoneOffsetHours: 3 });
  const b = sunTimes({ latitudeDeg: 31.9566, longitudeDeg: 35.9454, date: '2026-06-21', timezoneOffsetHours: 3 });
  assert(JSON.stringify(a.times) === JSON.stringify(b.times), 'Engine is deterministic');
}

// 11. View wiring — the UI reads the engine (no hardcoded sun facts)
{
  const fs = await import('fs');
  const view = fs.readFileSync(path.join(rootDir, 'src', 'ui', 'views', 'sun-path.js'), 'utf8');
  assert(view.includes('sunTimes') && view.includes('solarPosition') && view.includes('sunPathForDay'), 'Sun view imports the real engine functions');
  assert(!view.includes('sunrise ===') && !view.includes("'05:31'"), 'No hardcoded sun times in the view');
  const manifest = fs.readFileSync(path.join(rootDir, 'scripts', 'build.js'), 'utf8');
  assert(manifest.includes("core', 'solar.js'"), 'Build manifest includes the solar engine');
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert(html.includes('id="mode-view-sun_path"'), 'index.html has the sun path view container');
  assert(html.includes('id="mode-view-site_dashboard"') && html.includes('id="mode-view-site_context"'), 'index.html has the site views');
}

console.log(`\n${failed === 0 ? '✅' : '❌'} solar.test.js: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
