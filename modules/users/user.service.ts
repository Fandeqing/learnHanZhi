import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getBasicsSection,
  refreshUserSectionUnlocks,
} from "@/modules/sections/section.service";

export const anonymousUserSchema = z.object({
  deviceId: z.string().trim().min(1, "deviceId is required."),
  studyTimeZone: z.string().trim().min(1).max(80).optional(),
});

export const completeOnboardingSchema = z.object({
  dailyNewCharacterGoal: z.union([z.literal(5), z.literal(10), z.literal(15)]).optional(),
  pronunciationEnabled: z.boolean().optional(),
  autoPlayEnabled: z.boolean().optional(),
});

export async function createAnonymousUser(input: z.infer<typeof anonymousUserSchema>) {
  const { deviceId, studyTimeZone } = anonymousUserSchema.parse(input);
  const basics = await getBasicsSection();
  const validStudyTimeZone = normalizeStudyTimeZone(studyTimeZone);

  const user = await prisma.$transaction(async (tx) => {
    const upsertedUser = await tx.user.upsert({
      where: { deviceId },
      update: {
        settings: {
          upsert: {
            update: { studyTimeZone: validStudyTimeZone },
            create: {
              dailyNewCharacterGoal: 5,
              pronunciationEnabled: true,
              autoPlayEnabled: false,
              studyTimeZone: validStudyTimeZone,
              currentSectionId: basics.id,
            },
          },
        },
      },
      create: {
        deviceId,
        settings: {
          create: {
            dailyNewCharacterGoal: 5,
            pronunciationEnabled: true,
            autoPlayEnabled: false,
            studyTimeZone: validStudyTimeZone,
            currentSectionId: basics.id,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    await refreshUserSectionUnlocks(upsertedUser.id, tx);
    return upsertedUser;
  });

  return user;
}

function normalizeStudyTimeZone(timeZone?: string) {
  if (!timeZone) {
    return "UTC";
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export async function completeOnboarding(
  userId: string,
  input: z.infer<typeof completeOnboardingSchema>,
) {
  const data = completeOnboardingSchema.parse(input);
  const basics = await getBasicsSection();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });

    if (Object.keys(data).length > 0) {
      await tx.userSetting.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          currentSectionId: basics.id,
          ...data,
        },
      });
    }

    return {
      id: user.id,
      onboardingCompleted: user.onboardingCompleted,
      onboardingCompletedAt: user.onboardingCompletedAt,
    };
  });
}
