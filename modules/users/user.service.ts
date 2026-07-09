import { z } from "zod";
import { prisma } from "@/lib/db";
import { getBasicsSection } from "@/modules/sections/section.service";

export const anonymousUserSchema = z.object({
  deviceId: z.string().trim().min(1, "deviceId is required."),
});

export async function createAnonymousUser(input: z.infer<typeof anonymousUserSchema>) {
  const { deviceId } = anonymousUserSchema.parse(input);
  const basics = await getBasicsSection();

  return prisma.user.upsert({
    where: { deviceId },
    update: {},
    create: {
      deviceId,
      settings: {
        create: {
          dailyNewCharacterGoal: 5,
          pronunciationEnabled: true,
          autoPlayEnabled: false,
          currentSectionId: basics.id,
        },
      },
    },
    include: {
      settings: true,
    },
  });
}
