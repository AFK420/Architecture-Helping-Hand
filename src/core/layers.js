/**
 * Architecture Helping Hand - CAD Layer Management Engine
 * Standard AIA / ISO 13567 architectural layer definitions, visibility/lock states,
 * and entity layer resolution.
 */

export const DEFAULT_CAD_LAYERS = [
  { id: 'A-WALL', name: 'Walls', kinds: ['wall'], color: '#4989D9', lineweight: 0.35, visible: true, locked: false, printable: true },
  { id: 'A-DOOR', name: 'Doors', kinds: ['door'], color: '#F59E0B', lineweight: 0.25, visible: true, locked: false, printable: true },
  { id: 'A-GLAZ', name: 'Windows / Glazing', kinds: ['window'], color: '#06B6D4', lineweight: 0.25, visible: true, locked: false, printable: true },
  { id: 'A-AREA', name: 'Rooms / Areas', kinds: ['room'], color: '#10B981', lineweight: 0.18, visible: true, locked: false, printable: true },
  { id: 'A-FLOR-STRS', name: 'Stairs & Ramps', kinds: ['stair', 'ramp'], color: '#EC4899', lineweight: 0.25, visible: true, locked: false, printable: true },
  { id: 'A-FURN', name: 'Furniture', kinds: ['furniture'], color: '#8B5CF6', lineweight: 0.18, visible: true, locked: false, printable: true },
  { id: 'A-DIMS', name: 'Dimensions', kinds: ['dimension'], color: '#38BDF8', lineweight: 0.18, visible: true, locked: false, printable: true },
  { id: 'A-ANNO-TEXT', name: 'Text & Notes', kinds: ['text', 'leader'], color: '#E5E7EB', lineweight: 0.18, visible: true, locked: false, printable: true },
  { id: 'A-ANNO-TAGS', name: 'Tags & Callouts', kinds: ['room_tag', 'door_tag', 'window_tag', 'north_arrow', 'section_cut'], color: '#FBBF24', lineweight: 0.18, visible: true, locked: false, printable: true },
  { id: 'A-GRID', name: 'Grid & Guidelines', kinds: ['grid', 'grid_line', 'column'], color: '#6B7280', lineweight: 0.13, visible: true, locked: false, printable: true }
];

export const EXTENDED_CAD_LAYERS = [
  ...DEFAULT_CAD_LAYERS,
  { id: 'A-SECT', name: 'Building Sections', kinds: ['section_cut'], color: '#F87171', lineweight: 0.50, visible: true, locked: false, printable: true },
  { id: 'A-ELEV', name: 'Building Elevations', kinds: ['elevation'], color: '#60A5FA', lineweight: 0.25, visible: true, locked: false, printable: true },
  { id: 'A-LEVL', name: 'Level Datums', kinds: ['datum'], color: '#A78BFA', lineweight: 0.18, visible: true, locked: false, printable: true }
];

export function cloneDefaultLayers() {
  return DEFAULT_CAD_LAYERS.map(l => ({ ...l, kinds: [...(l.kinds || [])] }));
}

/**
 * Normalizes document layers.
 * If doc.layers is a legacy boolean map (e.g. { walls: true, doors: false, ... })
 * or missing, it is safely upgraded to an array of layer objects.
 * If already an array, ensures standard default layers exist and are intact.
 * @param {Object} doc - Document object
 * @returns {Array<Object>} Normalized layer definitions array
 */
export function normalizeDocumentLayers(doc) {
  if (!doc) return cloneDefaultLayers();

  // Legacy format: dictionary of booleans
  if (doc.layers && !Array.isArray(doc.layers) && typeof doc.layers === 'object') {
    const legacy = doc.layers;
    const layers = cloneDefaultLayers();
    for (const l of layers) {
      if (l.id === 'A-WALL' && legacy.walls !== undefined) l.visible = Boolean(legacy.walls);
      else if (l.id === 'A-DOOR' && legacy.doors !== undefined) l.visible = Boolean(legacy.doors);
      else if (l.id === 'A-GLAZ' && legacy.windows !== undefined) l.visible = Boolean(legacy.windows);
      else if (l.id === 'A-AREA' && legacy.rooms !== undefined) l.visible = Boolean(legacy.rooms);
      else if (l.id === 'A-FURN' && legacy.furniture !== undefined) l.visible = Boolean(legacy.furniture);
      else if (l.id === 'A-DIMS' && legacy.dimensions !== undefined) l.visible = Boolean(legacy.dimensions);
      else if (l.id === 'A-ANNO-TEXT' && legacy.textNotes !== undefined) l.visible = Boolean(legacy.textNotes);
      else if (l.id === 'A-GRID' && legacy.grid !== undefined) l.visible = Boolean(legacy.grid);
    }
    doc.layers = layers;
    return layers;
  }

  if (Array.isArray(doc.layers) && doc.layers.length > 0) {
    // Ensure all standard layers exist
    const defaults = cloneDefaultLayers();
    for (const def of defaults) {
      if (!doc.layers.some(l => l.id === def.id)) {
        doc.layers.push(def);
      }
    }
    return doc.layers;
  }

  const layers = cloneDefaultLayers();
  doc.layers = layers;
  return layers;
}

