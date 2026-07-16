import { CharacterStatus } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { serializeCharacter } from "@/modules/shared/serializers";

export async function getCharacterDetail(
  userId: string,
  characterId: string,
  sessionId?: string | null,
) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!character) {
    throw new ApiError(404, "CHARACTER_NOT_FOUND", "Character not found.");
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
    await prisma.studySessionCard.updateMany({
      where: {
        sessionId,
        userId,
        characterId,
      },
      data: { revealed: true },
    });
  }

  return serializeCharacter(character);
}
