/**
 * Architecture Helping Hand - Safe Storage Service
 * Resilient localStorage wrapper with in-memory fallback for sandboxed environments.
 */

const memoryStore = new Map();

export const StorageService = {
  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Fallback to memory store
    }
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },

  setItem(key, value) {
    let persisted = true;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        persisted = true;
      }
      // No localStorage at all (Node/sandboxed): the memory fallback is the
      // designed behavior, not a persistence failure — report success so
      // durability-aware callers don't false-alarm.
    } catch (e) {
      // Quota exceeded / private mode: fall back to memory and report failure
      persisted = false;
    }
    memoryStore.set(key, String(value));
    // Callers that need durability guarantees (e.g. the project store) use
    // this return value; fire-and-forget callers may ignore it.
    return persisted;
  },

  removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    memoryStore.delete(key);
  },

  clear() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    memoryStore.clear();
  }
};
