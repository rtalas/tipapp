import { describe, it, expect } from "vitest";
import { evaluateClosestValue } from "./closest-value";
import type { ClosestValueContext } from "./types";

describe("evaluateClosestValue", () => {
  it("should return true when user has the closest prediction", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [5, 10, 20, 25], // 10 is closest (diff: 2)
    };

    expect(evaluateClosestValue(context)).toBe(true);
  });

  it("should return false when user guessed exact value (they get exact_value points instead)", () => {
    const context: ClosestValueContext = {
      prediction: { value: 12 },
      actual: { value: 12 },
      allPredictions: [10, 12, 15],
    };

    expect(evaluateClosestValue(context)).toBe(false);
  });

  it("should return false when another user is closer", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [5, 10, 11, 20], // 11 is closer (diff: 1 vs 2)
    };

    expect(evaluateClosestValue(context)).toBe(false);
  });

  it("should return true when tied for closest (multiple winners)", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [8, 10, 14, 20], // Both 10 and 14 are closest (diff: 2)
    };

    expect(evaluateClosestValue(context)).toBe(true);
  });

  it("should handle negative differences correctly", () => {
    const context: ClosestValueContext = {
      prediction: { value: 15 },
      actual: { value: 12 },
      allPredictions: [5, 10, 15, 25], // 10 is at -2, 15 is at +3
    };

    expect(evaluateClosestValue(context)).toBe(false);
  });

  it("should return false when no predictions available", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [],
    };

    expect(evaluateClosestValue(context)).toBe(false);
  });
});
