import { describe, it, expect } from "vitest";
import { evaluateExactPlayer } from "./exact-player";
import type { SpecialBetContext } from "./types";

describe("evaluateExactPlayer", () => {
  it("should return true when predicted player matches actual player", () => {
    const context: SpecialBetContext = {
      prediction: { playerResultId: 123 },
      actual: { playerResultId: 123 },
    };

    expect(evaluateExactPlayer(context)).toBe(true);
  });

  it("should return false when players do not match", () => {
    const context: SpecialBetContext = {
      prediction: { playerResultId: 123 },
      actual: { playerResultId: 456 },
    };

    expect(evaluateExactPlayer(context)).toBe(false);
  });

  it("should return false when no player was predicted", () => {
    const context: SpecialBetContext = {
      prediction: { playerResultId: null },
      actual: { playerResultId: 123 },
    };

    expect(evaluateExactPlayer(context)).toBe(false);
  });

  it("should return false when actual player is not set", () => {
    const context: SpecialBetContext = {
      prediction: { playerResultId: 123 },
      actual: { playerResultId: null },
    };

    expect(evaluateExactPlayer(context)).toBe(false);
  });
});
