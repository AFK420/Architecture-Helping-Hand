/**
 * Architecture Helping Hand - Unified Output Formatter
 * Precision number formatting, scientific notation thresholds, and architectural feet-inch conversions.
 */

/**
 * Format a number with exact decimal precision and epsilon stabilization
 * @param {number} val - Input number
 * @param {number} [decimals=3] - Maximum fractional digits
 * @returns {string}
 */
export function formatNumber(val, decimals = 3) {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '0';
  if (val === 0) return '0';

  const abs = Math.abs(val);
  if (abs < 0.00001 || abs >= 1e9) {
    return val.toExponential(4);
  }

  // Stabilize floating-point arithmetic using rounded epsilon
  const factor = Math.pow(10, decimals);
  const stabilized = Math.round((val + Number.EPSILON) * factor) / factor;

  return stabilized.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Converts decimal total inches to architectural feet-and-inches: X'-Y Z/16"
 * @param {number} totalInches - Total dimension in inches
 * @param {number} [precision=16] - Fraction denominator (default 16 for 1/16")
 * @returns {string}
 */
export function formatFeetInches(totalInches, precision = 16) {
  if (isNaN(totalInches) || !isFinite(totalInches)) return '0"';
  
  const isNegative = totalInches < 0;
  const total = Math.abs(totalInches);
  const feet = Math.floor(total / 12);
  const inches = total % 12;
  const wholeInches = Math.floor(inches);
  const fraction = inches - wholeInches;

  // Round to nearest fraction denominator (e.g. 16ths)
  let num16 = Math.round(fraction * precision);
  let den = precision;

  let extraInches = 0;
  if (num16 === den) {
    extraInches = 1;
    num16 = 0;
  }

  const finalInches = wholeInches + extraInches;
  let finalFeet = feet;
  let displayInches = finalInches;

  if (displayInches >= 12) {
    finalFeet += Math.floor(displayInches / 12);
    displayInches = displayInches % 12;
  }

  // Reduce fraction to lowest terms
  let fracStr = '';
  if (num16 > 0) {
    while (num16 % 2 === 0 && den % 2 === 0) {
      num16 /= 2;
      den /= 2;
    }
    fracStr = `${num16}/${den}`;
  }

  let inchPart = '';
  if (displayInches > 0 || fracStr) {
    if (fracStr && displayInches > 0) {
      inchPart = `${displayInches} ${fracStr}"`;
    } else if (fracStr) {
      inchPart = `${fracStr}"`;
    } else {
      inchPart = `${displayInches}"`;
    }
  }

  const sign = isNegative ? '-' : '';

  if (finalFeet > 0) {
    return sign + `${finalFeet}'-${inchPart || '0"'}`;
  }
  return sign + (inchPart || '0"');
}
