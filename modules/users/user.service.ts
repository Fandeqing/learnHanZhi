import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  getBasicsSection,
  refreshUserSectionUnlocks,
} from "@/modules/sections/section.service";
import { createSessionToken } from "@/lib/session-token";
import {
  hashDeviceCredential,
  matchesDeviceCredential,
} from "@/lib/device-credential";

export const anonymousUserSchema = z.object({
  deviceId: z.string().trim().min(1, "deviceId is required."),
  deviceCredential: z.string().trim().min(32).max(512),
  studyTimeZone: z.string().trim().min(1).max(80).optional(),
});

export const completeOnboardingSchema = z.object({
  dailyNewCharacterGoal: z.union([z.literal(5), z.literal(10), z.literal(15)]).optional(),
  pronunciationEnabled: z.boolean().optional(),
  autoPlayEnabled: z.boolean().optional(),
});

export async function createAnonymousUser(input: z.infer<typeof anonymousUserSchema>) {
  const { deviceId, deviceCredential, studyTimeZone } = anonymousUserSchema.parse(input);
  const basics = await getBasicsSection();
  const validStudyTimeZone = normalizeStudyTimeZone(studyTimeZone);

  const user = await prisma.$transaction(async (tx) => {
    const existingDevice = await tx.userDevice.findUnique({
      where: { deviceId },
      include: { user: { include: { settings: true } } },
    });
    if (existingDevice) {
      if (
        existingDevice.credentialHash &&
        !matchesDeviceCredential(deviceCredential, existingDevice.credentialHash)
      ) {
        throw new ApiError(
          401,
          "INVALID_DEVICE_CREDENTIAL",
          "This installation could not be authenticated.",
        );
      }
      if (!existingDevice.credentialHash && existingDevice.user.appleSubject) {
        throw new ApiError(
          401,
          "APPLE_SIGN_IN_REQUIRED",
          "Sign in with Apple to restore this account.",
        );
      }

      const upsertedUser = await tx.user.update({
        where: { id: existingDevice.userId },
        data: {
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
        include: { settings: true },
      });
      await tx.userDevice.update({
        where: { id: existingDevice.id },
        data: {
          credentialHash:
            existingDevice.credentialHash ?? hashDeviceCredential(deviceCredential),
          lastSeenAt: new Date(),
        },
      });
      await refreshUserSectionUnlocks(upsertedUser.id, tx);
      return upsertedUser;
    }

    const createdUser = await tx.user.create({
      data: {
        devices: {
          create: {
            deviceId,
            credentialHash: hashDeviceCredential(deviceCredential),
          },
        },
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
      include: { settings: true },
    });
    await refreshUserSectionUnlocks(createdUser.id, tx);
    return createdUser;
  });

  return { user, sessionToken: createSessionToken(user.id, deviceId) };
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
