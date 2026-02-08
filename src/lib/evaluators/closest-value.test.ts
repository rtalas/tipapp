import { describe, it, expect } from "vitest";
import { evaluateClosestValue } from "./closest-value";
import type { ClosestValueContext } from "./types";

describe("evaluateClosestValue", () => {
  it("should return 0.33 (1/3 points) when user has the closest prediction (not exact)", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [5, 10, 20, 25], // 10 is closest (diff: 2)
    };

    expect(evaluateClosestValue(context)).toBeCloseTo(1 / 3, 5);
  });

  it("should return 1.0 (full points) when user guessed exact value", () => {
    const context: ClosestValueContext = {
      prediction: { value: 12 },
      actual: { value: 12 },
      allPredictions: [10, 12, 15],
    };

    // Exact match gets full points (multiplier 1.0)
    expect(evaluateClosestValue(context)).toBe(1.0);
  });

  it("should return 0 when another user is closer", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [5, 10, 11, 20], // 11 is closer (diff: 1 vs 2)
    };

    expect(evaluateClosestValue(context)).toBe(0);
  });

  it("should return 0.33 when tied for closest (multiple winners)", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [8, 10, 14, 20], // Both 10 and 14 are closest (diff: 2)
    };

    expect(evaluateClosestValue(context)).toBeCloseTo(1 / 3, 5);
  });

  it("should handle negative differences correctly", () => {
    const context: ClosestValueContext = {
      prediction: { value: 15 },
      actual: { value: 12 },
      allPredictions: [5, 10, 15, 25], // 10 is at -2, 15 is at +3
    };

    expect(evaluateClosestValue(context)).toBe(0);
  });

  it("should return 0 when no predictions available", () => {
    const context: ClosestValueContext = {
      prediction: { value: 10 },
      actual: { value: 12 },
      allPredictions: [],
    };

    expect(evaluateClosestValue(context)).toBe(0);
  });

  it("should award full points for exact match even when others are also exact", () => {
    const context: ClosestValueContext = {
      prediction: { value: 100 },
      actual: { value: 100 },
      allPredictions: [100, 100, 95, 105], // Multiple exact matches
    };

    // All exact matches get full points
    expect(evaluateClosestValue(context)).toBe(1.0);
  });
});
