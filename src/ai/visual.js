/**
 * Architecture Helping Hand - Visual AI Capability Layer (Phase 13)
 * Optional image analysis and concept-image generation behind capability
 * detection. The non-visual application NEVER depends on this.
 *
 * Contract:
 *  - capability detection first; if the provider lacks vision/imageGen,
 *    requests return { available: false, reason } — never a fake result
 *  - image interpretation returns structured observations with confidence
 *    labels; never pretends pixel guesses are exact geometry
 *  - concept images are labelled CONCEPTUAL EXPLORATION / NOT A TECHNICAL
 *    DRAWING in both the data and the UI contract
 */

import { AI_ERROR_CODES } from './providers/provider.js';

export const VISUAL_CAPABILITIES = Object.freeze(['vision', 'imageGen']);

/** What the visual layer can do with a given provider. */
export function visualCapabilities(provider) {
  return {
    sketchInterpretation: !!provider?.capabilities?.vision,
    planImageInterpretation: !!provider?.capabilities?.vision,
    sitePhotoAnalysis: !!provider?.capabilities?.vision,
    conceptImageGeneration: !!provider?.capabilities?.imageGen
  };
}

/**
 * Image interpretation request. Confidence/trust are ALWAYS attached:
 * image analysis is inherently uncertain — it is never treated as geometry.
 */
export async function interpretImage(provider, { imageBase64, mimeType, question }) {
  const caps = visualCapabilities(provider);
  if (!caps.planImageInterpretation) {
    return {
      available: false,
      reason: `Provider "${provider?.label || 'unknown'}" does not declare vision capability. Image interpretation is unavailable — the rest of the application is unaffected.`
    };
  }
  if (!imageBase64) {
    return { available: true, ok: false, errorCode: AI_ERROR_CODES.MISSING_INPUT, message: 'No image provided.' };
  }
  const result = await provider.sendPrompt({
    systemPrompt: `You analyze architectural images (sketches, plans, site photos).
Return STRICT JSON: { "observations": [ { "topic": string, "description": string,
"confidence": "high"|"medium"|"low" } ], "summary": string }.
NEVER present pixel-derived measurements as exact geometry — describe
relationships and likely dimensions with confidence levels only.`,
    userPrompt: `IMAGE (base64 ${mimeType || 'image/png'}) attached. QUESTION: ${question || 'Describe this architectural image.'}`,
    options: { imageBase64, mimeType }
  });
  if (!result.ok) return { available: true, ok: false, ...result };
  return {
    available: true,
    ok: true,
    interpretation: result.text,
    disclaimer: 'AI image interpretation is approximate. Never treat it as measured geometry. Needs Verification.'
  };
}

/**
 * Concept image generation (only when the provider declares imageGen AND
 * the user's free access supports it). Output is labelled conceptual.
 */
export async function generateConceptImage(provider, { prompt }) {
  const caps = visualCapabilities(provider);
  if (!caps.conceptImageGeneration) {
    return {
      available: false,
      reason: `Provider "${provider?.label || 'unknown'}" does not declare image-generation capability. Concept generation is unavailable — the rest of the application is unaffected.`
    };
  }
  const result = await provider.sendPrompt({
    systemPrompt: 'Generate a CONCEPTUAL architectural image. Output is for inspiration only.',
    userPrompt: prompt || 'Conceptual massing study',
    options: { generateImage: true }
  });
  if (!result.ok) return { available: true, ok: false, ...result };
  return {
    available: true,
    ok: true,
    imageBase64: result.imageBase64 || null,
    labels: ['CONCEPTUAL EXPLORATION', 'NOT A TECHNICAL DRAWING', 'NOT CONSTRUCTION DOCUMENTATION']
  };
}
