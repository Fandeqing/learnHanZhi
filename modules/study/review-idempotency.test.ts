import { ReviewRating } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { reviewRatingSchema } from "./study.service";

describe("reviewRatingSchema submissionId", () => {
  it("accepts a client submission UUID", () => {
    const submissionId = "5f021f8c-50f3-4bbf-b3d9-8900d697f22a";
    expect(reviewRatingSchema.parse({ rating: ReviewRating.GOOD, submissionId })).toEqual({
      rating: ReviewRating.GOOD,
      submissionId,
    });
  });

  it("keeps compatibility with clients that do not send submissionId", () => {
    expect(reviewRatingSchema.parse({ rating: ReviewRating.AGAIN })).toEqual({
      rating: ReviewRating.AGAIN,
    });
  });
});
