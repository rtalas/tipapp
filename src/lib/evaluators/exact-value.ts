import type { SpecialBetContext } from "./types";

/**
 * EXACT_VALUE: Awards points if predicted value matches actual value exactly
 * Used for numeric predictions (e.g., number of goals, cards)
 */
export function evaluateExactValue(context: SpecialBetContext): boolean {
  const { prediction, actual } = context;

  if (
    prediction.value === null ||
    prediction.value === undefined ||
    actual.value === null ||
    actual.value === undefined
  ) {
    return false;
  }

  return prediction.value === actual.value;
}
