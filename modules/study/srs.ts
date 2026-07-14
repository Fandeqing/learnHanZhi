import { CharacterStatus, ReviewRating } from "@prisma/client";
import { addDays } from "@/modules/shared/dates";

const successfulRatings = new Set<ReviewRating>([
  ReviewRating.GOOD,
  ReviewRating.EASY,
  ReviewRating.KNOW,
]);

export function isSuccessfulRating(rating: ReviewRating) {
  return successfulRatings.has(rating);
}

export function calculateSrsUpdate(input: {
  rating: ReviewRating;
  now: Date;
  currentStatus: CharacterStatus;
  reviewCount: number;
  successCount: number;
  consecutiveSuccessCount: number;
  isMastered: boolean;
}) {
  const success = isSuccessfulRating(input.rating);
  const reviewCount = input.reviewCount + 1;
  const successCount = input.successCount + (success ? 1 : 0);
  const consecutiveSuccessCount = success
    ? input.consecutiveSuccessCount + 1
    : 0;

  const nextReviewAt =
    input.rating === ReviewRating.EASY || input.rating === ReviewRating.KNOW
      ? addDays(input.now, 7)
      : input.rating === ReviewRating.GOOD
        ? addDays(input.now, 3)
        : addDays(input.now, 1);

  let status: CharacterStatus;

  if (input.rating === ReviewRating.AGAIN || input.rating === ReviewRating.HARD) {
    status = CharacterStatus.LEARNING;
  } else if (input.rating === ReviewRating.EASY || input.rating === ReviewRating.KNOW) {
    status = CharacterStatus.MASTERED;
  } else {
    status = CharacterStatus.LEARNED;
  }

  return {
    nextReviewAt,
    reviewCount,
    successCount,
    consecutiveSuccessCount,
    status,
    isMastered: status === CharacterStatus.MASTERED,
  };
}
