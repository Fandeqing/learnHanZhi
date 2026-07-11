import { CharacterStatus, StudySessionType } from "@prisma/client";
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

  const dueReviewCount = await prisma.userCharacterProgress.count({
    where: {
      userId,
      status: { in: activeReviewStatuses },
      nextReviewAt: { lte: now },
      character: user.isPro ? undefined : { isFree: true },
    },
  });

  const availableNewCount = await prisma.character.count({
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
  });

  const dailyNewCharacterCount = Math.min(
    settings.dailyNewCharacterGoal,
    availableNewCount,
  );
  const totalCards = dueReviewCount + dailyNewCharacterCount;
  const [completedTodayCount, latestDailySession] = await Promise.all([
    prisma.dailyCharacterCompletion.count({
      where: {
        userId,
        studyDate,
      },
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
  ]);
  const todayProgressTotal = latestDailySession?.totalCards ?? totalCards;
  const isTodayComplete =
    todayProgressTotal > 0 &&
    (latestDailySession?.completedAt != null ||
      completedTodayCount >= todayProgressTotal);
  const suggestedPrimaryAction = isTodayComplete
    ? "REVIEW_AGAIN_OR_LEARN_MORE"
    : totalCards > 0 || todayProgressTotal > 0
      ? "START_LEARNING"
      : user.isPro
        ? "DONE"
        : "PAYWALL";
  const currentSectionProgress = (await getSectionsForUser(userId)).find(
    (section) => section.id === currentSection.id,
  );
  const nextSection = await getNextSection(userId, currentSection);
  const sealBookPreview = await getSealBookPreview(userId, currentSection.id);

  return {
    dueReviewCount,
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
