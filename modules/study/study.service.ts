import {
  CharacterStatus,
  Prisma,
  ReviewRating,
  StudyCardType,
  StudySessionType,
} from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { ensureUserSettings } from "@/modules/settings/settings.service";
import {
  findAvailableNewCharactersForCurrentLevel,
  getNewlyCompletedLevelIndexes,
} from "@/modules/levels/level-progress.service";
import {
  assertSectionUnlocked,
  refreshUserSectionUnlocks,
} from "@/modules/sections/section.service";
import { serializeStudySession } from "@/modules/shared/serializers";
import { calculateSrsUpdate } from "@/modules/study/srs";
import {
  isPreviousStudyDate,
  isSameStudyDate,
  toStudyDate,
} from "@/modules/shared/dates";

const reviewStatuses = [
  CharacterStatus.LEARNING,
  CharacterStatus.LEARNED,
  CharacterStatus.MASTERED,
];

const practiceSessionTypes = new Set<StudySessionType>([
  StudySessionType.PRACTICE_AGAIN,
  StudySessionType.REVIEW_AGAIN,
  StudySessionType.MANUAL_REVIEW,
]);

const sessionInclude = {
  cards: {
    orderBy: { createdAt: "asc" },
    include: {
      character: true,
    },
  },
} satisfies Prisma.StudySessionInclude;

export const learnMoreSchema = z.object({
  count: z.number().int().positive().max(50).default(5).optional(),
  sectionId: z.string().uuid().optional(),
});

export const reviewRatingSchema = z.object({
  rating: z.nativeEnum(ReviewRating),
});

export const manualReviewSchema = z.object({
  characterId: z.string().uuid(),
});

export const practiceAgainSchema = z.object({
  count: z.number().int().positive().max(50).default(10).optional(),
});

export async function createDailyStudySession(userId: string) {
  const now = new Date();
  const [user, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ensureUserSettings(userId),
  ]);

  if (!settings.currentSectionId) {
    throw new ApiError(400, "CURRENT_SECTION_REQUIRED", "Current section is required.");
  }

  await assertSectionUnlocked(userId, settings.currentSectionId);

  const session = await prisma.$transaction(async (tx) => {
    const newCharacters = await findAvailableNewCharactersForCurrentLevel(tx, {
      userId,
      isPro: user.isPro,
      take: settings.dailyNewCharacterGoal,
    });

    if (!user.isPro && newCharacters.length === 0) {
      return null;
    }

    const createdSession = await tx.studySession.create({
      data: {
        userId,
        sessionType: StudySessionType.DAILY,
        sectionId: newCharacters[0]?.sectionId ?? settings.currentSectionId,
        totalCards: newCharacters.length,
        reviewCount: 0,
        newCount: newCharacters.length,
        completedCount: 0,
        startedAt: now,
      },
    });

    for (const character of newCharacters) {
      await tx.userCharacterProgress.upsert({
        where: {
          userId_characterId: {
            userId,
            characterId: character.id,
          },
        },
        update: {},
        create: {
          userId,
          characterId: character.id,
          sectionId: character.sectionId,
          status: CharacterStatus.NEW,
        },
      });
    }

    await tx.studySessionCard.createMany({
      data: newCharacters.map((character) => ({
        sessionId: createdSession.id,
        userId,
        characterId: character.id,
        cardType: StudyCardType.NEW,
      })),
    });

    return tx.studySession.findUniqueOrThrow({
      where: { id: createdSession.id },
      include: sessionInclude,
    });
  });

  if (!session) {
    return {
      paywallRequired: true,
      message: "Unlock Pro to continue learning all characters.",
    };
  }

  return serializeStudySession(session);
}

