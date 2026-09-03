/**
 * Architecture Helping Hand - AI Tool Registry
 * Phase 9.7-9.9: declared tools with schemas and permissions. The model
 * can only call registered tools; tool calls never evaluate model-generated
 * code. Every tool executes DETERMINISTIC core functions.
 *
 * Permission tiers:
 *   READ_*  — safe, automatic
 *   PROPOSE_* — returns a proposal object; UI shows Preview/Accept/Reject
 *   APPLY_* — requires explicit user approval (handled by the orchestrator)
 */

/**
 * @param {Object} tools - map of tool implementations keyed by name
 */
export function createToolRegistry(tools = {}) {
  const registry = new Map();
  for (const [name, tool] of Object.entries(tools)) {
    registerTool(registry, name, tool);
  }
  return {
    register(name, tool) { registerTool(registry, name, tool); },
    get: name => registry.get(name) || null,
    list() {
      return Array.from(registry.values()).map(t => ({
        name: t.name, description: t.description, permission: t.permission,
        inputSchema: t.inputSchema
      }));
    },
    /** Executes a tool call with basic argument validation against the schema. */
    async execute(name, args) {
      const tool = registry.get(name);
      if (!tool) {
        return { ok: false, error: `Unknown tool "${name}"` };
      }
      const validation = validateAgainstSchema(args || {}, tool.inputSchema || {});
      if (!validation.ok) {
        return { ok: false, error: `Invalid arguments for ${name}: ${validation.error}` };
      }
      try {
        const result = await tool.handler(args || {});
        return { ok: true, tool: name, permission: tool.permission, result };
      } catch (e) {
        return { ok: false, tool: name, error: e.message };
      }
    }
  };
}

function registerTool(registry, name, tool) {
  if (typeof tool.handler !== 'function') {
    throw new TypeError(`Tool "${name}" needs a handler function`);
  }
  if (!tool.permission) {
    throw new TypeError(`Tool "${name}" needs a permission tier`);
  }
  registry.set(name, Object.freeze({
    name,
    description: tool.description || '',
    permission: tool.permission,
    inputSchema: tool.inputSchema || {},
    handler: tool.handler
  }));
}

/** Minimal schema validation: type + required. (No JSON-schema dep.) */
export function validateAgainstSchema(args, schema) {
  for (const key of Object.keys(schema)) {
    const expected = schema[key];
    const value = args[key];
    if (value === undefined) {
      if (expected.required) return { ok: false, error: `missing "${key}"` };
      continue;
    }
    const actual = Array.isArray(value) ? 'array' : typeof value;
    if (expected.type && actual !== expected.type) {
      return { ok: false, error: `"${key}" must be ${expected.type}, got ${actual}` };
    }
  }
  return { ok: true };
}

/** Permission tier constants. */
export const AI_PERMISSIONS = Object.freeze({
  READ_PROJECT: 'READ_PROJECT',
  READ_GEOMETRY: 'READ_GEOMETRY',
  READ_MEASUREMENTS: 'READ_MEASUREMENTS',
  READ_CALCULATIONS: 'READ_CALCULATIONS',
  PROPOSE_CHANGE: 'PROPOSE_CHANGE',
  PROPOSE_NOTE: 'PROPOSE_NOTE',
  PROPOSE_LAYOUT: 'PROPOSE_LAYOUT',
  APPLY_CHANGE: 'APPLY_CHANGE'
});
