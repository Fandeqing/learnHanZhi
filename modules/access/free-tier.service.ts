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

export function remainingFreeCharacterCount(completedCharacterCount: number) {
  return Math.max(FREE_CHARACTER_LIMIT - completedCharacterCount, 0);
}

export async function getFreeNewCharacterAllowance(
  client: Client,
  input: { userId: string; studyDate: Date; studyTimeZone?: string | null },
) {
  const [completedFreeCharacters, completedTodayCount, firstFreeCharacter] = await Promise.all([
    client.dailyCharacterCompletion.findMany({
      where: {
        userId: input.userId,
        character: { isFree: true },
        cardType: StudyCardType.NEW,
      },
      distinct: ["characterId"],
      select: { characterId: true },
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
    completedCharacterCount: completedFreeCharacters.length,
    completedTodayCount,
    dailyLimit,
    remainingTotal: remainingFreeCharacterCount(completedFreeCharacters.length),
    remainingToday: Math.max(dailyLimit - completedTodayCount, 0),
  };
}
