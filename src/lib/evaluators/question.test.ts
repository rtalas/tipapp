import { describe, it, expect } from "vitest";
import { evaluateQuestion, type QuestionContext } from "./question";

describe("evaluateQuestion", () => {
  it("should return 1.0 (full points) when answer is correct (yes)", () => {
    const context: QuestionContext = {
      prediction: { answer: 'yes' },
      actual: { correctAnswer: 'yes' }
    };
    expect(evaluateQuestion(context)).toBe(1.0);
  });

  it("should return 1.0 (full points) when answer is correct (no)", () => {
    const context: QuestionContext = {
      prediction: { answer: 'no' },
      actual: { correctAnswer: 'no' }
    };
    expect(evaluateQuestion(context)).toBe(1.0);
  });

  it("should return -0.5 (negative half points) when answer is wrong", () => {
    const context: QuestionContext = {
      prediction: { answer: 'yes' },
      actual: { correctAnswer: 'no' }
    };
    expect(evaluateQuestion(context)).toBe(-0.5);
  });

  it("should return -0.5 when predicting no but correct is yes", () => {
    const context: QuestionContext = {
      prediction: { answer: 'no' },
      actual: { correctAnswer: 'yes' }
    };
    expect(evaluateQuestion(context)).toBe(-0.5);
  });

  it("should return 0 (no points) when user did not pick", () => {
    const context: QuestionContext = {
      prediction: { answer: null },
      actual: { correctAnswer: 'yes' }
    };
    expect(evaluateQuestion(context)).toBe(0);
  });

  it("should return 0 when user did not pick and correct answer is no", () => {
    const context: QuestionContext = {
      prediction: { answer: null },
      actual: { correctAnswer: 'no' }
    };
    expect(evaluateQuestion(context)).toBe(0);
  });
});
