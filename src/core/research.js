/**
 * Architecture Helping Hand — Research Domain Model (Phase F)
 * Pure, deterministic research entities + project-container helpers.
 *
 * The Research workspace answers: "What do I need to know before I start
 * designing?" It stores two kinds of things:
 *   1. REFERENCES — architectural precedents, case studies, materials,
 *      standards documents, links. Categorized, tagged, citable, saved into
 *      the project so every workspace can reach them later.
 *   2. RESEARCH NOTES — timestamped observations with source provenance
 *      (distinct from general project `notes`).
 *
 * Storage contract: entries live on the project document under
 * `research: { references: [], notes: [] }`. Old projects without the
 * container are enriched defensively by `ensureResearchContainer` (pure —
 * input object is never replaced, only the missing field is added), so no
 * schema migration is required: v3 projects simply gain an optional field.
 */

// ---------------------------------------------------------------------------
// Reference model
// ---------------------------------------------------------------------------

/** Frozen category list — UI pills and validation derive from this. */
export const REFERENCE_CATEGORIES = Object.freeze([
  { id: 'precedent', label: 'Precedent', desc: 'Buildings studied before design' },
  { id: 'case_study', label: 'Case Study', desc: 'Deep analysis of one work' },
  { id: 'material', label: 'Material', desc: 'Material research and specs' },
  { id: 'standard', label: 'Standard / Code', desc: 'Regulations and standards' },
  { id: 'typology', label: 'Building Type', desc: 'Typology research' },
  { id: 'site_context', label: 'Site / Context', desc: 'Climate, culture, context' },
  { id: 'article', label: 'Article / Book', desc: 'Reading and theory' },
  { id: 'other', label: 'Other', desc: 'Anything else worth keeping' }
]);

export const REFERENCE_CATEGORY_IDS = Object.freeze(REFERENCE_CATEGORIES.map(c => c.id));

/** Stable reference id (timestamp + random suffix, same scheme as projects). */
export function generateReferenceId() {
  return `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a validated reference record. Unknown category falls back to
 * 'other' (never throws — research input is user-messy by nature; validation
 * reports problems instead).
 * @param {object} input
 * @returns {{ ok: boolean, errors: string[], reference: object|null }}
 */
export function createReference(input = {}) {
  const errors = [];
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) errors.push('title is required');
  if (title.length > 200) errors.push('title must be 200 characters or fewer');

  const category = REFERENCE_CATEGORY_IDS.includes(input.category) ? input.category : 'other';

  const url = typeof input.url === 'string' ? input.url.trim() : '';
  if (url && !/^(https?:\/\/|www\.)/i.test(url)) {
    errors.push('url must start with http://, https://, or www.');
  }

  const tags = Array.isArray(input.tags)
    ? input.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 12)
    : [];

  if (errors.length > 0) return { ok: false, errors, reference: null };

  return {
    ok: true,
    errors: [],
    reference: Object.freeze({
      id: typeof input.id === 'string' && input.id ? input.id : generateReferenceId(),
      title,
      category,
      architect: typeof input.architect === 'string' ? input.architect.trim() : '',
      year: Number.isFinite(input.year) ? input.year : null,
      location: typeof input.location === 'string' ? input.location.trim() : '',
      url,
      summary: typeof input.summary === 'string' ? input.summary.trim() : '',
      takeaway: typeof input.takeaway === 'string' ? input.takeaway.trim() : '',
      tags,
      author: typeof input.author === 'string' ? input.author.trim() : '',
      publisher: typeof input.publisher === 'string' ? input.publisher.trim() : '',
      publicationDate: typeof input.publicationDate === 'string' ? input.publicationDate.trim() : '',
      retrievedAt: typeof input.retrievedAt === 'string' ? input.retrievedAt.trim() : '',
      citationText: typeof input.citationText === 'string' ? input.citationText.trim() : '',
      imageAttribution: typeof input.imageAttribution === 'string' ? input.imageAttribution.trim() : '',
      notes: typeof input.notes === 'string' ? input.notes.trim() : '',
      verification: input.verification === 'verified' ? 'verified' : 'unverified',
      createdAt: input.createdAt || new Date().toISOString()
    })
  };
}

// ---------------------------------------------------------------------------
// Research note model
// ---------------------------------------------------------------------------

/** Stable research-note id. */
export function generateResearchNoteId() {
  return `rn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a validated research note (observation + source provenance).
 * @returns {{ ok: boolean, errors: string[], note: object|null }}
 */
export function createResearchNote(input = {}) {
  const errors = [];
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) errors.push('text is required');
  if (text.length > 5000) errors.push('text must be 5000 characters or fewer');

  if (errors.length > 0) return { ok: false, errors, note: null };

  return {
    ok: true,
    errors: [],
    note: Object.freeze({
      id: typeof input.id === 'string' && input.id ? input.id : generateResearchNoteId(),
      text,
      topic: typeof input.topic === 'string' ? input.topic.trim() : '',
      source: typeof input.source === 'string' ? input.source.trim() : '',
      createdAt: input.createdAt || new Date().toISOString()
    })
  };
}

