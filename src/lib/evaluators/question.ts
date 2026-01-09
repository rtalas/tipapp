/**
 * QUESTION: Awards points for correctly answering yes/no questions
 * Returns a point multiplier:
 * - Correct answer: 1.0 (full points)
 * - Wrong answer: -0.5 (negative half points)
 * - Not picked: 0 (no points)
 */

export interface QuestionContext {
  prediction: {
    answer: 'yes' | 'no' | null
  }
  actual: {
    correctAnswer: 'yes' | 'no'
  }
}

/**
 * Evaluate a yes/no question bet
 * @returns Point multiplier (1.0 for correct, -0.5 for wrong, 0 for not picked)
 */
export function evaluateQuestion(context: QuestionContext): number {
  // Not picked: 0 points
  if (context.prediction.answer === null) {
    return 0
  }

  // Correct answer: full points (1.0 multiplier)
  if (context.prediction.answer === context.actual.correctAnswer) {
    return 1.0
  }

  // Wrong answer: negative half points (-0.5 multiplier)
  return -0.5
}
