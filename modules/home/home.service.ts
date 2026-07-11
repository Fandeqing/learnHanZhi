import { CharacterStatus, StudyCardType, StudySessionType } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { ensureUserSettings } from "@/modules/settings/settings.service";
import {
  assertSectionUnlocked,
  getNextSection,
  getSectionsForUser,
} from "@/modules/sections/section.service";
import { publicStatus } from "@/modules/shared/serializers";
import { toStudyDate } from "@/modules/shared/dates";

const activeReviewStatuses = [
  CharacterStatus.LEARNING,
  CharacterStatus.LEARNED,
  CharacterStatus.MASTERED,
];

export async function getHome(userId: string) {
  const now = new Date();
  const studyDate = toStudyDate(now);
  const [user, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
    }),
    ensureUserSettings(userId),
  ]);

  const currentSection = settings.currentSectionId
    ? await prisma.section.findUnique({ where: { id: settings.currentSectionId } })
    : null;

  if (!currentSection) {
    throw new ApiError(404, "CURRENT_SECTION_NOT_FOUND", "Current section not found.");
  }

  await assertSectionUnlocked(userId, currentSection.id);

  const dueReviewProgress = await prisma.userCharacterProgress.findMany({
    where: {
      userId,
      status: { in: activeReviewStatuses },
      nextReviewAt: { lte: now },
      character: user.isPro ? undefined : { isFree: true },
    },
    orderBy: { nextReviewAt: "asc" },
    include: { character: true },
  });

  const availableNewCharacters = await prisma.character.findMany({
    where: {
      sectionId: currentSection.id,
      ...(user.isPro ? {} : { isFree: true }),
      OR: [
        {
          userProgress: {
            none: { userId },
          },
        },
        {
          userProgress: {
            some: {
              userId,
              status: CharacterStatus.NEW,
            },
          },
        },
      ],
    },
    orderBy: { orderIndex: "asc" },
    take: settings.dailyNewCharacterGoal,
  });

  const [
    completedTodayCount,
    plannedNewCompletions,
    todayExtraNewCount,
    todayNewCompletions,
    latestDailySession,
    masteredCount,
    learnedCount,
    accessibleCharacterCount,
  ] = await Promise.all([
    prisma.dailyCharacterCompletion.count({ where: { userId, studyDate } }),
    prisma.dailyCharacterCompletion.findMany({
      where: {
        userId,
        studyDate,
        cardType: StudyCardType.NEW,
        session: {
          sessionType: StudySessionType.DAILY,
        },
      },
      orderBy: { createdAt: "asc" },
      include: { character: true },
    }),
    prisma.dailyCharacterCompletion.count({
      where: {
        userId,
        studyDate,
        cardType: StudyCardType.NEW,
        session: {
          sessionType: StudySessionType.LEARN_MORE,
        },
      },
    }),
    prisma.dailyCharacterCompletion.findMany({
      where: {
        userId,
        studyDate,
        cardType: StudyCardType.NEW,
      },
      orderBy: { createdAt: "asc" },
      include: { character: true },
    }),
    prisma.studySession.findFirst({
      where: {
        userId,
        sessionType: StudySessionType.DAILY,
        startedAt: {
          gte: studyDate,
          lt: toStudyDate(new Date(studyDate.getTime() + 24 * 60 * 60 * 1000)),
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
  ]);

  const todayNewLearnedCount = Math.min(
    plannedNewCompletions.length,
    settings.dailyNewCharacterGoal,
  );
  const dailyNewCharacterCount = Math.min(
    Math.max(settings.dailyNewCharacterGoal - todayNewLearnedCount, 0),
    availableNewCharacters.length,
  );
  const totalCards = dueReviewProgress.length + dailyNewCharacterCount;
  const todayProgressTotal =
    latestDailySession?.totalCards ?? settings.dailyNewCharacterGoal;
  const isTodayComplete =
    todayNewLearnedCount >= settings.dailyNewCharacterGoal ||
    latestDailySession?.completedAt != null;
  const suggestedPrimaryAction = isTodayComplete
    ? "REVIEW_AGAIN_OR_LEARN_MORE"
    : dailyNewCharacterCount > 0 || todayProgressTotal > 0
      ? "START_LEARNING"
      : user.isPro || dueReviewProgress.length === 0
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
    serializeCharacterSummary(completion.character),
  );
  const plannedNewCharacters = availableNewCharacters
    .filter((character) => !completedNewCharacterIds.has(character.id))
    .slice(0, Math.max(settings.dailyNewCharacterGoal - plannedNewCompletions.length, 0))
    .map(serializeCharacterSummary);
  const todayNewCharacters = [
    ...completedNewCharacters,
    ...plannedNewCharacters,
  ];

  return {
    todayNewGoal: settings.dailyNewCharacterGoal,
    todayNewLearnedCount,
    todayExtraNewLearnedCount: todayExtraNewCount,
    todayNewCharacters,
    dueReviewCount: dueReviewProgress.length,
    dueReviewCharacters: dueReviewProgress.map((progress) =>
      serializeCharacterSummary(progress.character),
    ),
    masteredCount,
    learnedCount,
    toLearnCount: Math.max(accessibleCharacterCount - learnedCount, 0),
    isDailyLearningComplete: isTodayComplete,
    hasDueReviews: dueReviewProgress.length > 0,
    dailyNewCharacterCount,
    totalCards,
    completedTodayCount,
    todayProgressTotal,
    isTodayComplete,
    suggestedPrimaryAction,
    estimatedMinutes: Math.ceil((totalCards * 15) / 60),
    currentSection: currentSectionProgress,
    remainingToUnlock: nextSection?.remainingToUnlock ?? 0,
    nextSectionName: nextSection?.name ?? null,
    sealBookPreview,
    isPro: user.isPro,
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
}) {
  return {
    id: character.id,
    hanzi: character.hanzi,
    sectionId: character.sectionId,
    orderIndex: character.orderIndex,
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

  return characters.map((character) => {
    const status = publicStatus(character.userProgress[0]?.status);
    const isCollected =
      status === CharacterStatus.LEARNED || status === CharacterStatus.MASTERED;

    return {
      characterId: character.id,
      hanzi: isCollected ? character.hanzi : null,
      status,
      orderIndex: character.orderIndex,
    };
  });
}
