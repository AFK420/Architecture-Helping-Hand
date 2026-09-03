/**
 * Architecture Helping Hand - Transport Registry (Phase 15)
 * Binds provider ids to their network adapters. Adding a provider = a
 * directory entry + a transport + (optionally) a default test model; no
 * other code changes anywhere in the app.
 */

import { createGeminiTransport } from './gemini.js';
import { createOpenAiCompatTransport } from './openai-compat.js';

/**
 * Creates all transports over one shared HTTP client.
 * @param {Object} options
 * @param {Object} options.http - AI HTTP client from services/ai/http.js
 */
export function createTransports(options = {}) {
  const http = options.http;
  if (!http || typeof http.request !== 'function') {
    throw new Error('createTransports requires an AI HTTP client');
  }
  const transports = {
    gemini: createGeminiTransport({ http }),
    glm: createOpenAiCompatTransport({ http, providerId: 'glm' }),
    deepseek: createOpenAiCompatTransport({ http, providerId: 'deepseek' })
  };
  return {
    get(providerId) {
      return transports[providerId] || null;
    },
    ids() {
      return Object.keys(transports);
    }
  };
}
