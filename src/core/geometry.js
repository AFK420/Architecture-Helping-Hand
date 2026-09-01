/**
 * Architecture Helping Hand - Architectural Geometry Engine
 * Pure mathematical functions for 2D architectural shapes, perimeters, areas, diagonals, and polygons.
 */

import { requireUnit } from './units.js';
import { requireFiniteNumber } from './calculator.js';

/**
 * Calculate geometric properties of an architectural rectangle (room, wall, floor slab)
 * @param {Object} params
 * @param {number} params.width - Width dimension (> 0)
 * @param {number} params.length - Length dimension (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ area: number, perimeter: number, diagonal: number }}
 */
export function calcRectangle({ width, length, unitKey = 'm' } = {}) {
  requireFiniteNumber(width, 'width');
  requireFiniteNumber(length, 'length');
  requireUnit(unitKey, 'length');

  if (width <= 0 || length <= 0) {
    throw new Error('Rectangle width and length must be strictly greater than 0');
  }

  const area = width * length;
  const perimeter = 2 * (width + length);
  const diagonal = Math.sqrt(width * width + length * length);

  return {
    area,
    perimeter,
    diagonal
  };
}

/**
 * Calculate geometric properties of an architectural circle (round column, circular window, fountain)
 * @param {Object} params
 * @param {number} params.radius - Radius (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ diameter: number, circumference: number, area: number }}
 */
export function calcCircle({ radius, unitKey = 'm' } = {}) {
  requireFiniteNumber(radius, 'radius');
  requireUnit(unitKey, 'length');

  if (radius <= 0) {
    throw new Error('Circle radius must be strictly greater than 0');
  }

  const diameter = 2 * radius;
  const circumference = 2 * Math.PI * radius;
  const area = Math.PI * radius * radius;

  return {
    diameter,
    circumference,
    area
  };
}

/**
 * Calculate geometric properties of a triangle using Heron's formula
 * @param {Object} params
 * @param {number} params.a - First side length (> 0)
 * @param {number} params.b - Second side length (> 0)
 * @param {number} params.c - Third side length (> 0)
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ perimeter: number, area: number }}
 */
export function calcTriangle({ a, b, c, unitKey = 'm' } = {}) {
  requireFiniteNumber(a, 'a');
  requireFiniteNumber(b, 'b');
  requireFiniteNumber(c, 'c');
  requireUnit(unitKey, 'length');

  if (a <= 0 || b <= 0 || c <= 0) {
    throw new Error('Triangle side lengths must be strictly greater than 0');
  }

  // Triangle Inequality Theorem: sum of any two sides must be strictly greater than the third
  if (a + b <= c || a + c <= b || b + c <= a) {
    throw new Error(`Triangle inequality violated: sides (${a}, ${b}, ${c}) cannot form a valid triangle`);
  }

  const perimeter = a + b + c;
  const s = perimeter / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));

  return {
    perimeter,
    area
  };
}

/**
 * Calculate geometric properties of a 2D planar polygon using the Shoelace formula
 * @param {Object} params
 * @param {Array<{ x: number, y: number }>} params.vertices - Ordered list of vertices
 * @param {string} [params.unitKey='m'] - Dimensional unit key
 * @returns {{ perimeter: number, area: number }}
 */
export function calcPolygon({ vertices, unitKey = 'm' } = {}) {
  if (!Array.isArray(vertices)) {
    throw new TypeError('calcPolygon expects vertices to be an array of {x, y} coordinate objects');
  }

  if (vertices.length < 3) {
    throw new Error(`Polygon must have at least 3 vertices (received ${vertices.length})`);
  }

  requireUnit(unitKey, 'length');

  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const v = vertices[i];
    if (!v || typeof v !== 'object') {
      throw new TypeError(`Vertex at index ${i} is not a valid object`);
    }
    requireFiniteNumber(v.x, `vertex[${i}].x`);
    requireFiniteNumber(v.y, `vertex[${i}].y`);
  }

  let doubleArea = 0;
  let perimeter = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    // Shoelace formula term
    doubleArea += (xi * yj) - (xj * yi);

    // Euclidean distance between adjacent vertices
    const dx = xj - xi;
    const dy = yj - yi;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  const area = Math.abs(doubleArea) / 2;

  if (area === 0) {
    throw new Error('Degenerate polygon: vertices are collinear or form a zero-area polygon');
  }

  return {
    perimeter,
    area
  };
}
