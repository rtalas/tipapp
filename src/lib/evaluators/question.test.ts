import { describe, it, expect } from "vitest";
import { evaluateQuestion } from "./question";

describe("evaluateQuestion", () => {
  it("should return true when string answers match", () => {
    expect(evaluateQuestion("yes", "yes")).toBe(true);
  });

  it("should return false when string answers do not match", () => {
    expect(evaluateQuestion("yes", "no")).toBe(false);
  });

  it("should return true when numeric answers match", () => {
    expect(evaluateQuestion(42, 42)).toBe(true);
  });

  it("should return false when numeric answers do not match", () => {
    expect(evaluateQuestion(42, 43)).toBe(false);
  });

  it("should return true when boolean answers match", () => {
    expect(evaluateQuestion(true, true)).toBe(true);
    expect(evaluateQuestion(false, false)).toBe(true);
  });

  it("should return false when boolean answers do not match", () => {
    expect(evaluateQuestion(true, false)).toBe(false);
  });

  it("should be case-sensitive for strings", () => {
    expect(evaluateQuestion("Yes", "yes")).toBe(false);
  });
});
