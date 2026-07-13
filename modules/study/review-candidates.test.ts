import { describe, expect, it } from "vitest";
import { CharacterStatus } from "@prisma/client";
import { selectReviewCandidates, type ReviewCandidate } from "./review-candidates";

const now = new Date("2026-07-13T00:00:00.000Z");

function candidate(
  id: string,
  status: CharacterStatus,
  daysAgo: number,
): ReviewCandidate {
  const reviewedAt = new Date(now);
  reviewedAt.setUTCDate(reviewedAt.getUTCDate() - daysAgo);

  return {
    characterId: id,
    status,
    nextReviewAt: reviewedAt,
    lastReviewedAt: reviewedAt,
    reviewCount: 1,
    updatedAt: reviewedAt,
  };
}

describe("selectReviewCandidates", () => {
  it("selects at most 10 review cards without duplicates", () => {
    const progress = [
      ...Array.from({ length: 8 }, (_, index) =>
        candidate(`learning-${index}`, CharacterStatus.LEARNING, index + 1),
      ),
      ...Array.from({ length: 6 }, (_, index) =>
        candidate(`learned-${index}`, CharacterStatus.LEARNED, index + 1),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        candidate(`mastered-${index}`, CharacterStatus.MASTERED, index + 1),
      ),
    ];

    const selected = selectReviewCandidates(progress, now, 10, () => 0.42);

    expect(selected).toHaveLength(10);
    expect(new Set(selected.map((item) => item.characterId)).size).toBe(10);
  });

  it("uses status weights when randomly selecting cards", () => {
    const progress = [
      candidate("learning", CharacterStatus.LEARNING, 1),
      candidate("learned", CharacterStatus.LEARNED, 1),
      candidate("mastered", CharacterStatus.MASTERED, 1),
    ];

    const selected = selectReviewCandidates(progress, now, 1, () => 0.95);

    expect(selected).toHaveLength(1);
    expect(selected[0].status).toBe(CharacterStatus.MASTERED);
  });
});
