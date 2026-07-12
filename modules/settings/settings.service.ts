import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  assertSectionUnlocked,
  getBasicsSection,
} from "@/modules/sections/section.service";

export const settingsPatchSchema = z.object({
  dailyNewCharacterGoal: z.union([z.literal(5), z.literal(10), z.literal(15)]).optional(),
  pronunciationEnabled: z.boolean().optional(),
  autoPlayEnabled: z.boolean().optional(),
  studyTimeZone: z.string().trim().min(1).max(80).optional(),
  currentSectionId: z.string().uuid().optional(),
});

export async function ensureUserSettings(userId: string) {
  const existing = await prisma.userSetting.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  const basics = await getBasicsSection();
  return prisma.userSetting.create({
    data: {
      userId,
      currentSectionId: basics.id,
    },
  });
}

export async function getSettings(userId: string) {
  const [user, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        isPro: true,
        onboardingCompleted: true,
        onboardingCompletedAt: true,
        lastStudyDate: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    ensureUserSettings(userId),
  ]);

  return {
    ...settings,
    ...user,
  };
}

export async function updateSettings(
  userId: string,
  input: z.infer<typeof settingsPatchSchema>,
) {
  const data = settingsPatchSchema.parse(input);

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "EMPTY_UPDATE", "No settings fields provided.");
  }

  if (data.currentSectionId) {
    await assertSectionUnlocked(userId, data.currentSectionId);
  }

  if (data.studyTimeZone) {
    try {
      Intl.DateTimeFormat("en-US", { timeZone: data.studyTimeZone }).format(new Date());
    } catch {
      throw new ApiError(400, "INVALID_TIME_ZONE", "Invalid study time zone.");
    }
  }

  await ensureUserSettings(userId);

  return prisma.userSetting.update({
    where: { userId },
    data,
  });
}
