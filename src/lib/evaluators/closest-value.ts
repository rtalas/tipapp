import type { ClosestValueContext } from "./types";

/**
 * CLOSEST_VALUE: Awards points based on prediction accuracy
 * Returns a point multiplier:
 * - Exact match: 1.0 (full points)
 * - Closest (but not exact): 0.4 (2/5 points)
 * - Not closest: 0 (no points)
 *
 * Use case: Hard-to-guess values (e.g., "How many viewers will watch this game?")
 * - Set evaluator points to the exact match reward (e.g., 50 points)
 * - Exact match gets full 50 points
 * - Closest (not exact) gets 20 points (2/5 of 50)
 */
export function evaluateClosestValue(context: ClosestValueContext): number {
  const { prediction, actual, allPredictions } = context;

  if (allPredictions.length === 0) {
    return 0;
  }

  // Calculate absolute differences for all predictions
  const userDiff = Math.abs(prediction.value - actual.value);

  // Check if user got exact value
  if (userDiff === 0) {
    return 1.0; // Full points for exact match
  }

  // Check if user's prediction is the closest (or tied for closest)
  const minDiff = Math.min(
    ...allPredictions.map((pred) => Math.abs(pred - actual.value))
  );

  if (userDiff === minDiff) {
    return 0.4; // 2/5 points for being closest (but not exact)
  }

  return 0; // No points for not being closest
}
