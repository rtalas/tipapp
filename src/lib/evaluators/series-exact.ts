import type { SeriesBetContext } from "./types";

/**
 * SERIES_EXACT: Awards points if series result matches exactly
 */
export function evaluateSeriesExact(context: SeriesBetContext): boolean {
  const { prediction, actual } = context;

  if (
    prediction.homeTeamScore === null ||
    prediction.awayTeamScore === null ||
    actual.homeTeamScore === null ||
    actual.awayTeamScore === null
  ) {
    return false;
  }

  return (
    prediction.homeTeamScore === actual.homeTeamScore &&
    prediction.awayTeamScore === actual.awayTeamScore
  );
}
