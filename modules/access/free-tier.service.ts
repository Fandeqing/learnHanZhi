import { Prisma, StudyCardType, type PrismaClient } from "@prisma/client";
import { isSameStudyDate, toStudyDate } from "@/modules/shared/dates";

export const FREE_CHARACTER_LIMIT = 30;
export const FREE_DAILY_NEW_CHARACTER_LIMIT = 10;
export const FIRST_FREE_DAY_NEW_CHARACTER_LIMIT = 20;
export const FREE_UPGRADE_NUDGE_CHARACTER_COUNT = 20;

type Client = Prisma.TransactionClient | PrismaClient;

export function freeDailyNewCharacterGoal(goal: number, limit: number) {
  return Math.min(goal, limit);
}

export async function getFreeNewCharacterAllowance(
  client: Client,
  input: { userId: string; studyDate: Date; studyTimeZone?: string | null },
) {
  const [startedCharacterCount, completedTodayCount, firstFreeCharacter] = await Promise.all([
    client.userCharacterProgress.count({
      where: {
        userId: input.userId,
        character: { isFree: true },
      },
    }),
    client.dailyCharacterCompletion.count({
      where: {
        userId: input.userId,
        studyDate: input.studyDate,
        cardType: StudyCardType.NEW,
      },
    }),
    client.userCharacterProgress.findFirst({
      where: {
        userId: input.userId,
        character: { isFree: true },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const isFirstFreeStudyDay =
    !firstFreeCharacter ||
    isSameStudyDate(
      toStudyDate(firstFreeCharacter.createdAt, input.studyTimeZone),
      input.studyDate,
    );
  const dailyLimit = isFirstFreeStudyDay
    ? FIRST_FREE_DAY_NEW_CHARACTER_LIMIT
    : FREE_DAILY_NEW_CHARACTER_LIMIT;

  return {
    startedCharacterCount,
    completedTodayCount,
    dailyLimit,
    remainingTotal: Math.max(FREE_CHARACTER_LIMIT - startedCharacterCount, 0),
    remainingToday: Math.max(dailyLimit - completedTodayCount, 0),
  };
}
