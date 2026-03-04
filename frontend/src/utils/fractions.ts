/**
 * Fraction utilities for corrugated box dimensions.
 * All functions work in 1/16-inch increments, which is the standard
 * precision for box manufacturing measurements.
 */

// Lookup table: sixteenths (0..15) -> [numerator, denominator] in lowest terms
const SIXTEENTHS: [number, number][] = [
  [0, 1],   // 0/16 = 0
  [1, 16],  // 1/16
  [1, 8],   // 2/16 = 1/8
  [3, 16],  // 3/16
  [1, 4],   // 4/16 = 1/4
  [5, 16],  // 5/16
  [3, 8],   // 6/16 = 3/8
  [7, 16],  // 7/16
  [1, 2],   // 8/16 = 1/2
  [9, 16],  // 9/16
  [5, 8],   // 10/16 = 5/8
  [11, 16], // 11/16
  [3, 4],   // 12/16 = 3/4
  [13, 16], // 13/16
  [7, 8],   // 14/16 = 7/8
  [15, 16], // 15/16
];

/**
 * Convert a decimal to a fraction string for display.
 * Supports all 1/16 increments.
 *
 * Examples:
 *   12.375  -> "12-3/8"
 *   0.5     -> "1/2"
 *   12.0    -> "12"
 *   0.0625  -> "1/16"
 *   12.0625 -> "12-1/16"
 */
export function decimalToFraction(value: number): string {
  if (value < 0) return '-' + decimalToFraction(-value);

  const whole = Math.floor(value);
  const fractional = value - whole;

  // Round to nearest 1/16
  const sixteenths = Math.round(fractional * 16);

  // Handle rounding up to next whole number (e.g. 15.97 fractional rounds to 16/16)
  if (sixteenths >= 16) {
    return String(whole + 1);
  }

  if (sixteenths === 0) {
    return String(whole);
  }

  const [num, den] = SIXTEENTHS[sixteenths];
  const fractionPart = `${num}/${den}`;

  if (whole === 0) {
    return fractionPart;
  }

  return `${whole}-${fractionPart}`;
}

/**
 * Parse a fraction string to decimal.
 *
 * Accepted formats:
 *   "12-3/8"   -> 12.375   (mixed fraction)
 *   "3/8"      -> 0.375    (pure fraction)
 *   "12.375"   -> 12.375   (decimal)
 *   "12"       -> 12       (whole number)
 *   " 12 - 3/8 " -> 12.375 (with whitespace)
 *
 * Returns null if the input cannot be parsed or results in an invalid number.
 */
export function fractionToDecimal(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  // Try: mixed fraction "whole-num/den" (the dash separates whole from fraction)
  const mixedMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den === 0) return null;
    return whole + num / den;
  }

  // Try: pure fraction "num/den"
  const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const den = parseInt(fractionMatch[2], 10);
    if (den === 0) return null;
    return num / den;
  }

  // Try: plain number (integer or decimal)
  const parsed = Number(trimmed);
  if (isNaN(parsed)) return null;
  return parsed;
}

/**
 * Check if a decimal value is a clean 1/16 increment.
 * A value is "clean" when value * 16 is very close to an integer,
 * meaning it can be displayed as a reduced fraction without loss.
 */
export function isCleanFraction(value: number): boolean {
  const product = value * 16;
  return Math.abs(product - Math.round(product)) < 0.001;
}
