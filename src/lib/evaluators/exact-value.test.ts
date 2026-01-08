import { describe, it, expect } from "vitest";
import { evaluateExactValue } from "./exact-value";
import type { SpecialBetContext } from "./types";

describe("evaluateExactValue", () => {
  it("should return true when predicted value matches actual value", () => {
    const context: SpecialBetContext = {
      prediction: { value: 15 },
      actual: { value: 15 },
    };

    expect(evaluateExactValue(context)).toBe(true);
  });

  it("should return false when values do not match", () => {
    const context: SpecialBetContext = {
      prediction: { value: 15 },
      actual: { value: 16 },
    };

    expect(evaluateExactValue(context)).toBe(false);
  });

  it("should handle zero values correctly", () => {
    const context: SpecialBetContext = {
      prediction: { value: 0 },
      actual: { value: 0 },
    };

    expect(evaluateExactValue(context)).toBe(true);
  });

  it("should return false when no value was predicted", () => {
    const context: SpecialBetContext = {
      prediction: { value: null },
      actual: { value: 15 },
    };

    expect(evaluateExactValue(context)).toBe(false);
  });
});
