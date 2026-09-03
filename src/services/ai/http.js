/**
 * Architecture Helping Hand - AI HTTP Boundary
 * Phase 15 (M1): the ONLY module in the repository that performs AI network
 * fetches. Transports (services/ai/transports/*) call these helpers; nothing
 * else in core/, ai/, or ui/ may touch fetch for AI traffic.
 *
 * Contract:
 *  - fetchImpl is injectable (tests bind a deterministic mock — automated
 *    suites NEVER hit the network, rule 55/76)
 *  - timeouts are enforced per request via AbortController
 *  - responses resolve to { ok, status, statusText, headers, json } — the
 *    caller (transport) maps status/errors into the AI error taxonomy
 *  - API keys are passed by the caller per request and are NEVER logged or
 *    stored here
 */

/** Default timeout for one AI HTTP request (ms). Generative calls are slow. */
export const DEFAULT_AI_HTTP_TIMEOUT_MS = 60000;

/** Shorter timeout for lightweight calls (connection tests, model lists). */
export const QUICK_AI_HTTP_TIMEOUT_MS = 20000;

/**
 * Creates the AI HTTP client. One instance is shared by all transports so
 * the injection point stays singular.
 *
 * @param {Object} [options]
 * @param {Function} [options.fetchImpl] - (url, init) => Promise<Response>;
 *   defaults to global fetch when available
 * @param {Function} [options.now] - clock override (tests)
 */
export function createAiHttp(options = {}) {
  const fetchImpl = options.fetchImpl || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null);
  const now = options.now || (() => Date.now());
  if (!fetchImpl) {
    // No fetch environment (very old sandbox): every request fails controlled.
    return {
      available: false,
      async request() {
        return { ok: false, kind: 'network', message: 'Network transport unavailable in this environment.' };
      }
    };
  }

  /**
   * Performs one request.
   *
   * @param {Object} req
   * @param {string} req.url
   * @param {Object} [req.init] - fetch init (method, headers, body)
   * @param {number} [req.timeoutMs]
   * @returns {Promise<Object>} { ok, kind?, status?, statusText?, json?, text?, message? }
   *   ok=true  → status/statusText/json|text populated
   *   ok=false → kind: 'network' | 'timeout', message for the UI
   */
  async function request(req) {
    const { url, init = {}, timeoutMs = DEFAULT_AI_HTTP_TIMEOUT_MS } = req || {};
    if (typeof url !== 'string' || !url) {
      return { ok: false, kind: 'network', message: 'AI request requires a URL.' };
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timedOut = false;
    let timer = null;
    if (controller) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    }
    let response;
    try {
      response = await fetchImpl(url, controller ? { ...init, signal: controller.signal } : init);
    } catch (err) {
      if (timedOut) {
        return { ok: false, kind: 'timeout', message: 'AI request timed out.' };
      }
      return { ok: false, kind: 'network', message: `Network error: ${err?.message || 'request failed'}` };
    } finally {
      if (timer) clearTimeout(timer);
    }

    const status = response.status;
    // Parse the body defensively: JSON first, raw text fallback.
    let body = null;
    let text = null;
    try {
      text = await response.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch (e) {
          body = null; // non-JSON body — keep text for diagnostics
        }
      }
    } catch (e) {
      // Body unreadable — status still carries the outcome
    }
    return { ok: response.ok, status, statusText: response.statusText || '', json: body, text };
  }

  return { available: true, request, now };
}
