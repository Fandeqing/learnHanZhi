import { CharacterStatus } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { assertSectionUnlocked } from "@/modules/sections/section.service";
import { publicStatus } from "@/modules/shared/serializers";

export async function getSealBook(userId: string, sectionId: string) {
  try {
    await assertSectionUnlocked(userId, sectionId);
  } catch (error) {
    if (error instanceof ApiError && error.code === "SECTION_LOCKED") {
      throw new ApiError(403, "SECTION_LOCKED", "This section is locked.", {
        locked: true,
      });
    }

    throw error;
  }

  const characters = await prisma.character.findMany({
    where: { sectionId },
    orderBy: { orderIndex: "asc" },
    include: {
      userProgress: {
        where: { userId },
        take: 1,
      },
    },
  });

  return characters.map((character) => {
    const status = publicStatus(character.userProgress[0]?.status);
    const shouldShowHanzi =
      status === CharacterStatus.LEARNING ||
      status === CharacterStatus.LEARNED ||
      status === CharacterStatus.MASTERED;

    return {
      characterId: character.id,
      hanzi: shouldShowHanzi ? character.hanzi : null,
      status,
      orderIndex: character.orderIndex,
    };
  });
}
