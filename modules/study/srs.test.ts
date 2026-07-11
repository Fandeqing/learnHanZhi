import { describe, expect, it } from "vitest";
import { CharacterStatus, ReviewRating } from "@prisma/client";
import { calculateSrsUpdate } from "./srs";

const now = new Date("2026-07-11T00:00:00.000Z");

function baseInput(overrides = {}) {
  return {
    rating: ReviewRating.GOOD,
    now,
    currentStatus: CharacterStatus.LEARNING,
    reviewCount: 0,
    successCount: 0,
    consecutiveSuccessCount: 0,
    isMastered: false,
    ...overrides,
  };
}

describe("calculateSrsUpdate", () => {
  it("resets success streak and keeps learning on AGAIN", () => {
    const result = calculateSrsUpdate(
      baseInput({
        rating: ReviewRating.AGAIN,
        consecutiveSuccessCount: 2,
      }),
    );

    expect(result.status).toBe(CharacterStatus.LEARNING);
    expect(result.reviewCount).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.consecutiveSuccessCount).toBe(0);
    expect(result.nextReviewAt.toISOString()).toBe("2026-07-12T00:00:00.000Z");
  });

  it("marks learned after two consecutive successful ratings", () => {
    const result = calculateSrsUpdate(
      baseInput({
        rating: ReviewRating.GOOD,
        successCount: 1,
        consecutiveSuccessCount: 1,
      }),
    );

    expect(result.status).toBe(CharacterStatus.LEARNED);
    expect(result.successCount).toBe(2);
    expect(result.consecutiveSuccessCount).toBe(2);
    expect(result.nextReviewAt.toISOString()).toBe("2026-07-14T00:00:00.000Z");
  });

  it("marks mastered after four successful reviews", () => {
    const result = calculateSrsUpdate(
      baseInput({
        rating: ReviewRating.EASY,
        successCount: 3,
        consecutiveSuccessCount: 1,
      }),
    );

    expect(result.status).toBe(CharacterStatus.MASTERED);
    expect(result.isMastered).toBe(true);
    expect(result.nextReviewAt.toISOString()).toBe("2026-07-18T00:00:00.000Z");
  });
});