export async function createLearnMoreSession(
  userId: string,
  input: z.infer<typeof learnMoreSchema>,
) {
  const parsed = learnMoreSchema.parse(input);
  const count = parsed.count ?? 5;
  const [user, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ensureUserSettings(userId),
  ]);
  const sectionId = parsed.sectionId ?? settings.currentSectionId;

  if (!sectionId) {
    throw new ApiError(400, "SECTION_REQUIRED", "sectionId is required.");
  }

  await assertSectionUnlocked(userId, sectionId);

  const session = await prisma.$transaction(async (tx) => {
    const newCharacters = parsed.sectionId
      ? await findAvailableNewCharacters(tx, {
          userId,
          sectionId,
          isPro: user.isPro,
          take: count,
        })
      : await findAvailableNewCharactersForCurrentLevel(tx, {
          userId,
          isPro: user.isPro,
          take: count,
        });

    if (!user.isPro && newCharacters.length === 0) {
      return null;
    }

    const createdSession = await tx.studySession.create({
      data: {
        userId,
        sessionType: StudySessionType.LEARN_MORE,
        sectionId: newCharacters[0]?.sectionId ?? sectionId,
        totalCards: newCharacters.length,
        newCount: newCharacters.length,
        reviewCount: 0,
        completedCount: 0,
        startedAt: new Date(),
      },
    });

    for (const character of newCharacters) {
      await tx.userCharacterProgress.upsert({
        where: {
          userId_characterId: {
            userId,
            characterId: character.id,
          },
        },
        update: {},
        create: {
          userId,
          characterId: character.id,
          sectionId: character.sectionId,
          status: CharacterStatus.NEW,
        },
      });
    }

    await tx.studySessionCard.createMany({
      data: newCharacters.map((character) => ({
        sessionId: createdSession.id,
        userId,
        characterId: character.id,
        cardType: StudyCardType.NEW,
      })),
    });

    return tx.studySession.findUniqueOrThrow({
      where: { id: createdSession.id },
      include: sessionInclude,
    });
  });

  if (!session) {
    return {
      paywallRequired: true,
      message: "Unlock Pro to continue learning all characters.",
    };
  }

  return serializeStudySession(session);
}

export async function createDueReviewSession(userId: string) {
  const [user] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ensureUserSettings(userId),
  ]);

  const session = await prisma.$transaction(async (tx) => {
    const reviewProgress = await findDueReviewProgress(tx, {
      userId,
      isPro: user.isPro,
      now: new Date(),
    });

    const createdSession = await createReviewOnlySession(tx, {
      userId,
      sessionType: StudySessionType.DUE_REVIEW,
      sectionId: null,
      characterIds: reviewProgress.map((progress) => progress.characterId),
    });

    return tx.studySession.findUniqueOrThrow({
      where: { id: createdSession.id },
      include: sessionInclude,
    });
  });

  return serializeStudySession(session);
}

export async function createPracticeAgainSession(
  userId: string,
  input: z.infer<typeof practiceAgainSchema> = {},
) {
  const { count = 10 } = practiceAgainSchema.parse(input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const studyDate = toStudyDate(new Date());

  const session = await prisma.$transaction(async (tx) => {
    const todayCompletions = await tx.dailyCharacterCompletion.findMany({
      where: {
        userId,
        studyDate,
        character: user.isPro ? undefined : { isFree: true },
      },
      orderBy: { createdAt: "desc" },
      include: { character: true },
      take: count,
    });

    const characterIds = todayCompletions.map((completion) => completion.characterId);

    if (characterIds.length < count) {
      const recentProgress = await tx.userCharacterProgress.findMany({
        where: {
          userId,
          status: { in: reviewStatuses },
          characterId: { notIn: characterIds },
          character: user.isPro ? undefined : { isFree: true },
        },
        orderBy: [{ lastReviewedAt: "desc" }, { updatedAt: "desc" }],
        take: count - characterIds.length,
      });

      characterIds.push(...recentProgress.map((progress) => progress.characterId));
    }

    const createdSession = await createReviewOnlySession(tx, {
      userId,
      sessionType: StudySessionType.PRACTICE_AGAIN,
      sectionId: null,
      characterIds,
    });

    return tx.studySession.findUniqueOrThrow({
      where: { id: createdSession.id },
      include: sessionInclude,
    });
  });

  return serializeStudySession(session);
}

export async function createReviewAgainSession(userId: string, sessionId: string) {
  const previousSession = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
    include: { cards: true },
  });

  if (!previousSession) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "Study session not found.");
  }

  const uniqueCharacterIds = Array.from(
    new Set(previousSession.cards.map((card) => card.characterId)),
  );

  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.studySession.create({
      data: {
        userId,
        sessionType: StudySessionType.REVIEW_AGAIN,
        sectionId: previousSession.sectionId,
        totalCards: uniqueCharacterIds.length,
        reviewCount: uniqueCharacterIds.length,
        newCount: 0,
        completedCount: 0,
        startedAt: new Date(),
      },
    });

    await tx.studySessionCard.createMany({
      data: uniqueCharacterIds.map((characterId) => ({
        sessionId: createdSession.id,
        userId,
        characterId,
        cardType: StudyCardType.REVIEW,
      })),
    });

    return tx.studySession.findUniqueOrThrow({
      where: { id: createdSession.id },
      include: sessionInclude,
    });
  });

  return serializeStudySession(session);
}

