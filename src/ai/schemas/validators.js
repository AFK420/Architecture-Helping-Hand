/**
 * Architecture Helping Hand - AI Schemas & Validators
 * Phase 9.10-9.13: structured response validation, trust classification,
 * numeric fact-checking. The model's output is UNTRUSTED — everything is
 * validated before rendering and numeric claims are compared with core.
 */

/** Trust classification labels (stable contract). */
export const TRUST_LEVELS = Object.freeze([
  'CALCULATED', 'FACT', 'REFERENCE', 'INFERENCE',
  'DESIGN JUDGMENT', 'SPECULATION', 'UNKNOWN', 'NEEDS VERIFICATION'
]);

/**
 * Structured critic schema: every finding carries evidence, severity,
 * recommendation, alternative, trade-off, and a next test.
 */
export const CRITIC_RESPONSE_SCHEMA = Object.freeze({
  summary: { type: 'string' },
  verdict: { type: 'string' },
  findings: {
    type: 'array',
    item: {
      title: { type: 'string', required: true },
      severity: { type: 'string', enum: ['high', 'medium', 'low'] },
      observation: { type: 'string', required: true },
      evidence: { type: 'array', required: true },
      whyItMatters: { type: 'string', required: true },
      recommendation: { type: 'string', required: true },
      alternative: { type: 'string' },
      tradeOff: { type: 'string' },
      testNext: { type: 'string', required: true },
      trust: { type: 'string' }
    }
  }
});

/** Minimal structural validator (no dependencies). */
export function validateStructuredResponse(response, schema) {
  if (!response || typeof response !== 'object') {
    return { ok: false, errors: ['Response must be an object'] };
  }
  const errors = [];
  for (const [key, spec] of Object.entries(schema)) {
    const value = response[key];
    if (spec.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`"${key}" must be an array`);
        continue;
      }
      if (spec.item) {
        value.forEach((item, idx) => {
          for (const [ik, ispec] of Object.entries(spec.item)) {
            if (ispec.required && item[ik] === undefined) {
              errors.push(`"${key}[${idx}].${ik}" missing`);
            } else if (item[ik] !== undefined && ispec.type === 'string' && typeof item[ik] !== 'string') {
              errors.push(`"${key}[${idx}].${ik}" must be a string`);
            } else if (item[ik] !== undefined && ispec.type === 'array' && !Array.isArray(item[ik])) {
              errors.push(`"${key}[${idx}].${ik}" must be an array`);
            } else if (item[ik] !== undefined && ispec.enum && !ispec.enum.includes(item[ik])) {
              errors.push(`"${key}[${idx}].${ik}" must be one of: ${ispec.enum.join(', ')}`);
            }
          }
        });
      }
    } else if (spec.type === 'string') {
      if (typeof value !== 'string') errors.push(`"${key}" must be a string`);
    } else if (spec.type === 'number') {
      if (typeof value !== 'number' || !isFinite(value)) errors.push(`"${key}" must be a finite number`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Numeric claim validation: extracts "number + unit" claims from AI text and
 * compares them against the deterministic facts pack. Claim-centric: a claim
 * passes if it matches ANY known fact (within tolerance); otherwise, if there
 * are facts of the same unit family, it is flagged NEEDS VERIFICATION.
 * This implements "AI SUGGESTS. CORE VERIFIES." mechanically.
 *
 * @param {string} aiText - the model's prose
 * @param {Array<{label: string, value: number, unit?: string, tolerancePercent?: number}>} facts
 * @returns {{ claims: Array, mismatches: Array }}
 */
export function validateNumericClaims(aiText, facts) {
  const claims = [];
  const mismatches = [];
  const text = String(aiText || '');
  const factList = (facts || []).filter(f => typeof f.value === 'number' && isFinite(f.value));

  // Matches: 14.2 m² | 14.2m² | 14.2 m2 | 3.2 m | 2800 mm | 12.5 %
  const re = /(-?\d+(?:[.,]\d+)?)\s*(m2|m²|m3|m³|mm|cm|m|km|ft|in|%)/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const rawValue = parseFloat(match[1].replace(',', '.'));
    const claim = { text: match[0], value: rawValue, unit: match[2].toLowerCase() };
    claims.push(claim);

    // Normalize the claim's unit token so 'm²' and 'm2' both match an 'm2' fact
    const normalizedUnit = claim.unit === 'm²' ? 'm2' : claim.unit;
    const matchingFacts = factList.filter(f => factClaimUnits(f).includes(normalizedUnit));
    if (matchingFacts.length === 0) continue; // nothing to check against
    const matched = matchingFacts.some(fact => {
      const normalized = normalizeClaimToFact(claim, fact);
      if (normalized === null) return false;
      const tolerance = fact.tolerancePercent !== undefined ? fact.tolerancePercent : 2;
      const diff = Math.abs(normalized - fact.value);
      return diff <= fact.value * (tolerance / 100) + 1e-9;
    });
    if (!matched) {
      mismatches.push({
        factLabel: matchingFacts.map(f => f.label).join(' | '),
        factValue: matchingFacts[0].value,
        claimText: claim.text,
        claimValue: claim.value,
        classification: 'NEEDS VERIFICATION',
        note: `AI claimed ${claim.text} but no deterministic fact matches it (known: ${matchingFacts.map(f => `${f.label}=${f.value}`).join(', ')}).`
      });
    }
  }
  return { claims, mismatches };
}

function factClaimUnits(fact) {
  const unit = (fact.unit || '').toLowerCase();
  if (/m2|sq/.test(unit)) return ['m2', 'm²'];
  if (unit === 'mm') return ['mm', 'm'];
  if (unit === 'cm') return ['cm', 'm'];
  if (unit === '%') return ['%'];
  return ['m', 'mm', 'cm'];
}

/** Normalizes a claim's value into the fact's unit; null when incompatible. */
function normalizeClaimToFact(claim, fact) {
  const fuRaw = (fact.unit || '').toLowerCase();
  const fu = fuRaw === 'm²' ? 'm2' : fuRaw;
  const cuRaw = claim.unit;
  const cu = cuRaw === 'm²' ? 'm2' : cuRaw;
  if (fu === cu) return claim.value;
  if (fu === 'mm') return cu === 'm' ? claim.value * 1000 : (cu === 'cm' ? claim.value * 10 : null);
  if (fu === 'cm') return cu === 'm' ? claim.value * 100 : (cu === 'mm' ? claim.value / 10 : null);
  if (fu === 'm') return cu === 'mm' ? claim.value / 1000 : (cu === 'cm' ? claim.value / 100 : null);
  return null;
}

/**
 * Trust classifier: given an AI statement's provenance metadata, produce the
 * label. Modes tag their output; unknown provenance = UNKNOWN.
 */
export function classifyTrust(provenance) {
  if (!provenance) return 'UNKNOWN';
  if (provenance.calculatedByCore) return 'CALCULATED';
  if (provenance.fromProjectData) return 'FACT';
  if (provenance.fromReference) return 'REFERENCE';
  if (provenance.fromReasoning) return 'INFERENCE';
  if (provenance.fromJudgment) return 'DESIGN JUDGMENT';
  if (provenance.speculative) return 'SPECULATION';
  return 'UNKNOWN';
}
