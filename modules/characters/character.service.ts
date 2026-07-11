import { CharacterStatus } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { serializeCharacter } from "@/modules/shared/serializers";

export async function getCharacterDetail(
  userId: string,
  characterId: string,
  sessionId?: string | null,
) {
  const [user, character] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.character.findUnique({ where: { id: characterId } }),
  ]);

  if (!character) {
    throw new ApiError(404, "CHARACTER_NOT_FOUND", "Character not found.");
  }

  if (!user.isPro && !character.isFree) {
    throw new ApiError(
      403,
      "PAYWALL_REQUIRED",
      "Unlock Pro to continue learning all characters.",
      { paywallRequired: true },
    );
  }

  const progress = await prisma.userCharacterProgress.findUnique({
    where: {
      userId_characterId: {
        userId,
        characterId,
      },
    },
  });
  const isKnownToUser =
    progress &&
    progress.status !== CharacterStatus.NEW;
  const sessionCard = sessionId
    ? await prisma.studySessionCard.findFirst({
        where: {
          sessionId,
          userId,
          characterId,
        },
      })
    : null;
  const canRevealFromSession = Boolean(sessionCard);

  if (!isKnownToUser && !canRevealFromSession) {
    throw new ApiError(
      403,
      "CHARACTER_DETAIL_LOCKED",
      "Start learning this character before viewing full details.",
      {
        locked: true,
        character: {
          id: character.id,
          hanzi: character.hanzi,
          sectionId: character.sectionId,
          orderIndex: character.orderIndex,
          isFree: character.isFree,
        },
      },
    );
  }

  if (sessionId) {
    await prisma.$transaction(async (tx) => {
      await tx.studySessionCard.updateMany({
        where: {
          sessionId,
          userId,
          characterId,
        },
        data: { revealed: true },
      });

      await tx.userCharacterProgress.updateMany({
        where: {
          userId,
          characterId,
          status: CharacterStatus.NEW,
        },
        data: {
          status: CharacterStatus.LEARNING,
        },
      });
    });
  }

  return serializeCharacter(character);
}
