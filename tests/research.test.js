/**
 * Architecture Helping Hand — Research Domain Model Tests (Phase F)
 * Contracts for src/core/research.js:
 *   - reference creation/validation (title required, URL scheme, tags cleanup)
 *   - research notes with provenance
 *   - project container enrichment (defensive, no schema migration needed)
 *   - filtering (category + tokens AND-match) and tag collection
 *   - snapshot correctness (counts, coverage)
 *   - starter pack honesty (real works, curated not auto-added)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const R = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'research.js')).href);
const {
  REFERENCE_CATEGORIES,
  REFERENCE_CATEGORY_IDS,
  createReference,
  createResearchNote,
  ensureResearchContainer,
  collectReferenceTags,
  filterReferences,
  researchSnapshot,
  RESEARCH_STARTER_PACK
} = R;

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

console.log('🧪 Running tests/research.test.js...');

// 1. Categories are the UI contract
{
  assert(REFERENCE_CATEGORY_IDS.includes('precedent'), 'Precedent category exists');
  assert(REFERENCE_CATEGORY_IDS.includes('case_study'), 'Case Study category exists');
  assert(REFERENCE_CATEGORY_IDS.includes('material'), 'Material category exists');
  assert(REFERENCE_CATEGORY_IDS.includes('standard'), 'Standard category exists');
  const ids = new Set(REFERENCE_CATEGORY_IDS);
  assert(ids.size === REFERENCE_CATEGORY_IDS.length, 'Category ids are unique');
}

// 2. createReference validation
{
  const ok = createReference({ title: 'Exeter Library', category: 'precedent', architect: 'Louis I. Kahn', year: 1972, tags: ['Daylight', ' library ', ''] });
  assert(ok.ok, 'Valid reference accepted');
  assert(ok.reference.title === 'Exeter Library', 'Title preserved');
  assert(ok.reference.category === 'precedent', 'Category preserved');
  assert(ok.reference.year === 1972, 'Year parsed as number');
  assert(
    ok.reference.tags.length === 2 && ok.reference.tags[0] === 'daylight' && ok.reference.tags[1] === 'library',
    'Tags lowercased, trimmed, empties dropped', ok.reference.tags
  );
  assert(ok.reference.id.startsWith('ref-'), 'Reference id generated with ref- prefix');

  const noTitle = createReference({ category: 'precedent' });
  assert(!noTitle.ok && noTitle.errors[0].includes('title'), 'Missing title rejected with explicit error');

  const blankTitle = createReference({ title: '   ' });
  assert(!blankTitle.ok, 'Whitespace-only title rejected');

  const badUrl = createReference({ title: 'X', url: 'not-a-url' });
  assert(!badUrl.ok && badUrl.errors[0].includes('url'), 'Malformed URL rejected', badUrl.errors);

  const goodUrl = createReference({ title: 'X', url: 'https://example.com' });
  assert(goodUrl.ok && goodUrl.reference.url === 'https://example.com', 'https URL accepted');

  const wwwUrl = createReference({ title: 'X', url: 'www.example.com' });
  assert(wwwUrl.ok, 'www URL accepted');

  const unknownCat = createReference({ title: 'X', category: 'nonsense' });
  assert(unknownCat.ok && unknownCat.reference.category === 'other', 'Unknown category falls back to "other"', unknownCat.reference?.category);
}

// 3. createResearchNote validation + provenance
{
  const ok = createResearchNote({ text: 'Atrium daylight worked in 3 of 4 studied libraries.', topic: 'Daylight', source: 'Site visit, Amman' });
  assert(ok.ok, 'Valid note accepted');
  assert(ok.note.topic === 'Daylight' && ok.note.source === 'Site visit, Amman', 'Provenance fields preserved');
  assert(ok.note.id.startsWith('rn-'), 'Note id generated with rn- prefix');

  const empty = createResearchNote({ text: '' });
  assert(!empty.ok && empty.errors[0].includes('text'), 'Empty note rejected');

  const tooLong = createResearchNote({ text: 'x'.repeat(5001) });
  assert(!tooLong.ok, 'Over-length note rejected');
}

// 4. Project container enrichment is defensive and idempotent
{
  const bare = { id: 'p1', metadata: { name: 'P' } };
  const c1 = ensureResearchContainer(bare);
  assert(Array.isArray(c1.references) && Array.isArray(c1.notes), 'Missing container created with empty arrays');

  const c2 = ensureResearchContainer(bare);
  assert(c2 === c1, 'Second call is idempotent (same container)');

  const corrupt = { id: 'p2', research: 'garbage' };
  const c3 = ensureResearchContainer(corrupt);
  assert(Array.isArray(c3.references) && Array.isArray(c3.notes), 'Corrupt research field replaced safely');

  const preserved = { id: 'p3', research: { references: [{ id: 'r1', title: 'T', category: 'other', tags: [] }], notes: [{ id: 'n1', text: 'N' }] } };
  const c4 = ensureResearchContainer(preserved);
  assert(c4.references.length === 1 && c4.notes.length === 1, 'Existing entries preserved by enrichment');

  let threw = false;
  try { ensureResearchContainer(null); } catch { threw = true; }
  assert(threw, 'Null project rejected loudly');
}

// 5. Tag collection
{
  const refs = [
    { tags: ['daylight', 'Library'] },
    { tags: ['daylight', 'courtyard'] },
    { tags: [] },
    {}
  ];
  const tags = collectReferenceTags(refs);
  assert(
    tags.length === 3 && tags[0] === 'courtyard' && tags[1] === 'daylight' && tags[2] === 'library',
    'Tags collected: lowercased, unique, sorted', tags
  );
}

// 6. Filtering: category + multi-token AND-match
{
  const refs = [
    { title: 'Exeter Library', category: 'precedent', architect: 'Kahn', tags: ['daylight'] },
    { title: 'Salk Institute', category: 'case_study', architect: 'Kahn', summary: 'laboratories' },
    { title: 'Neufert Data', category: 'standard', summary: 'dimensional handbook' }
  ];

  const byCat = filterReferences(refs, { category: 'precedent' });
  assert(byCat.length === 1 && byCat[0].title === 'Exeter Library', 'Category filter works');

  const byToken = filterReferences(refs, { tokens: ['kahn'] });
  assert(byToken.length === 2, 'Token search matches architect across categories', byToken.length);

  const byAnd = filterReferences(refs, { tokens: ['kahn', 'laboratories'] });
  assert(byAnd.length === 1 && byAnd[0].title === 'Salk Institute', 'Multi-token AND-match works', byAnd.map(r => r.title));

  const combined = filterReferences(refs, { tokens: ['handbook'], category: 'standard' });
  assert(combined.length === 1 && combined[0].title === 'Neufert Data', 'Tokens + category combine');

  const badCat = filterReferences(refs, { category: 'nonsense' });
  assert(badCat.length === 3, 'Invalid category ignored (treated as no filter)');

  const notArray = filterReferences(null, { tokens: ['x'] });
  assert(notArray.length === 0, 'Null reference list handled');
}

// 7. Snapshot counts coverage
{
  const project = { id: 'p', metadata: { name: 'P' } };
  const research = ensureResearchContainer(project);
  research.references.push(
    { title: 'A', category: 'precedent', tags: ['x'] },
    { title: 'B', category: 'precedent', tags: ['y'] },
    { title: 'C', category: 'material', tags: [] }
  );
  research.notes.push({ text: 'note one' }, { text: 'note two' });

  const snap = researchSnapshot(project);
  assert(snap.totalReferences === 3, 'Snapshot counts references', snap.totalReferences);
  assert(snap.totalNotes === 2, 'Snapshot counts notes');
  assert(snap.byCategory.precedent === 2 && snap.byCategory.material === 1, 'Per-category counts correct', snap.byCategory);
  assert(
    snap.categoriesCovered.length === 2 && snap.categoriesCovered.includes('precedent') && snap.categoriesCovered.includes('material'),
    'Covered categories derived from real data'
  );
  assert(
    snap.categoriesEmpty.includes('case_study') && snap.categoriesEmpty.includes('standard'),
    'Empty categories reported honestly'
  );
  assert(snap.tags.length === 2, 'Tag cloud in snapshot');
}

// 8. Starter pack honesty
{
  assert(RESEARCH_STARTER_PACK.length >= 6, 'Starter pack has a meaningful set of entries', RESEARCH_STARTER_PACK.length);
  for (const s of RESEARCH_STARTER_PACK) {
    assert(typeof s.title === 'string' && s.title.length > 0, `Starter "${s.title}" has a title`);
    assert(REFERENCE_CATEGORY_IDS.includes(s.category), `Starter "${s.title}" uses a valid category`, s.category);
    assert(typeof s.takeaway === 'string' && s.takeaway.length > 0, `Starter "${s.title}" carries a takeaway (why it matters)`);
    assert(Array.isArray(s.tags) && s.tags.length > 0, `Starter "${s.title}" is tagged for search`);
  }
  // The pack must contain real canonical works (spot-check)
  const titles = RESEARCH_STARTER_PACK.map(s => s.title.toLowerCase());
  assert(titles.includes('villa savoye'), 'Pack includes Villa Savoye');
  assert(titles.includes("neufert architects' data"), 'Pack includes Neufert');
  // The view must NOT auto-add: pack entries have no id (creation assigns one)
  for (const s of RESEARCH_STARTER_PACK) {
    assert(!Object.isFrozen(s) === false, `Starter "${s.title}" is frozen (immutable seed)`);
  }
}

// 9. View files exist and register in the build manifest
{
  const manifest = fs.readFileSync(path.join(rootDir, 'scripts', 'build.js'), 'utf8');
  assert(manifest.includes('research.js'), 'Build manifest includes the Research core module');
  assert(manifest.includes('research-dashboard.js'), 'Build manifest includes the dashboard view');
  assert(manifest.includes('research-library.js'), 'Build manifest includes the library view');
  assert(manifest.includes('standards-explorer.js'), 'Build manifest includes the standards view');

  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  for (const id of ['research_dashboard', 'research_library', 'standards_explorer']) {
    assert(html.includes(`id="mode-view-${id}"`), `index.html has view container for "${id}"`);
  }
  assert(html.includes('id="research-dashboard"'), 'index.html has the dashboard host');
  assert(html.includes('id="research-library"'), 'index.html has the library host');
  assert(html.includes('id="standards-explorer"'), 'index.html has the standards host');
}

// 10. Standards Explorer renders the REAL engine values (contract with building-codes)
{
  const codes = await import(pathToFileURL(path.join(rootDir, 'src', 'core', 'building-codes.js')).href);
  const jnbc = codes.getBuildingCode('jnbc');
  const codeCount = codes.listBuildingCodes().length;
  assert(codeCount === 7, 'Seven jurisdictions in the live engine', codeCount);
  assert(typeof jnbc.stair.riserMaxMm === 'number' && jnbc.stair.riserMaxMm === 175, 'JNBC stair riser max is the real 175mm');
  assert(!!jnbc.ramp.citation, 'Ramp discipline carries a legal citation');
  const view = fs.readFileSync(path.join(rootDir, 'src', 'ui', 'views', 'standards-explorer.js'), 'utf8');
  assert(view.includes('listBuildingCodes') && view.includes('getBuildingCode'), 'Standards Explorer reads the live engine (not hardcoded data)');
  assert(!view.includes('riserMaxMm: 175'), 'No hardcoded numeric copies of code values in the view');
}

console.log(`\n${failed === 0 ? '✅' : '❌'} research.test.js: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