async function findAvailableNewCharacters(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    sectionId: string;
    isPro: boolean;
    take: number;
  },
) {
  return tx.character.findMany({
    where: {
      sectionId: input.sectionId,
      ...(input.isPro ? {} : { isFree: true }),
      OR: [
        { userProgress: { none: { userId: input.userId } } },
        {
          userProgress: {
            some: { userId: input.userId, status: CharacterStatus.NEW },
          },
        },
      ],
    },
    orderBy: { orderIndex: "asc" },
    take: input.take,
  });
}

async function findDueReviewProgress(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    isPro: boolean;
    now: Date;
  },
) {
  const progress = await tx.userCharacterProgress.findMany({
    where: {
      userId: input.userId,
      status: { in: reviewStatuses },
      nextReviewAt: { lte: input.now },
      character: input.isPro ? undefined : { isFree: true },
    },
    orderBy: { nextReviewAt: "asc" },
    include: { character: true },
  });

  const priority = new Map<CharacterStatus, number>([
    [CharacterStatus.LEARNING, 0],
    [CharacterStatus.LEARNED, 1],
    [CharacterStatus.MASTERED, 2],
  ]);

  return progress.sort((a, b) => {
    const statusDiff = (priority.get(a.status) ?? 99) - (priority.get(b.status) ?? 99);
    if (statusDiff !== 0) {
      return statusDiff;
    }

    return (a.nextReviewAt?.getTime() ?? 0) - (b.nextReviewAt?.getTime() ?? 0);
  });
}

async function createReviewOnlySession(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    sessionType: StudySessionType;
    sectionId: string | null;
    characterIds: string[];
  },
) {
  const uniqueCharacterIds = Array.from(new Set(input.characterIds));
  const createdSession = await tx.studySession.create({
    data: {
      userId: input.userId,
      sessionType: input.sessionType,
      sectionId: input.sectionId,
      totalCards: uniqueCharacterIds.length,
      reviewCount: uniqueCharacterIds.length,
      newCount: 0,
      completedCount: 0,
      startedAt: new Date(),
    },
  });

  if (uniqueCharacterIds.length > 0) {
    await tx.studySessionCard.createMany({
      data: uniqueCharacterIds.map((characterId) => ({
        sessionId: createdSession.id,
        userId: input.userId,
        characterId,
        cardType: StudyCardType.REVIEW,
      })),
    });
  }

  return createdSession;
}