// ---------------------------------------------------------------------------
// Project container helpers
// ---------------------------------------------------------------------------

/**
 * Returns the research container of a project, creating the canonical empty
 * one when missing. Pure with respect to the project id: it only ensures the
 * `research` field exists (the store persists on the next save).
 * @param {object} project
 * @returns {object} { references: [], notes: [] }
 */
export function ensureResearchContainer(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error('ensureResearchContainer requires a project object');
  }
  if (!project.research || typeof project.research !== 'object' || Array.isArray(project.research)) {
    project.research = { references: [], notes: [] };
  }
  if (!Array.isArray(project.research.references)) project.research.references = [];
  if (!Array.isArray(project.research.notes)) project.research.notes = [];
  return project.research;
}

/** All tags currently in use across a project's references (lowercased, unique, sorted).
 *  Defensive: raw/imported entries may carry un-normalized tags. */
export function collectReferenceTags(references) {
  const set = new Set();
  for (const r of Array.isArray(references) ? references : []) {
    for (const t of r.tags || []) set.add(String(t).trim().toLowerCase());
  }
  return Array.from(set).filter(Boolean).sort();
}

/**
 * Filters references. tokens = AND-match over title/summary/takeaway/architect/
 * location/tags/category label. category = exact category id (skipped when falsy).
 */
export function filterReferences(references, { tokens = [], category = '' } = {}) {
  const list = Array.isArray(references) ? references : [];
  const lower = tokens.map(t => String(t).toLowerCase()).filter(Boolean);
  const catValid = REFERENCE_CATEGORY_IDS.includes(category) ? category : '';
  return list.filter(ref => {
    if (catValid && ref.category !== catValid) return false;
    if (lower.length === 0) return true;
    const catLabel = REFERENCE_CATEGORIES.find(c => c.id === ref.category)?.label || '';
    const hay = [ref.title, ref.summary, ref.takeaway, ref.architect, ref.location, catLabel,
      ...(ref.tags || [])].join(' ').toLowerCase();
    return lower.every(t => hay.includes(t));
  });
}

/**
 * Research progress snapshot for the dashboard: counts by category, tag
 * cloud, note count, and a per-category "covered / empty" map — derived
 * from real data, never invented.
 */
export function researchSnapshot(project) {
  const research = ensureResearchContainer(project);
  const refs = research.references;
  const byCategory = {};
  for (const c of REFERENCE_CATEGORIES) byCategory[c.id] = 0;
  for (const r of refs) {
    if (byCategory[r.category] === undefined) byCategory[r.category] = 0;
    byCategory[r.category]++;
  }
  return {
    totalReferences: refs.length,
    totalNotes: research.notes.length,
    byCategory,
    tags: collectReferenceTags(refs),
    categoriesCovered: REFERENCE_CATEGORIES.filter(c => byCategory[c.id] > 0).map(c => c.id),
    categoriesEmpty: REFERENCE_CATEGORIES.filter(c => byCategory[c.id] === 0).map(c => c.id)
  };
}

