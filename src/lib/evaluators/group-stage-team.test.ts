import { describe, it, expect } from "vitest";
import { evaluateGroupStageTeam } from "./group-stage-team";
import type { GroupStageContext } from "./types";

describe("evaluateGroupStageTeam", () => {
  const baseConfig = {
    winnerPoints: 10,
    advancePoints: 5,
  };

  it("awards full points when predicted team wins group", () => {
    const context: GroupStageContext = {
      prediction: { teamResultId: 1 },
      actual: {
        winnerTeamId: 1,
        advancedTeamIds: [1, 2, 3],
      },
      config: baseConfig,
    };

    expect(evaluateGroupStageTeam(context)).toBe(10);
  });

  it("awards advance points when team advances but doesn't win", () => {
    const context: GroupStageContext = {
      prediction: { teamResultId: 2 },
      actual: {
        winnerTeamId: 1,
        advancedTeamIds: [1, 2, 3],
      },
      config: baseConfig,
    };

    expect(evaluateGroupStageTeam(context)).toBe(5);
  });

  it("awards zero points when team doesn't advance", () => {
    const context: GroupStageContext = {
      prediction: { teamResultId: 4 },
      actual: {
        winnerTeamId: 1,
        advancedTeamIds: [1, 2, 3],
      },
      config: baseConfig,
    };

    expect(evaluateGroupStageTeam(context)).toBe(0);
  });

  it("handles null prediction", () => {
    const context: GroupStageContext = {
      prediction: { teamResultId: null },
      actual: {
        winnerTeamId: 1,
        advancedTeamIds: [1, 2, 3],
      },
      config: baseConfig,
    };

    expect(evaluateGroupStageTeam(context)).toBe(0);
  });

  it("handles empty advanced teams array", () => {
    const context: GroupStageContext = {
      prediction: { teamResultId: 1 },
      actual: {
        winnerTeamId: null,
        advancedTeamIds: [],
      },
      config: baseConfig,
    };

    expect(evaluateGroupStageTeam(context)).toBe(0);
  });

  it("awards winner points even if team is in advanced teams", () => {
    const context: GroupStageContext = {
      prediction: { teamResultId: 1 },
      actual: {
        winnerTeamId: 1,
        advancedTeamIds: [1, 2, 3], // Winner is also in advanced list
      },
      config: baseConfig,
    };

    // Should award winner points, not advance points
    expect(evaluateGroupStageTeam(context)).toBe(10);
  });

  it("works with custom config values", () => {
    const customConfig = {
      winnerPoints: 20,
      advancePoints: 8,
    };

    const context: GroupStageContext = {
      prediction: { teamResultId: 2 },
      actual: {
        winnerTeamId: 1,
        advancedTeamIds: [1, 2, 3],
      },
      config: customConfig,
    };

    expect(evaluateGroupStageTeam(context)).toBe(8);
  });
});
