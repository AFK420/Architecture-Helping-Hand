/**
 * Architecture Helping Hand - Unified Input Parser
 * Robust parsing of architectural notations, fractions, feet-inches, decimals, and attached units.
 */

import { UNITS } from './units.js';

/**
 * Normalized Parse Result Structure
 * @typedef {Object} ParseResult
 * @property {number} value - Numeric value in the recognized or default unit
 * @property {string|null} detectedUnit - Explicit unit key if found in the input string (e.g. 'cm', 'm')
 * @property {boolean} isValid - Whether input was successfully parsed into a finite number
 * @property {string|null} error - Description of parse error if invalid
 */

/**
 * Parse an architectural input string into a structured measurement
 * @param {string|number} input - Raw user input
 * @param {Object} [options]
 * @param {boolean} [options.allowNegative=false] - Whether negative values are permissible
 * @returns {ParseResult}
 */
export function parseInput(input, options = {}) {
  const { allowNegative = false } = options;

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return { value: 0, detectedUnit: null, isValid: false, error: 'Non-finite numeric value' };
    }
    if (!allowNegative && input < 0) {
      return { value: 0, detectedUnit: null, isValid: false, error: 'Negative dimensions are not valid' };
    }
    return { value: input, detectedUnit: null, isValid: true, error: null };
  }

  if (input === null || input === undefined || typeof input !== 'string') {
    return { value: 0, detectedUnit: null, isValid: false, error: 'Empty or invalid input type' };
  }

  const trimmed = input.trim().replace(/,/g, '');
  if (trimmed === '') {
    return { value: 0, detectedUnit: null, isValid: false, error: 'Input is empty' };
  }

  // 1. Check for attached unit suffix (e.g. "15.5cm", "2.4m", "100mm", "12in", "6ft", "12abc")
  const unitSuffixMatch = trimmed.match(/^([+-]?(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+))\s*([a-zA-Z²³_]+)$/);
  let rawNumericPart = trimmed;
  let detectedUnit = null;

  if (unitSuffixMatch) {
    const candidateUnit = unitSuffixMatch[2].toLowerCase();
    if (UNITS[candidateUnit]) {
      rawNumericPart = unitSuffixMatch[1];
      detectedUnit = candidateUnit;
    } else {
      return { value: 0, detectedUnit: null, isValid: false, error: `Unknown unit suffix: "${unitSuffixMatch[2]}"` };
    }
  }

  // 2. Check for Feet & Inches pattern (e.g. 12' 6", 12'-6 1/2", 12'6, 8', 6")
  // Handles architectural hyphen separators like 12'-6"
  const feetInchesMatch = rawNumericPart.match(/^([+-]?\d+(?:\.\d+)?)\s*['′]\s*[-–—]?\s*(?:(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)\s*["″]?\s*)?$/);
  if (feetInchesMatch) {
    const feetRaw = parseFloat(feetInchesMatch[1]);
    const isNegative = feetInchesMatch[1].startsWith('-');
    const feet = Math.abs(isNaN(feetRaw) ? 0 : feetRaw);
    let inches = 0;
    if (feetInchesMatch[2]) {
      const parsedInch = parseFraction(feetInchesMatch[2]);
      if (isNaN(parsedInch)) {
        return { value: 0, detectedUnit: 'in', isValid: false, error: `Invalid inch fraction: "${feetInchesMatch[2]}"` };
      }
      inches = Math.abs(parsedInch);
    }
    const totalInches = (feet * 12 + inches) * (isNegative ? -1 : 1);

    if (!allowNegative && totalInches < 0) {
      return { value: 0, detectedUnit: 'in', isValid: false, error: 'Negative dimensions are not valid' };
    }
    return { value: totalInches, detectedUnit: 'in', isValid: true, error: null };
  }

  // 3. Standalone inch pattern: e.g. 6 1/2" or 12"
  const onlyInchesMatch = rawNumericPart.match(/^([+-]?(?:\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+))\s*["″]$/);
  if (onlyInchesMatch) {
    const inches = parseFraction(onlyInchesMatch[1]);
    if (isNaN(inches)) {
      return { value: 0, detectedUnit: 'in', isValid: false, error: 'Could not parse inch fraction' };
    }
    if (!allowNegative && inches < 0) {
      return { value: 0, detectedUnit: 'in', isValid: false, error: 'Negative dimensions are not valid' };
    }
    return { value: inches, detectedUnit: 'in', isValid: true, error: null };
  }

  // 4. Standard Fraction or Decimal: e.g. "3 1/2", "5/8", "12.75"
  const parsedVal = parseFraction(rawNumericPart);

  if (isNaN(parsedVal) || !isFinite(parsedVal)) {
    return { value: 0, detectedUnit: null, isValid: false, error: 'Could not parse numeric expression' };
  }

  if (!allowNegative && parsedVal < 0) {
    return { value: 0, detectedUnit: detectedUnit, isValid: false, error: 'Negative dimensions are not valid' };
  }

  return { value: parsedVal, detectedUnit: detectedUnit, isValid: true, error: null };
}

/**
 * Parses fractional strings like "3 1/2", "5/8", "0.75"
 * Returns NaN if input is malformed or invalid.
 */
export function parseFraction(str) {
  if (typeof str === 'number') return isFinite(str) ? str : NaN;
  if (!str || typeof str !== 'string') return NaN;

  const clean = str.trim();
  if (!clean) return NaN;

  // Reject strings containing multiple slashes (e.g. 1/2/3) or invalid characters
  const slashCount = (clean.match(/\//g) || []).length;
  if (slashCount > 1) return NaN;

  const parts = clean.split(/\s+/);

  if (parts.length === 2) {
    // Check whole number: must be purely numeric (e.g. "3")
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(parts[0])) return NaN;
    const whole = parseFloat(parts[0]);
    if (isNaN(whole)) return NaN;

    // Check fraction part (e.g. "1/2")
    if (!/^\d+\/\d+$/.test(parts[1])) return NaN;
    const fracParts = parts[1].split('/');
    if (fracParts.length === 2) {
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (isNaN(num) || isNaN(den) || den === 0) return NaN;
      return whole >= 0 ? whole + (num / den) : whole - (num / den);
    }
    return NaN;
  } else if (parts.length === 1) {
    if (parts[0].includes('/')) {
      if (!/^[+-]?\d+\/\d+$/.test(parts[0])) return NaN;
      const fracParts = parts[0].split('/');
      if (fracParts.length === 2) {
        const num = parseFloat(fracParts[0]);
        const den = parseFloat(fracParts[1]);
        if (isNaN(num) || isNaN(den) || den === 0) return NaN;
        return num / den;
      }
      return NaN;
    }
    // Pure decimal/integer test (reject e.g. "12abc" or "15..5")
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(parts[0])) return NaN;
    const val = parseFloat(parts[0]);
    return isNaN(val) ? NaN : val;
  }

  return NaN;
}

/**
 * Legacy compatibility wrapper for existing code
 */
export function parseArchitecturalInput(inputStr) {
  const res = parseInput(inputStr, { allowNegative: false });
  return res.isValid ? res.value : 0;
}
