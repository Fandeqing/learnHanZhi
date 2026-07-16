import { Prisma, StudyCardType, type PrismaClient } from "@prisma/client";

export const FREE_CHARACTER_LIMIT = 30;
export const FREE_DAILY_NEW_CHARACTER_LIMIT = 10;
export const FREE_UPGRADE_NUDGE_CHARACTER_COUNT = 20;

type Client = Prisma.TransactionClient | PrismaClient;

export function freeDailyNewCharacterGoal(goal: number) {
  return Math.min(goal, FREE_DAILY_NEW_CHARACTER_LIMIT);
}

export async function getFreeNewCharacterAllowance(
  client: Client,
  input: { userId: string; studyDate: Date },
) {
  const [startedCharacterCount, completedTodayCount] = await Promise.all([
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
  ]);

  return {
    startedCharacterCount,
    completedTodayCount,
    remainingTotal: Math.max(FREE_CHARACTER_LIMIT - startedCharacterCount, 0),
    remainingToday: Math.max(
      FREE_DAILY_NEW_CHARACTER_LIMIT - completedTodayCount,
      0,
    ),
  };
}
