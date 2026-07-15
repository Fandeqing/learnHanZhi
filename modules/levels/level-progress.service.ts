import {
  CharacterStatus,
  Prisma,
  StudyCardType,
  type Character,
  type Section,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  LEVEL_SIZE,
  TOTAL_LEVELS,
  contentSectionForLevel,
} from "@/modules/content/content-plan";

export { LEVEL_SIZE, TOTAL_LEVELS } from "@/modules/content/content-plan";

export type LevelState = "locked" | "notStarted" | "inProgress" | "completed" | "mastered";

export type LevelProgress = {
  levelIndex: number;
  learnedCount: number;
  totalCount: number;
  state: LevelState;
  sectionId: string | null;
  sectionKey: string | null;
  sectionName: string | null;
  title: string;
  subtitle: string | null;
  startOrderIndex: number | null;
  endOrderIndex: number | null;
};

type OrderedCharacter = Character & {
  section: Section;
};

type Client = Prisma.TransactionClient | typeof prisma;

export async function getBambooProgress(
  userId: string,
  client: Client = prisma,
) {
  const characters = await getOrderedCharacters(client);
  const levelBuckets = bucketCharacters(characters);

  const [learnedCompletions, masteredProgress] = await Promise.all([
    client.dailyCharacterCompletion.findMany({
      where: {
        userId,
        cardType: StudyCardType.NEW,
      },
      distinct: ["characterId"],
      select: { characterId: true },
    }),
    client.userCharacterProgress.findMany({
      where: {
        userId,
        status: CharacterStatus.MASTERED,
      },
      select: { characterId: true },
    }),
  ]);

  const learnedIds = new Set(learnedCompletions.map((item) => item.characterId));
  const masteredIds = new Set(masteredProgress.map((item) => item.characterId));

  const levelProgress = levelBuckets.map((levelCharacters, index) => {
    const levelIndex = index + 1;
    const learnedCount = levelCharacters.filter((character) =>
      learnedIds.has(character.id),
    ).length;
    const masteredCount = levelCharacters.filter((character) =>
      masteredIds.has(character.id),
    ).length;
    const totalCount = levelCharacters.length || LEVEL_SIZE;
    const previousCompleted =
      index === 0 ||
      levelBuckets[index - 1].filter((character) => learnedIds.has(character.id))
        .length >= LEVEL_SIZE;
    const isUnlocked = previousCompleted || learnedCount > 0;
    const firstCharacter = levelCharacters[0];
    const lastCharacter = levelCharacters[levelCharacters.length - 1];
    const configuredSection = contentSectionForLevel(levelIndex);
    const completed = learnedCount >= totalCount && totalCount > 0;
    const mastered = completed && masteredCount >= totalCount;

    return {
      levelIndex,
      learnedCount,
      totalCount,
      state: mastered
        ? "mastered"
        : completed
          ? "completed"
          : !isUnlocked
            ? "locked"
            : learnedCount > 0
              ? "inProgress"
              : "notStarted",
      sectionId: firstCharacter?.sectionId ?? null,
      sectionKey: firstCharacter?.section.key ?? configuredSection?.key ?? null,
      sectionName: firstCharacter?.section.name ?? configuredSection?.name ?? null,
      title: levelTitle(levelIndex),
      subtitle: levelSubtitle(levelIndex),
      startOrderIndex: firstCharacter?.orderIndex ?? null,
      endOrderIndex: lastCharacter?.orderIndex ?? null,
    } satisfies LevelProgress;
  });

  const completedLevelsCount = levelProgress.filter((level) =>
    level.state === "completed" || level.state === "mastered",
  ).length;
  const currentLevel =
    levelProgress.find((level) =>
      level.state === "notStarted" || level.state === "inProgress",
    ) ?? levelProgress[levelProgress.length - 1] ?? null;

  return {
    totalLevels: TOTAL_LEVELS,
    completedLevelsCount,
    currentLevelIndex: currentLevel?.levelIndex ?? null,
    levelProgress,
  };
}

