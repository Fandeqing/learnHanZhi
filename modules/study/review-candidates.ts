import { CharacterStatus, Prisma } from "@prisma/client";

export const reviewStatuses = [
  CharacterStatus.LEARNING,
  CharacterStatus.LEARNED,
  CharacterStatus.MASTERED,
];

const reviewWeights = new Map<CharacterStatus, number>([
  [CharacterStatus.LEARNING, 6],
  [CharacterStatus.LEARNED, 3],
  [CharacterStatus.MASTERED, 1],
]);

export const reviewSessionLimit = 10;

export type ReviewCandidate = {
  characterId: string;
  status: CharacterStatus;
  nextReviewAt: Date | null;
  lastReviewedAt: Date | null;
  reviewCount: number;
  updatedAt: Date;
};

export function reviewCandidateWhere(input: {
  userId: string;
  isPro: boolean;
}): Prisma.UserCharacterProgressWhereInput {
  return {
    userId: input.userId,
    status: { in: reviewStatuses },
    character: input.isPro ? undefined : { isFree: true },
  };
}

export function selectReviewCandidates<T extends ReviewCandidate>(
  progress: T[],
  _now: Date,
  limit = reviewSessionLimit,
  random = Math.random,
) {
  const pool = [...progress];
  const selected: T[] = [];

  while (selected.length < limit && pool.length > 0) {
    const totalWeight = pool.reduce(
      (sum, item) => sum + (reviewWeights.get(item.status) ?? 1),
      0,
    );
    let target = random() * totalWeight;
    const selectedIndex = pool.findIndex((item) => {
      target -= reviewWeights.get(item.status) ?? 1;
      return target <= 0;
    });
    const index = selectedIndex === -1 ? pool.length - 1 : selectedIndex;
    const [item] = pool.splice(index, 1);
    selected.push(item);
  }

  return selected;
}