// ---------------------------------------------------------------------------
// Research starter pack — honest, expandable seed content
// ---------------------------------------------------------------------------

/**
 * Curated starter references the user can add with one click (they are NOT
 * auto-inserted — the user stays in control). Each entry is a real,
 * well-known architectural work with honest one-line takeaways; the pack is
 * a starting point the user curates, never a fake database claim.
 */
export const RESEARCH_STARTER_PACK = Object.freeze([
  Object.freeze({
    title: 'Towards a New Architecture',
    architect: 'Le Corbusier',
    year: 1923,
    category: 'article',
    location: 'France',
    summary: 'Foundational text on mass-production housing, the Five Points, and the engineer\'s aesthetic.',
    takeaway: 'A standard reference for form-generation arguments in modern housing typologies.',
    tags: ['theory', 'modernism', 'manifesto']
  }),
  Object.freeze({
    title: 'Complexity and Contradiction in Architecture',
    architect: 'Robert Venturi',
    year: 1966,
    category: 'article',
    location: 'USA',
    summary: 'The gentle manifesto against orthodox modernism; "less is a bore".',
    takeaway: 'Use when arguing for layered, ambiguous spatial relationships over pure forms.',
    tags: ['theory', 'post-modernism']
  }),
  Object.freeze({
    title: 'Exeter Library',
    architect: 'Louis I. Kahn',
    year: 1972,
    category: 'precedent',
    location: 'Exeter, New Hampshire, USA',
    summary: 'Central atrium with book stacks in brick outer ring; light studied through the section.',
    takeaway: 'Section-driven daylight strategy and clear servant/served zoning for library programs.',
    tags: ['library', 'daylight', 'section', 'brick']
  }),
  Object.freeze({
    title: 'Villa Savoye',
    architect: 'Le Corbusier',
    year: 1931,
    category: 'precedent',
    location: 'Poissy, France',
    summary: 'The Five Points executed: pilotis, ribbon windows, free plan, free facade, roof garden.',
    takeaway: 'Reference for promenade architectique sequencing and structural/free-plan separation.',
    tags: ['villa', 'modernism', 'promenade', 'five points']
  }),
  Object.freeze({
    title: 'Salk Institute',
    architect: 'Louis I. Kahn',
    year: 1965,
    category: 'case_study',
    location: 'La Jolla, California, USA',
    summary: 'Laboratories flanking a travertine court; study towers rotated for privacy and light.',
    takeaway: 'Laboratory typology: separating study spaces from wet benches while keeping a shared court.',
    tags: ['laboratory', 'courtyard', 'travertine', 'research building']
  }),
  Object.freeze({
    title: 'Rationalist brick — Seagram Building',
    architect: 'Mies van der Rohe',
    year: 1958,
    category: 'material',
    location: 'New York, USA',
    summary: 'Bronze and travertine curtain wall; the plaza as an urban gesture.',
    takeaway: 'Material expression at urban scale: how a facade registers structure and setback codes.',
    tags: ['bronze', 'curtain wall', 'office', 'urban plaza']
  }),
  Object.freeze({
    title: 'Neufert Architects\' Data',
    architect: 'Ernst Neufert',
    year: 1936,
    category: 'standard',
    location: 'Germany',
    summary: 'The canonical dimensional handbook: room sizes, furniture, circulation standards.',
    takeaway: 'First-stop reference for dimensional standards by room type and building type.',
    tags: ['handbook', 'dimensions', 'standards']
  }),
  Object.freeze({
    title: 'Time-Saver Standards for Building Types',
    architect: 'Joseph De Chiara (ed.)',
    year: 1990,
    category: 'standard',
    location: 'USA',
    summary: 'Program area standards and planning matrices across major building types.',
    takeaway: 'Use for early program area targets by building type before local code checks.',
    tags: ['building types', 'program', 'standards', 'areas']
  })
]);
