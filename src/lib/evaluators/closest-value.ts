import type { ClosestValueContext } from "./types";

/**
 * CLOSEST_VALUE: Awards points if user's prediction was the closest among all users
 * Only evaluated if exact_value is false
 */
export function evaluateClosestValue(context: ClosestValueContext): boolean {
  const { prediction, actual, allPredictions } = context;

  if (allPredictions.length === 0) {
    return false;
  }

  // Calculate absolute differences for all predictions
  const userDiff = Math.abs(prediction.value - actual.value);

  // If user got exact value, they don't get closest_value points (they get exact_value points)
  if (userDiff === 0) {
    return false;
  }

  // Check if user's prediction is the closest (or tied for closest)
  const minDiff = Math.min(
    ...allPredictions.map((pred) => Math.abs(pred - actual.value))
  );

  return userDiff === minDiff;
}
