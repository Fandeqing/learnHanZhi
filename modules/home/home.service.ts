import { CharacterStatus, StudyCardType, StudySessionType } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  FREE_CHARACTER_LIMIT,
  FREE_DAILY_NEW_CHARACTER_LIMIT,
  FREE_UPGRADE_NUDGE_CHARACTER_COUNT,
  freeDailyNewCharacterGoal,
  getFreeNewCharacterAllowance,
} from "@/modules/access/free-tier.service";
import { ensureUserSettings } from "@/modules/settings/settings.service";
import {
  findAvailableNewCharactersForCurrentLevel,
  getBambooProgress,
} from "@/modules/levels/level-progress.service";
import {
  assertSectionUnlocked,
  getNextSection,
  getSectionsForUser,
} from "@/modules/sections/section.service";
import { publicStatus } from "@/modules/shared/serializers";
import { getStudyDateUtcBounds, toStudyDate } from "@/modules/shared/dates";
import {
  reviewCandidateWhere,
  reviewSessionLimit,
  selectReviewCandidates,
} from "@/modules/study/review-candidates";

export async function getHome(userId: string) {
  const now = new Date();
  const [user, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
    }),
    ensureUserSettings(userId),
  ]);
  const studyDate = toStudyDate(now, settings.studyTimeZone);
  const studyDateBounds = getStudyDateUtcBounds(studyDate, settings.studyTimeZone);

  const currentSection = settings.currentSectionId
    ? await prisma.section.findUnique({ where: { id: settings.currentSectionId } })
    : null;

  if (!currentSection) {
    throw new ApiError(404, "CURRENT_SECTION_NOT_FOUND", "Current section not found.");
  }

  await assertSectionUnlocked(userId, currentSection.id);

  const reviewProgress = await prisma.userCharacterProgress.findMany({
    where: reviewCandidateWhere({
      userId,
      isPro: user.isPro,
    }),
    orderBy: [{ nextReviewAt: "asc" }, { lastReviewedAt: "asc" }, { updatedAt: "asc" }],
    include: { character: true },
  });
  const reviewDeck = selectReviewCandidates(reviewProgress, now, reviewSessionLimit);

  const freeAllowance = user.isPro
    ? null
    : await getFreeNewCharacterAllowance(prisma, { userId, studyDate });
  const dailyNewGoal = user.isPro
    ? settings.dailyNewCharacterGoal
    : freeDailyNewCharacterGoal(settings.dailyNewCharacterGoal);
  const availableNewCharacters = await findAvailableNewCharactersForCurrentLevel(prisma, {
    userId,
    isPro: user.isPro,
    take: user.isPro
      ? dailyNewGoal
      : Math.min(
          dailyNewGoal,
          freeAllowance?.remainingTotal ?? 0,
          freeAllowance?.remainingToday ?? 0,
        ),
  });

  const [
    completedTodayCount,
    todayNewCompletions,
    latestDailySession,
    masteredCount,
    learnedCount,
    accessibleCharacterCount,
    bamboo,
    freeNewCharacterCompletions,
  ] = await Promise.all([
    prisma.dailyCharacterCompletion.count({ where: { userId, studyDate } }),
    prisma.dailyCharacterCompletion.findMany({
      where: {
        userId,
        studyDate,
        cardType: StudyCardType.NEW,
      },
      orderBy: { createdAt: "asc" },
      include: {
        character: {
          include: {
            userProgress: {
              where: { userId },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.studySession.findFirst({
      where: {
        userId,
        sessionType: StudySessionType.DAILY,
        startedAt: {
          gte: studyDateBounds.start,
          lt: studyDateBounds.end,
        },
      },
      orderBy: { startedAt: "desc" },
    }),
    prisma.userCharacterProgress.count({
      where: {
        userId,
        status: CharacterStatus.MASTERED,
        character: user.isPro ? undefined : { isFree: true },
      },
    }),
    prisma.userCharacterProgress.count({
      where: {
        userId,
        status: { in: [CharacterStatus.LEARNED, CharacterStatus.MASTERED] },
        character: user.isPro ? undefined : { isFree: true },
      },
    }),
    prisma.character.count({
      where: user.isPro ? undefined : { isFree: true },
    }),
    getBambooProgress(userId),
    prisma.dailyCharacterCompletion.findMany({
      where: {
        userId,
        cardType: StudyCardType.NEW,
        character: { isFree: true },
      },
      distinct: ["characterId"],
      select: { characterId: true },
    }),
  ]);

  const todayNewLearnedCount = Math.min(
    todayNewCompletions.length,
    dailyNewGoal,
  );
  const todayExtraNewCount = Math.max(
    todayNewCompletions.length - dailyNewGoal,
    0,
  );
  const dailyNewCharacterCount = Math.min(
    Math.max(dailyNewGoal - todayNewLearnedCount, 0),
    availableNewCharacters.length,
  );
  const totalCards = reviewDeck.length + dailyNewCharacterCount;
  const todayProgressTotal =
    latestDailySession?.totalCards ?? dailyNewGoal;
  const isTodayComplete =
    todayNewLearnedCount >= dailyNewGoal ||
    latestDailySession?.completedAt != null;
  const suggestedPrimaryAction = isTodayComplete
    ? "REVIEW_AGAIN_OR_LEARN_MORE"
    : dailyNewCharacterCount > 0 || todayProgressTotal > 0
      ? "START_LEARNING"
      : user.isPro || reviewDeck.length === 0 || freeAllowance?.remainingToday === 0
        ? "DONE"
        : "PAYWALL";
  const currentSectionProgress = (await getSectionsForUser(userId)).find(
    (section) => section.id === currentSection.id,
  );
  const nextSection = await getNextSection(userId, currentSection);
  const sealBookPreview = await getSealBookPreview(userId, currentSection.id);
  const completedNewCharacterIds = new Set(
    todayNewCompletions.map((completion) => completion.characterId),
  );
  const completedNewCharacters = todayNewCompletions.map((completion) =>
    serializeCharacterSummary(completion.character, {
      status: publicStatus(completion.character.userProgress[0]?.status),
    }),
  );
  const plannedNewCharacters = availableNewCharacters
    .filter((character) => !completedNewCharacterIds.has(character.id))
    .slice(0, Math.max(dailyNewGoal - todayNewCompletions.length, 0))
    .map((character) =>
      serializeCharacterSummary(character, { status: CharacterStatus.NEW }),
    );
  const todayNewCharacters = [
    ...completedNewCharacters,
    ...plannedNewCharacters,
  ];

  return {
    todayNewGoal: dailyNewGoal,
    todayNewLearnedCount,
    todayExtraNewLearnedCount: todayExtraNewCount,
    todayNewCharacters,
    reviewAvailableCount: reviewDeck.length,
    reviewCharacters: reviewDeck.map((progress) =>
      serializeCharacterSummary(progress.character),
    ),
    masteredCount,
    learnedCount,
    toLearnCount: Math.max(accessibleCharacterCount - learnedCount, 0),
    isDailyLearningComplete: isTodayComplete,
    hasReviewCards: reviewDeck.length > 0,
    dailyNewCharacterCount,
    totalCards,
    completedTodayCount,
    todayProgressTotal,
    isTodayComplete,
    suggestedPrimaryAction,
    estimatedMinutes: Math.ceil((totalCards * 15) / 60),
    currentSection: currentSectionProgress,
    bamboo,
    remainingToUnlock: nextSection?.remainingToUnlock ?? 0,
    nextSectionName: nextSection?.name ?? null,
    sealBookPreview,
    isPro: user.isPro,
    freeCharactersLearned: freeNewCharacterCompletions.length,
    freeCharacterLimit: FREE_CHARACTER_LIMIT,
    dailyFreeNewCharacterLimit: FREE_DAILY_NEW_CHARACTER_LIMIT,
    isFreeDailyNewLimitReached:
      !user.isPro && (freeAllowance?.remainingToday ?? 0) === 0,
    shouldShowUpgradeNudge:
      !user.isPro &&
      freeNewCharacterCompletions.length >= FREE_UPGRADE_NUDGE_CHARACTER_COUNT &&
      freeNewCharacterCompletions.length < FREE_CHARACTER_LIMIT,
    onboardingCompleted: user.onboardingCompleted,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastStudyDate: user.lastStudyDate,
  };
}

function serializeCharacterSummary(character: {
  id: string;
  hanzi: string;
  sectionId: string;
  orderIndex: number;
}, options: { status?: CharacterStatus } = {}) {
  return {
    id: character.id,
    hanzi: character.hanzi,
    sectionId: character.sectionId,
    orderIndex: character.orderIndex,
    status: options.status,
  };
}

async function getSealBookPreview(userId: string, sectionId: string) {
  const characters = await prisma.character.findMany({
    where: { sectionId },
    orderBy: { orderIndex: "asc" },
    take: 10,
    include: {
      userProgress: {
        where: { userId },
        take: 1,
      },
    },
  });

  const collectedCompletions = await prisma.dailyCharacterCompletion.findMany({
    where: {
      userId,
      cardType: StudyCardType.NEW,
      characterId: { in: characters.map((character) => character.id) },
    },
    distinct: ["characterId"],
    select: { characterId: true },
  });
  const collectedIds = new Set(
    collectedCompletions.map((completion) => completion.characterId),
  );

  return characters.map((character) => {
    const progress = character.userProgress[0];
    const status =
      progress?.status === CharacterStatus.LEARNING && progress.nextReviewAt == null
        ? CharacterStatus.NEW
        : publicStatus(progress?.status);
    const isCollected = collectedIds.has(character.id);

    return {
      characterId: character.id,
      hanzi: isCollected ? character.hanzi : null,
      status,
      orderIndex: character.orderIndex,
    };
  });
}