export async function submitReviewRating(
  userId: string,
  sessionId: string,
  characterId: string,
  input: z.infer<typeof reviewRatingSchema>,
) {
  const { rating } = reviewRatingSchema.parse(input);
  const now = new Date();
  const studyDate = toStudyDate(now);

  const result = await prisma.$transaction(async (tx) => {
    const card = await tx.studySessionCard.findUnique({
      where: {
        sessionId_characterId: {
          sessionId,
          characterId,
        },
      },
    });

    if (!card || card.userId !== userId) {
      throw new ApiError(404, "SESSION_CARD_NOT_FOUND", "Study session card not found.");
    }

    if (card.rating && card.reviewedAt) {
      throw new ApiError(
        409,
        "CARD_ALREADY_REVIEWED",
        "This card has already been reviewed.",
      );
    }

    const session = await tx.studySession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: {
        sessionType: true,
      },
    });

    if (!session) {
      throw new ApiError(404, "SESSION_NOT_FOUND", "Study session not found.");
    }

    const isPractice = practiceSessionTypes.has(session.sessionType);
    const completed = rating !== ReviewRating.AGAIN && rating !== ReviewRating.HARD;

    const existingProgress = await tx.userCharacterProgress.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
    });

    const character = await tx.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new ApiError(404, "CHARACTER_NOT_FOUND", "Character not found.");
    }

    if (isPractice && !existingProgress) {
      throw new ApiError(
        403,
        "CHARACTER_DETAIL_LOCKED",
        "Learn this character before practicing it.",
      );
    }

    const progress = existingProgress ??
      (await tx.userCharacterProgress.create({
        data: {
          userId,
          characterId,
          sectionId: character.sectionId,
          status: CharacterStatus.NEW,
        },
      }));

    const srsUpdate = calculateSrsUpdate({
      rating,
      now,
      currentStatus: progress.status,
      reviewCount: progress.reviewCount,
      successCount: progress.successCount,
      consecutiveSuccessCount: progress.consecutiveSuccessCount,
      isMastered: progress.isMastered,
    });

    if (isPractice) {
      const updatedCard = await tx.studySessionCard.update({
        where: { id: card.id },
        data: completed
          ? {
              rating,
              reviewedAt: now,
              revealed: true,
              statusBefore: card.statusBefore ?? progress.status,
              statusAfter: progress.status,
              becameSeal: false,
            }
          : {
              revealed: true,
              statusBefore: card.statusBefore ?? progress.status,
              statusAfter: progress.status,
              becameSeal: false,
            },
      });

      return {
        card: updatedCard,
        progress,
        becameSeal: false,
        createdDailyCompletion: false,
        completed,
      };
    }

    const wasSeal =
      progress.status === CharacterStatus.LEARNED ||
      progress.status === CharacterStatus.MASTERED;
    const isSeal =
      srsUpdate.status === CharacterStatus.LEARNED ||
      srsUpdate.status === CharacterStatus.MASTERED;
    const becameSeal = !wasSeal && isSeal;

    const updatedProgress = await tx.userCharacterProgress.update({
      where: { id: progress.id },
      data: {
        lastReviewedAt: now,
        nextReviewAt: srsUpdate.nextReviewAt,
        reviewCount: srsUpdate.reviewCount,
        successCount: srsUpdate.successCount,
        consecutiveSuccessCount: srsUpdate.consecutiveSuccessCount,
        status: srsUpdate.status,
        isMastered: srsUpdate.isMastered,
      },
    });

    const updatedCard = await tx.studySessionCard.update({
      where: { id: card.id },
      data: completed
        ? {
            rating,
            reviewedAt: now,
            revealed: true,
            statusBefore: card.statusBefore ?? progress.status,
            statusAfter: updatedProgress.status,
            becameSeal,
          }
        : {
            revealed: true,
            statusBefore: card.statusBefore ?? progress.status,
            statusAfter: updatedProgress.status,
            becameSeal,
          },
    });

    const existingCompletion = await tx.dailyCharacterCompletion.findUnique({
      where: {
        userId_characterId_studyDate: {
          userId,
          characterId,
          studyDate,
        },
      },
    });

    const todayCompletionCountBefore = await tx.dailyCharacterCompletion.count({
      where: {
        userId,
        studyDate,
      },
    });

    let createdDailyCompletion = false;
    if (completed && !existingCompletion) {
      await tx.dailyCharacterCompletion.create({
        data: {
          userId,
          characterId,
          sectionId: character.sectionId,
          sessionId,
          cardType: card.cardType,
          rating,
          studyDate,
        },
      });
      createdDailyCompletion = true;
    }

    if (createdDailyCompletion && todayCompletionCountBefore === 0) {
      await updateUserStreak(tx, userId, studyDate);
    }

    await refreshUserSectionUnlocks(userId, tx);

    return {
      card: updatedCard,
      progress: updatedProgress,
      becameSeal,
      createdDailyCompletion,
      completed,
    };
  });

  return {
    rating: result.card.rating,
    reviewedAt: result.card.reviewedAt,
    progress: {
      status: result.progress.status,
      lastReviewedAt: result.progress.lastReviewedAt,
      nextReviewAt: result.progress.nextReviewAt,
      reviewCount: result.progress.reviewCount,
      successCount: result.progress.successCount,
      consecutiveSuccessCount: result.progress.consecutiveSuccessCount,
      isMastered: result.progress.isMastered,
    },
    becameSeal: result.becameSeal,
    countedForToday: result.createdDailyCompletion,
    completed: result.completed,
  };
}

async function updateUserStreak(
  tx: Prisma.TransactionClient,
  userId: string,
  studyDate: Date,
) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      lastStudyDate: true,
      currentStreak: true,
      longestStreak: true,
    },
  });

  if (user.lastStudyDate && isSameStudyDate(user.lastStudyDate, studyDate)) {
    return;
  }

  const currentStreak =
    user.lastStudyDate && isPreviousStudyDate(user.lastStudyDate, studyDate)
      ? user.currentStreak + 1
      : 1;

  await tx.user.update({
    where: { id: userId },
    data: {
      lastStudyDate: studyDate,
      currentStreak,
      longestStreak: Math.max(currentStreak, user.longestStreak),
    },
  });
}