export async function findAvailableNewCharactersForCurrentLevel(
  client: Client,
  input: {
    userId: string;
    isPro: boolean;
    take: number;
  },
) {
  const characters = await getOrderedCharacters(client);
  const levelBuckets = bucketCharacters(characters);
  const completions = await client.dailyCharacterCompletion.findMany({
    where: {
      userId: input.userId,
      cardType: StudyCardType.NEW,
    },
    distinct: ["characterId"],
    select: { characterId: true },
  });
  const learnedIds = new Set(completions.map((item) => item.characterId));
  const currentLevelCharacters =
    levelBuckets.find((levelCharacters, index) => {
      const learnedCount = levelCharacters.filter((character) =>
        learnedIds.has(character.id),
      ).length;
      const previousCompleted =
        index === 0 ||
        levelBuckets[index - 1].filter((character) => learnedIds.has(character.id))
          .length >= LEVEL_SIZE;

      return previousCompleted && learnedCount < levelCharacters.length;
    }) ?? [];

  const candidateIds = currentLevelCharacters
    .filter((character) => input.isPro || character.isFree)
    .map((character) => character.id);

  if (candidateIds.length === 0) {
    return [];
  }

  return client.character.findMany({
    where: {
      id: { in: candidateIds },
      OR: [
        { userProgress: { none: { userId: input.userId } } },
        {
          userProgress: {
            some: { userId: input.userId, status: CharacterStatus.NEW },
          },
        },
        {
          userProgress: {
            some: {
              userId: input.userId,
              status: CharacterStatus.LEARNING,
              nextReviewAt: null,
            },
          },
        },
      ],
    },
    orderBy: [
      { section: { orderIndex: "asc" } },
      { orderIndex: "asc" },
    ],
    take: input.take,
  });
}

export async function getNewlyCompletedLevelIndexes(
  userId: string,
  newCharacterIds: string[],
) {
  if (newCharacterIds.length === 0) {
    return [];
  }

  const characters = await getOrderedCharacters(prisma);
  const levelBuckets = bucketCharacters(characters);
  const completions = await prisma.dailyCharacterCompletion.findMany({
    where: {
      userId,
      cardType: StudyCardType.NEW,
    },
    distinct: ["characterId"],
    select: { characterId: true },
  });
  const learnedIds = new Set(completions.map((item) => item.characterId));
  const newIds = new Set(newCharacterIds);

  return levelBuckets.flatMap((levelCharacters, index) => {
    const learnedCount = levelCharacters.filter((character) =>
      learnedIds.has(character.id),
    ).length;
    if (learnedCount < LEVEL_SIZE) {
      return [];
    }

    const sessionNewCount = levelCharacters.filter((character) =>
      newIds.has(character.id),
    ).length;
    return learnedCount - sessionNewCount < LEVEL_SIZE ? [index + 1] : [];
  });
}

async function getOrderedCharacters(client: Client) {
  return client.character.findMany({
    orderBy: [
      { section: { orderIndex: "asc" } },
      { orderIndex: "asc" },
    ],
    include: { section: true },
    take: TOTAL_LEVELS * LEVEL_SIZE,
  }) as Promise<OrderedCharacter[]>;
}

function bucketCharacters(characters: OrderedCharacter[]) {
  return Array.from({ length: TOTAL_LEVELS }, (_, index) =>
    characters.slice(index * LEVEL_SIZE, (index + 1) * LEVEL_SIZE),
  );
}

function levelTitle(levelIndex: number) {
  const numberIndex = (levelIndex - 1) % 5;
  const section = contentSectionForLevel(levelIndex);
  const numerals = ["I", "II", "III", "IV", "V"];
  return `${section?.name ?? "Level"} ${numerals[numberIndex] ?? levelIndex}`;
}

function levelSubtitle(levelIndex: number) {
  const numberIndex = (levelIndex - 1) % 5;
  const section = contentSectionForLevel(levelIndex);
  const numerals = ["一", "二", "三", "四", "五"];
  const numeral = numerals[numberIndex];
  return section && numeral ? `${section.subtitle} ${numeral}` : null;
}
