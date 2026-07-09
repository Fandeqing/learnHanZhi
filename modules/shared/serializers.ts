import type {
  Character,
  CharacterStatus,
  StudyCardType,
  StudySession,
  StudySessionCard,
} from "@prisma/client";

export function serializeCharacter(character: Character) {
  return {
    id: character.id,
    hanzi: character.hanzi,
    pinyin: character.pinyin,
    meaningEn: character.meaningEn,
    structure: character.structure,
    memoryHook: character.memoryHook,
    exampleWord: character.exampleWord,
    exampleMeaning: character.exampleMeaning,
    sectionId: character.sectionId,
    difficulty: character.difficulty,
    audioText: character.audioText,
    orderIndex: character.orderIndex,
    isFree: character.isFree,
  };
}

export function serializeStudySessionCard(
  card: StudySessionCard & {
    character: Character;
  },
) {
  return {
    id: card.id,
    sessionId: card.sessionId,
    characterId: card.characterId,
    cardType: card.cardType as StudyCardType,
    rating: card.rating,
    revealed: card.revealed,
    reviewedAt: card.reviewedAt,
    character: {
      id: card.character.id,
      hanzi: card.character.hanzi,
      sectionId: card.character.sectionId,
      orderIndex: card.character.orderIndex,
    },
  };
}

export function serializeStudySession(
  session: StudySession & {
    cards: Array<
      StudySessionCard & {
        character: Character;
      }
    >;
  },
) {
  return {
    id: session.id,
    sessionType: session.sessionType,
    sectionId: session.sectionId,
    totalCards: session.totalCards,
    newCount: session.newCount,
    reviewCount: session.reviewCount,
    completedCount: session.completedCount,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    cards: session.cards.map(serializeStudySessionCard),
  };
}

export function publicStatus(status?: CharacterStatus | null) {
  return status ?? "NEW";
}
