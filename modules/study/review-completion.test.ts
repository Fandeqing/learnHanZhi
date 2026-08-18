import { ReviewRating } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { completesSessionCard } from "./review-completion";

describe("completesSessionCard", () => {
  it("requeues the first Again", () => {
    expect(completesSessionCard(null, ReviewRating.AGAIN)).toBe(false);
  });

  it("completes the session card on the second Again", () => {
    expect(completesSessionCard(ReviewRating.AGAIN, ReviewRating.AGAIN)).toBe(true);
  });

  it.each([ReviewRating.HARD, ReviewRating.GOOD, ReviewRating.EASY, ReviewRating.KNOW])(
    "completes the card for %s",
    (rating) => {
      expect(completesSessionCard(ReviewRating.AGAIN, rating)).toBe(true);
    },
  );
});