/**
 * Resolves which layer an entity belongs to.
 * Checks entity.layerId first. If unset or invalid, falls back to the default layer
 * for the entity's kind.
 * @param {Object} entity
 * @param {Array<Object>} [layers]
 * @returns {Object} Layer definition
 */
export function resolveEntityLayer(entity, layers = DEFAULT_CAD_LAYERS) {
  if (!entity || typeof entity !== 'object') return DEFAULT_CAD_LAYERS[0];
  const layerList = Array.isArray(layers)
    ? (layers.length > 0 ? layers : DEFAULT_CAD_LAYERS)
    : (layers && Array.isArray(layers.layers) && layers.layers.length > 0 ? layers.layers : DEFAULT_CAD_LAYERS);

  // 1. Explicit layer assignment
  if (entity.layerId) {
    const matched = layerList.find(l => l.id === entity.layerId);
    if (matched) return matched;
  }

  // 2. Kind-based matching
  const kind = entity.kind || 'wall';
  const matchedKind = layerList.find(l => Array.isArray(l.kinds) && l.kinds.includes(kind));
  if (matchedKind) return matchedKind;

  // 3. Fallback to first layer
  return layerList[0];
}

/**
 * Checks if an entity is visible based on its document's layer state.
 * @param {Object} entity
 * @param {Object} doc - Document containing layers
 * @returns {boolean}
 */
export function isEntityVisible(entity, doc) {
  if (!entity) return false;
  if (!doc) return true;
  const layers = normalizeDocumentLayers(doc);
  const layer = resolveEntityLayer(entity, layers);
  return layer ? layer.visible !== false : true;
}

/**
 * Checks if an entity is locked (protected against edit/drag/selection).
 * @param {Object} entity
 * @param {Object} doc - Document containing layers
 * @returns {boolean}
 */
export function isEntityLocked(entity, doc) {
  if (!entity) return false;
  if (!doc) return false;
  const layers = normalizeDocumentLayers(doc);
  const layer = resolveEntityLayer(entity, layers);
  return layer ? Boolean(layer.locked) : false;
}

/**
 * Toggles visibility for a specific layer.
 * @param {Object} doc
 * @param {string} layerId
 * @returns {boolean} New visibility state
 */
export function toggleLayerVisibility(doc, layerId) {
  const layers = normalizeDocumentLayers(doc);
  const layer = layers.find(l => l.id === layerId);
  if (!layer) return true;
  layer.visible = !layer.visible;
  return layer.visible;
}

/**
 * Toggles locked state for a specific layer.
 * @param {Object} doc
 * @param {string} layerId
 * @returns {boolean} New locked state
 */
export function toggleLayerLock(doc, layerId) {
  const layers = normalizeDocumentLayers(doc);
  const layer = layers.find(l => l.id === layerId);
  if (!layer) return false;
  layer.locked = !layer.locked;
  return layer.locked;
}

/**
 * Adds a custom user layer to the document.
 * @param {Object} doc
 * @param {Object} layerDef - { id, name, color, lineweight }
 * @returns {Object} Created layer
 */
export function addCustomLayer(doc, layerDef = {}) {
  const layers = normalizeDocumentLayers(doc);
  const id = layerDef.id || `CUSTOM-${Date.now().toString(36)}`;
  if (layers.some(l => l.id === id)) {
    throw new Error(`Layer with id "${id}" already exists`);
  }
  const newLayer = {
    id,
    name: layerDef.name || id,
    kinds: Array.isArray(layerDef.kinds) ? layerDef.kinds : [],
    color: layerDef.color || '#E5E7EB',
    lineweight: typeof layerDef.lineweight === 'number' ? layerDef.lineweight : 0.25,
    visible: layerDef.visible !== false,
    locked: Boolean(layerDef.locked),
    printable: layerDef.printable !== false,
    isCustom: true
  };
  layers.push(newLayer);
  return newLayer;
}

/**
 * Deletes a custom layer from the document. Standard layers cannot be deleted.
 * @param {Object} doc
 * @param {string} layerId
 * @returns {boolean} True if deleted
 */
export function deleteCustomLayer(doc, layerId) {
  const layers = normalizeDocumentLayers(doc);
  const idx = layers.findIndex(l => l.id === layerId);
  if (idx === -1) return false;
  if (!layers[idx].isCustom) {
    throw new Error('Standard architectural CAD layers cannot be deleted');
  }
  layers.splice(idx, 1);
  return true;
}

/**
 * Assigns an entity to a specific layer.
 * @param {Object} entity
 * @param {string} layerId
 */
export function setEntityLayer(entity, layerId) {
  if (!entity || typeof entity !== 'object') return;
  entity.layerId = layerId;
}
