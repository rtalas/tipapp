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

  describe("requiresUserMark (3rd-place bets)", () => {
    const markConfig = {
      winnerPoints: 7,
      advancePoints: 4,
      requiresUserMark: true,
    };

    it("awards advance points when user marked team and team advanced", () => {
      const context: GroupStageContext = {
        prediction: { teamResultId: 2, markedAsAdvancing: true },
        actual: { winnerTeamId: 1, advancedTeamIds: [1, 2, 3] },
        config: markConfig,
      };
      expect(evaluateGroupStageTeam(context)).toBe(4);
    });

    it("awards zero when team advanced but user did not mark", () => {
      const context: GroupStageContext = {
        prediction: { teamResultId: 2, markedAsAdvancing: false },
        actual: { winnerTeamId: 1, advancedTeamIds: [1, 2, 3] },
        config: markConfig,
      };
      expect(evaluateGroupStageTeam(context)).toBe(0);
    });

    it("awards zero when markedAsAdvancing is null/undefined", () => {
      const context: GroupStageContext = {
        prediction: { teamResultId: 2, markedAsAdvancing: null },
        actual: { winnerTeamId: 1, advancedTeamIds: [1, 2, 3] },
        config: markConfig,
      };
      expect(evaluateGroupStageTeam(context)).toBe(0);
    });

    it("still awards winner points when team is the position result, even without mark", () => {
      const context: GroupStageContext = {
        prediction: { teamResultId: 1, markedAsAdvancing: false },
        actual: { winnerTeamId: 1, advancedTeamIds: [1, 2, 3] },
        config: markConfig,
      };
      expect(evaluateGroupStageTeam(context)).toBe(7);
    });
  });

  describe("advancePoints: 0 (4th-place bets)", () => {
    const noAdvanceConfig = {
      winnerPoints: 7,
      advancePoints: 0,
    };

    it("awards 7 points when 4th-place tip is exact", () => {
      const context: GroupStageContext = {
        prediction: { teamResultId: 4 },
        actual: { winnerTeamId: 4, advancedTeamIds: [1, 2, 3] },
        config: noAdvanceConfig,
      };
      expect(evaluateGroupStageTeam(context)).toBe(7);
    });

    it("awards zero when 4th-place tip team actually advanced", () => {
      // User tipped team 1 as 4th, but team 1 actually finished 1st (advanced).
      // No consolation — tipping 4th = tipping non-advance.
      const context: GroupStageContext = {
        prediction: { teamResultId: 1 },
        actual: { winnerTeamId: 4, advancedTeamIds: [1, 2, 3] },
        config: noAdvanceConfig,
      };
      expect(evaluateGroupStageTeam(context)).toBe(0);
    });
  });
});
