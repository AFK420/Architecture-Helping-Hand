/**
 * Architecture Helping Hand — Site Analysis Domain Model Tests (Phase G)
 * Contracts for src/core/site.js:
 *   - compass bearings (16-point), coordinate validation
 *   - external map links (real launch URLs, clearly external)
 *   - project container enrichment (defensive)
 *   - view entries (bearing + description + quality) and site factors
 *   - completeness snapshot derived from real data only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const M = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'site.js')).href);
const {
  bearingToCompass,
  createCoordinates,
  describeHemispheres,
  externalMapLinks,
  ensureSiteStudy,
  createViewEntry,
  createSiteFactor,
  siteStudySnapshot
} = M;

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

console.log('🧪 Running tests/site.test.js...');

// 1. Compass conversion (16-point)
{
  assert(bearingToCompass(0) === 'N', '0° = N');
  assert(bearingToCompass(22) === 'NNE', '22° = NNE');
  assert(bearingToCompass(45) === 'NE', '45° = NE');
  assert(bearingToCompass(90) === 'E', '90° = E');
  assert(bearingToCompass(135) === 'SE', '135° = SE');
  assert(bearingToCompass(180) === 'S', '180° = S');
  assert(bearingToCompass(225) === 'SW', '225° = SW');
  assert(bearingToCompass(270) === 'W', '270° = W');
  assert(bearingToCompass(315) === 'NW', '315° = NW');
  assert(bearingToCompass(360) === 'N', '360° wraps to N');
  assert(bearingToCompass(-90) === 'W', 'Negative bearings normalize (−90 = W)');
  assert(bearingToCompass('x') === '', 'Non-numeric bearing rejected');
}

// 2. Coordinate validation
{
  const ok = createCoordinates({ latDeg: '31.9566', lonDeg: '35.9454', timezoneOffsetHours: '3', city: 'Amman' });
  assert(ok.ok, 'Valid coordinates accepted (string inputs coerced)');
  assert(ok.coordinates.latDeg === 31.9566 && ok.coordinates.lonDeg === 35.9454, 'Values parsed');
  assert(ok.coordinates.timezoneOffsetHours === 3, 'Timezone parsed');
  assert(ok.coordinates.city === 'Amman', 'City preserved');
  assert(ok.coordinates.latDeg.toString().split('.')[1]?.length <= 6, 'Precision capped at 1e-6');

  const badLat = createCoordinates({ latDeg: 91, lonDeg: 0 });
  assert(!badLat.ok && badLat.errors[0].includes('latitude'), 'Latitude > 90 rejected');
  const badLon = createCoordinates({ latDeg: 0, lonDeg: 181 });
  assert(!badLon.ok && badLon.errors[0].includes('longitude'), 'Longitude > 180 rejected');
  const badTz = createCoordinates({ latDeg: 0, lonDeg: 0, timezoneOffsetHours: 15 });
  assert(!badTz.ok, 'Timezone beyond +14 rejected');
  const emptyTz = createCoordinates({ latDeg: 10, lonDeg: 10, timezoneOffsetHours: '' });
  assert(emptyTz.ok && emptyTz.coordinates.timezoneOffsetHours === 0, 'Empty timezone defaults to 0');
}

// 3. Hemisphere description
{
  assert(describeHemispheres({ latDeg: 31.9566, lonDeg: 35.9454 }) === '31.9566° N, 35.9454° E', 'Amman described correctly');
  assert(describeHemispheres({ latDeg: -33.87, lonDeg: -70 }) === '33.87° S, 70° W', 'Southern/western described');
  assert(describeHemispheres({ latDeg: NaN, lonDeg: 0 }) === '', 'Invalid coordinates rejected in description');
}

// 4. External map links — real launch URLs, clearly labeled
{
  const links = externalMapLinks({ latDeg: 31.9566, lonDeg: 35.9454 });
  assert(links.length === 4, 'Four external map services offered', links.length);
  const osm = links.find(l => l.id === 'osm');
  assert(osm.url.startsWith('https://www.openstreetmap.org/'), 'OSM link is a real https URL');
  assert(osm.url.includes('31.9566') && osm.url.includes('35.9454'), 'OSM link carries the coordinates');
  const earth = links.find(l => l.id === 'google_earth_web');
  assert(earth.url.startsWith('https://earth.google.com/web/@'), 'Google Earth Web launches the real service');
  for (const l of links) {
    assert(l.url.startsWith('https://'), `${l.label} uses https`);
    assert(!!l.desc, `${l.label} carries an honest description`);
  }
  assert(externalMapLinks({ latDeg: NaN, lonDeg: 0 }).length === 0, 'No links without valid coordinates');
}

// 5. Container enrichment is defensive + idempotent
{
  const bare = { id: 'p1', metadata: { name: 'P' } };
  const s1 = ensureSiteStudy(bare);
  assert(!!s1.coordinates !== undefined, 'Container created');
  assert(s1.coordinates === null, 'Coordinates start null (honest)');
  assert(Array.isArray(s1.views) && Array.isArray(s1.opportunities) && Array.isArray(s1.constraints), 'List fields start as arrays');
  assert(bare.site.location === '', 'Existing brief site fields preserved');

  const s2 = ensureSiteStudy(bare);
  assert(s2 === s1, 'Second call idempotent');

  const corrupt = { site: { study: 'garbage' } };
  const s3 = ensureSiteStudy(corrupt);
  assert(Array.isArray(s3.views), 'Corrupt study replaced safely');

  const kept = { site: { location: 'Amman', study: { coordinates: { latDeg: 1, lonDeg: 2, timezoneOffsetHours: 0 }, views: [{ id: 'v' }], opportunities: [], constraints: [] } } };
  const s4 = ensureSiteStudy(kept);
  assert(s4.coordinates.latDeg === 1 && s4.views.length === 1, 'Existing study data preserved');

  let threw = false;
  try { ensureSiteStudy(null); } catch { threw = true; }
  assert(threw, 'Null project rejected loudly');
}

// 6. View entries
{
  const ok = createViewEntry({ bearingDeg: 292, description: 'Sunset over the old city', quality: 'good' });
  assert(ok.ok, 'Valid view accepted');
  assert(ok.view.compass === 'WNW', 'Bearing converted to compass label', ok.view.compass);
  assert(ok.view.id.startsWith('view-'), 'View id prefix');
  assert(Object.isFrozen(ok.view), 'View entry frozen');

  const badBearing = createViewEntry({ bearingDeg: 365, description: 'x' });
  assert(!badBearing.ok && badBearing.errors[0].includes('bearing'), 'Bearing 365 rejected');
  const noDesc = createViewEntry({ bearingDeg: 10 });
  assert(!noDesc.ok && noDesc.errors[0].includes('description'), 'Missing description rejected');
  const badQuality = createViewEntry({ bearingDeg: 10, description: 'x', quality: 'nonsense' });
  assert(badQuality.ok && badQuality.view.quality === 'fair', 'Unknown quality falls back to fair');
}

// 7. Site factors (opportunities / constraints)
{
  const opp = createSiteFactor({ text: 'South-facing slope with strong solar gain', kind: 'opportunity' });
  assert(opp.ok && opp.factor.kind === 'opportunity', 'Opportunity created');
  const con = createSiteFactor({ text: 'Highway noise from the east', kind: 'constraint' });
  assert(con.ok && con.factor.kind === 'constraint', 'Constraint created');
  assert(con.factor.id.startsWith('con-'), 'Constraint id prefix');
  const badKind = createSiteFactor({ text: 'x', kind: 'weird' });
  assert(badKind.ok && badKind.factor.kind === 'opportunity', 'Unknown kind defaults to opportunity');
  const empty = createSiteFactor({ text: '   ' });
  assert(!empty.ok, 'Empty text rejected');
  const tooLong = createSiteFactor({ text: 'x'.repeat(501) });
  assert(!tooLong.ok, 'Over-length text rejected');
}

// 8. Completeness snapshot — derived from real data only
{
  const project = { id: 'p', metadata: { name: 'P' }, site: { location: 'Amman', areaM2: 850, notes: 'corner plot' } };
  const study = ensureSiteStudy(project);
  let snap = siteStudySnapshot(project);
  assert(snap.completeness === 0 && snap.completenessTotal === 5, 'Empty study → 0/5');
  assert(snap.siteLocation === 'Amman' && snap.siteAreaM2 === 850, 'Brief site fields surfaced');
  assert(!snap.hasCoordinates && snap.hemisphereLabel === '', 'No coordinates → honest empty label');

  study.coordinates = { latDeg: 31.9566, lonDeg: 35.9454, timezoneOffsetHours: 3, city: 'Amman' };
  study.climate.summary = 'Hot-dry Mediterranean';
  study.views.push(createViewEntry({ bearingDeg: 292, description: 'Old city' }).view);
  study.opportunities.push(createSiteFactor({ text: 'slope' }).factor);
  study.constraints.push(createSiteFactor({ text: 'noise', kind: 'constraint' }).factor);

  snap = siteStudySnapshot(project);
  assert(snap.hasCoordinates && snap.hemisphereLabel === '31.9566° N, 35.9454° E', 'Coordinates detected + described');
  assert(snap.city === 'Amman', 'City surfaced');
  assert(snap.climateFilled, 'Climate marked filled');
  assert(snap.viewCount === 1 && snap.opportunityCount === 1 && snap.constraintCount === 1, 'Counts correct');
  assert(snap.completeness === 5, 'All five sections filled → 5/5');

  // REGRESSION (QA-found bug): normalizeProject used to silently drop
  // site.study on every save. The site study must survive normalization
  // because updateProject() normalizes after every mutation.
  const P = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'project.js')).href);
  const normalized = P.normalizeProject(project);
  assert(normalized.site && normalized.site.study, 'site.study survives normalizeProject');
  assert(normalized.site.study.coordinates?.latDeg === 31.9566, 'study coordinates survive normalization');
  assert(normalized.site.study.views.length === 1, 'study views survive normalization');
  const v = P.validateProject(normalized);
  assert(v.ok, 'Normalized project with site.study validates', v.errors);
}

// 9. Wiring contracts
{
  const manifest = fs.readFileSync(path.join(rootDir, 'scripts', 'build.js'), 'utf8');
  assert(manifest.includes("core', 'site.js'"), 'Build manifest includes the site model');
  assert(manifest.includes('site-dashboard.js') && manifest.includes('site-context.js'), 'Build manifest includes the site views');

  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  for (const id of ['site_dashboard', 'sun_path', 'site_context']) {
    assert(html.includes(`id="mode-view-${id}"`), `index.html has view container for "${id}"`);
  }
  assert(html.includes('id="sun-path-tool"') && html.includes('id="site-context"') && html.includes('id="site-dashboard"'), 'index.html has the view hosts');

  const dashView = fs.readFileSync(path.join(rootDir, 'src', 'ui', 'views', 'site-dashboard.js'), 'utf8');
  assert(dashView.includes('sunTimes'), 'Site Dashboard computes sun facts from the real engine');
  assert(!dashView.includes("'06:") , 'No hardcoded sunrise times in the dashboard');

  const ctxView = fs.readFileSync(path.join(rootDir, 'src', 'ui', 'views', 'site-context.js'), 'utf8');
  assert(ctxView.includes('target="_blank"') && ctxView.includes('rel="noopener noreferrer"'), 'External links open safely in a new tab');
  assert(ctxView.includes('OPENS OUTSIDE THIS APP'), 'External links are labeled as external launches');
}

console.log(`\n${failed === 0 ? '✅' : '❌'} site.test.js: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
