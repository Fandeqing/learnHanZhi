import { ReviewRating } from "@prisma/client";

export function completesSessionCard(
  previousRating: ReviewRating | null,
  rating: ReviewRating,
) {
  return rating !== ReviewRating.AGAIN || previousRating === ReviewRating.AGAIN;
}
