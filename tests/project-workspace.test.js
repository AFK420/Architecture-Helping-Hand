/**
 * Architecture Helping Hand - Project Workspace Test Suite
 * Phase 2: multi-project library, snapshots, import validation.
 * Uses the real project store with an in-memory adapter.
 */

import { createProjectStore } from '../src/services/store.js';
import { createProject, PROJECT_LIBRARY_KEY, PROJECT_STORE_KEY } from '../src/core/project.js';

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
  }
}

function assertEqual(actual, expected, message) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message} (Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)})`);
  }
}

console.log('🧪 Running tests/project-workspace.test.js...');

function makeStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map
  };
}

// ---------------------------------------------------------------------------
// 1. Multi-project library
// ---------------------------------------------------------------------------
console.log('\n--- 1. Multi-project library ---');

{
  const storage = makeStorage();
  const store = createProjectStore({ storage });

  // Empty library
  const empty = store.listProjects();
  assert(empty.ok && empty.projects.length === 0, 'Empty library lists zero projects');

  // Create + save two projects
  store.createNewProject({ id: 'proj-a', name: 'Casa A' });
  assert(store.saveProjectToLibrary().ok, 'Project A saved to library');
  store.createNewProject({ id: 'proj-b', name: 'Casa B' });
  store.updateProject(d => { d.notes.push({ id: 'n1', title: 'T', body: 'B' }); return d; });
  assert(store.saveProjectToLibrary().ok, 'Project B saved to library');

  const list = store.listProjects();
  assertEqual(list.projects.length, 2, 'Library lists both projects');
  assert(list.projects.some(p => p.id === 'proj-a' && p.name === 'Casa A'), 'Project A summary present');
  assert(list.projects.some(p => p.id === 'proj-b' && p.name === 'Casa B'), 'Project B summary present');

  // Open project A back
  const opened = store.loadProjectFromLibrary('proj-a');
  assert(opened.ok && opened.project.id === 'proj-a', 'Project A re-opened from library');
  assertEqual(store.getProject().metadata.name, 'Casa A', 'In-memory current replaced by opened project');

  // Missing id
  assert(!store.loadProjectFromLibrary('proj-zzz').ok, 'Unknown id reported as not found');
  assert(!store.loadProjectFromLibrary('').ok, 'Empty id rejected');
}

{
  // Library survives store recreation (persistence)
  const storage = makeStorage();
  const store1 = createProjectStore({ storage });
  store1.createNewProject({ id: 'proj-persist', name: 'Persisted' });
  store1.saveProjectToLibrary();

  const store2 = createProjectStore({ storage });
  const list = store2.listProjects();
  assert(list.projects.some(p => p.id === 'proj-persist'), 'Library persists across store instances');
  assert(store2.loadProjectFromLibrary('proj-persist').ok, 'Persisted project reopens');
}

{
  // Delete removes library copy, active envelope untouched
  const storage = makeStorage();
  const store = createProjectStore({ storage });
  store.createNewProject({ id: 'proj-del', name: 'Doomed Copy' });
  store.saveProjectToLibrary();
  assert(store.deleteProject('proj-del').ok, 'Library copy deleted');
  assert(store.listProjects().projects.length === 0, 'Library empty after delete');
  assert(!store.deleteProject('proj-del').ok, 'Deleting a missing id fails cleanly');
}

{
  // Corrupted library → controlled failure, not a crash
  const storage = makeStorage();
  storage.setItem(PROJECT_LIBRARY_KEY, '{broken!!');
  const store = createProjectStore({ storage });
  const res = store.listProjects();
  assert(!res.ok && res.projects.length === 0, 'Corrupted library reported, empty list returned');
  // Corrupted single entry skipped
  storage.setItem(PROJECT_LIBRARY_KEY, JSON.stringify({ version: 1, projects: {
    good: createProject({ id: 'good', name: 'Good' }),
    bad: { id: '' }
  }}));
  const res2 = createProjectStore({ storage }).listProjects();
  assert(res2.projects.length === 1 && res2.projects[0].id === 'good', 'Corrupted library entry skipped, valid kept');
}

// ---------------------------------------------------------------------------
// 2. Snapshots (structured copies)
// ---------------------------------------------------------------------------
console.log('\n--- 2. Snapshots ---');

{
  const storage = makeStorage();
  const store = createProjectStore({ storage, generateId: () => 'proj-snap' });
  store.createNewProject({ name: 'Snapshot Study' });
  store.updateProject(d => { d.metadata.description = 'version 1'; return d; });

  const snap1 = store.createSnapshot('Existing');
  assert(snap1.ok && snap1.snapshotId, 'Snapshot created');

  // Change the project after snapshot (floors container arrives with the
  // Plan Canvas phase; here use metadata + dimensions to avoid speculative
  // containers in the model)
  store.updateProject(d => { d.metadata.description = 'version 2'; d.dimensions.push({ id: 'dim-x', name: 'New wall' }); return d; });
  assertEqual(store.getProject().metadata.description, 'version 2', 'Project changed after snapshot');

  // Restore
  const restored = store.restoreSnapshot(snap1.snapshotId);
  assert(restored.ok, 'Snapshot restored');
  assertEqual(store.getProject().metadata.description, 'version 1', 'Restored project matches snapshot state');
  assertEqual(store.getProject().dimensions.length, 0, 'Post-snapshot dimension removed by restore');

  // The snapshot itself survives restoration (structured copy, not move)
  assert(store.getProject().snapshots.some(s => s.id === snap1.snapshotId), 'Snapshot preserved inside restored project');
}

{
  // Snapshot validation
  const storage = makeStorage();
  const store = createProjectStore({ storage });
  assert(!store.createSnapshot().ok, 'Snapshot requires a project (no project open)');
  store.createNewProject({ id: 'proj-snap2' });
  assert(store.createSnapshot().ok, 'Snapshot works with a label-less call once project is open');
  assert(!store.restoreSnapshot('missing').ok, 'Restoring missing snapshot fails cleanly');
}

{
  // P14 hardening: snapshot embedding must stay LINEAR in document size.
  // Regression pin — the original implementation embedded the whole doc
  // (including prior snapshots WITH their payloads) into every new
  // snapshot, growing O(n²) until localStorage quota broke persistence
  // around snapshot 9-10 on a real project.
  const storage = makeStorage();
  const store = createProjectStore({ storage, generateId: () => 'proj-snap-linear' });
  store.createNewProject({ name: 'Linear Snapshots' });
  const sizes = [];
  for (let i = 1; i <= 6; i++) {
    store.updateProject(d => { d.notes.push({ id: `n${i}`, title: 't', body: 'x'.repeat(1000) }); return d; });
    const r = store.createSnapshot(`snap ${i}`);
    const s = store.getProject().snapshots.find(x => x.id === r.snapshotId);
    sizes.push(JSON.stringify(s).length);
  }
  // Linear growth: each step adds ~document size (~1.1KB), not the
  // cumulative sum. The last step must add far less than doubling.
  const lastStep = sizes[5] - sizes[4];
  assert(lastStep < 5000, `Snapshot embedding grows linearly (last step +${lastStep} bytes, was +40912 before the fix)`);
  // Every snapshot still carries a restorable payload
  assert(store.getProject().snapshots.every(s => s.project), 'Every snapshot keeps a restorable payload');

  // Restore the MIDDLE snapshot: payloads of still-existing snapshots survive
  const snap1 = store.getProject().snapshots[0].id;
  const restored = store.restoreSnapshot(snap1);
  assert(restored.ok, 'Restore after payload-stripping works');
  assert(store.getProject().snapshots.some(s => s.id === snap1 && s.project), 'Snapshot payload survives its own restore (re-attached by id)');
}

// ---------------------------------------------------------------------------
// 3. Active envelope untouched by library operations
// ---------------------------------------------------------------------------
console.log('\n--- 3. Envelope/library separation ---');

{
  const storage = makeStorage();
  const store = createProjectStore({ storage });
  store.createNewProject({ id: 'proj-active', name: 'Active' });
  store.saveProject(); // active envelope

  store.createNewProject({ id: 'proj-other', name: 'Other' });
  store.saveProjectToLibrary();
  store.deleteProject('proj-other');

  // Active envelope still readable
  const store2 = createProjectStore({ storage });
  const loaded = store2.loadProject();
  assert(loaded.ok && loaded.project && loaded.project.id === 'proj-active', 'Deleting a library copy does not touch the active envelope');
  assert(storage.getItem(PROJECT_STORE_KEY).includes('proj-active'), 'Active envelope key intact');
}

console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