export async function completeStudySession(userId: string, sessionId: string) {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
    include: {
      cards: {
        include: {
          character: true,
        },
      },
    },
  });

  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "Study session not found.");
  }

  const unfinishedCards = session.cards.filter((card) => !card.reviewedAt);
  if (unfinishedCards.length > 0) {
    throw new ApiError(400, "UNFINISHED_CARDS", "All cards must be reviewed first.");
  }

  const studyDate = toStudyDate(new Date());
  const reviewedCards = session.cards.filter((card) => card.reviewedAt);
  const dailyCompletions = await prisma.dailyCharacterCompletion.findMany({
    where: {
      userId,
      sessionId,
      studyDate,
    },
  });
  const newCards = reviewedCards.filter(
    (card) => card.cardType === StudyCardType.NEW,
  );
  const reviewCards = reviewedCards.filter(
    (card) => card.cardType === StudyCardType.REVIEW,
  );
  const newSeals = reviewedCards
    .filter((card) => card.becameSeal)
    .map((card) => ({
      characterId: card.characterId,
      hanzi: card.character.hanzi,
      status: card.statusAfter,
    }));
  const newMasteredCharacters = reviewedCards.filter(
    (card) =>
      card.cardType === StudyCardType.NEW &&
      card.statusAfter === CharacterStatus.MASTERED &&
      card.statusBefore !== CharacterStatus.MASTERED,
  ).length;
  const masteredToday = reviewedCards.filter(
    (card) =>
      card.statusAfter === CharacterStatus.MASTERED &&
      card.statusBefore !== CharacterStatus.MASTERED,
  ).length;
  const newlyCompletedLevelIndexes = await getNewlyCompletedLevelIndexes(
    userId,
    newCards.map((card) => card.characterId),
  );

  await prisma.studySession.update({
    where: { id: session.id },
    data: {
      completedCount: reviewedCards.length,
      completedAt: new Date(),
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { isPro: true },
  });
  const stillDueCount = await prisma.userCharacterProgress.count({
    where: {
      userId,
      status: { in: reviewStatuses },
      nextReviewAt: { lte: new Date() },
      character: user.isPro ? undefined : { isFree: true },
    },
  });

  return {
    sessionId: session.id,
    sessionType: session.sessionType,
    newCharactersLearned: newCards.length,
    reviewsCompleted: reviewCards.length,
    uniqueCardsCountedToday: dailyCompletions.length,
    newSealsCollected: newSeals.length,
    newMasteredCharacters,
    newlyCompletedLevelIndexes,
    levelCompleted: newlyCompletedLevelIndexes.length > 0,
    masteredToday,
    stillDueCount,
    newSeals,
  };
}

export async function createManualReviewSession(userId: string, characterId: string) {
  const [user, character, progress] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.character.findUnique({ where: { id: characterId } }),
    prisma.userCharacterProgress.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
    }),
  ]);

  if (!character) {
    throw new ApiError(404, "CHARACTER_NOT_FOUND", "Character not found.");
  }

  if (!user.isPro && !character.isFree) {
    throw new ApiError(
      403,
      "PAYWALL_REQUIRED",
      "Unlock Pro to continue learning all characters.",
      { paywallRequired: true },
    );
  }

  if (!progress || progress.status === CharacterStatus.NEW) {
    throw new ApiError(
      403,
      "CHARACTER_DETAIL_LOCKED",
      "Learn this character before manually reviewing it.",
    );
  }

  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.studySession.create({
      data: {
        userId,
        sessionType: StudySessionType.MANUAL_REVIEW,
        sectionId: character.sectionId,
        totalCards: 1,
        reviewCount: 1,
        newCount: 0,
        completedCount: 0,
        startedAt: new Date(),
      },
    });

    await tx.studySessionCard.create({
      data: {
        sessionId: createdSession.id,
        userId,
        characterId,
        cardType: StudyCardType.REVIEW,
      },
    });

    return tx.studySession.findUniqueOrThrow({
      where: { id: createdSession.id },
      include: sessionInclude,
    });
  });

  return serializeStudySession(session);
}
