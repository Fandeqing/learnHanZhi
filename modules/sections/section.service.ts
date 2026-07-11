import { CharacterStatus, Prisma, type Section } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";

const defaultSections = [
  {
    key: "basics",
    name: "Basics",
    description: "The most common beginner Chinese characters.",
    orderIndex: 1,
  },
  {
    key: "daily_life",
    name: "Daily Life",
    description: "Characters for daily life and common objects.",
    orderIndex: 2,
  },
  {
    key: "expression",
    name: "Expression",
    description: "Characters used in simple expressions and sentences.",
    orderIndex: 3,
  },
] as const;

export async function ensureDefaultSections() {
  await prisma.$transaction(
    defaultSections.map((section) =>
      prisma.section.upsert({
        where: { key: section.key },
        update: {},
        create: section,
      }),
    ),
  );
}

export async function getBasicsSection() {
  await ensureDefaultSections();

  const basics = await prisma.section.findUnique({
    where: { key: "basics" },
  });

  if (!basics) {
    throw new ApiError(500, "BASICS_SECTION_MISSING", "Basics section is missing.");
  }

  return basics;
}

export async function getSectionsForUser(userId: string) {
  await ensureDefaultSections();
  await refreshUserSectionUnlocks(userId);

  const sections = await prisma.section.findMany({
    orderBy: { orderIndex: "asc" },
    include: {
      _count: {
        select: {
          characters: true,
        },
      },
    },
  });

  const learnedCounts = await prisma.userCharacterProgress.groupBy({
    by: ["sectionId"],
    where: {
      userId,
      status: {
        in: [CharacterStatus.LEARNED, CharacterStatus.MASTERED],
      },
    },
    _count: {
      _all: true,
    },
  });

  const learnedBySectionId = new Map(
    learnedCounts.map((count) => [count.sectionId, count._count._all]),
  );
  const permanentUnlocks = await prisma.userSectionUnlock.findMany({
    where: { userId },
    select: { sectionId: true },
  });
  const unlockedSectionIds = new Set(
    permanentUnlocks.map((unlock) => unlock.sectionId),
  );

  return sections.map((section, index) => {
    const previousSection = sections[index - 1];
    const previousLearnedCount = previousSection
      ? learnedBySectionId.get(previousSection.id) ?? 0
      : 0;
    const requiredLearnedCount = previousSection?.unlockLearnedRequired ?? 0;
    const liveThresholdUnlocked =
      index === 0 || previousLearnedCount >= requiredLearnedCount;
    const isUnlocked =
      liveThresholdUnlocked || unlockedSectionIds.has(section.id);

    return {
      id: section.id,
      key: section.key,
      name: section.name,
      description: section.description,
      orderIndex: section.orderIndex,
      learnedCount: learnedBySectionId.get(section.id) ?? 0,
      totalCount: section._count.characters || section.totalCharacters,
      isUnlocked,
      requiredLearnedCount,
      remainingToUnlock: isUnlocked
        ? 0
        : Math.max(requiredLearnedCount - previousLearnedCount, 0),
    };
  });
}

export async function refreshUserSectionUnlocks(
  userId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const sections = await client.section.findMany({
    orderBy: { orderIndex: "asc" },
  });

  if (sections.length === 0) {
    return;
  }

  await client.userSectionUnlock.upsert({
    where: {
      userId_sectionId: {
        userId,
        sectionId: sections[0].id,
      },
    },
    update: {},
    create: {
      userId,
      sectionId: sections[0].id,
      learnedCountAtUnlock: 0,
    },
  });

  const learnedCounts = await client.userCharacterProgress.groupBy({
    by: ["sectionId"],
    where: {
      userId,
      status: {
        in: [CharacterStatus.LEARNED, CharacterStatus.MASTERED],
      },
    },
    _count: {
      _all: true,
    },
  });
  const learnedBySectionId = new Map(
    learnedCounts.map((count) => [count.sectionId, count._count._all]),
  );

  for (let index = 1; index < sections.length; index += 1) {
    const previousSection = sections[index - 1];
    const section = sections[index];
    const previousLearnedCount = learnedBySectionId.get(previousSection.id) ?? 0;

    if (previousLearnedCount >= previousSection.unlockLearnedRequired) {
      await client.userSectionUnlock.upsert({
        where: {
          userId_sectionId: {
            userId,
            sectionId: section.id,
          },
        },
        update: {},
        create: {
          userId,
          sectionId: section.id,
          unlockedBySectionId: previousSection.id,
          learnedCountAtUnlock: previousLearnedCount,
        },
      });
    }
  }
}

export async function assertSectionUnlocked(userId: string, sectionId: string) {
  const sections = await getSectionsForUser(userId);
  const section = sections.find((item) => item.id === sectionId);

  if (!section) {
    throw new ApiError(404, "SECTION_NOT_FOUND", "Section not found.");
  }

  if (!section.isUnlocked) {
    throw new ApiError(403, "SECTION_LOCKED", "This section is locked.");
  }

  return section;
}

export async function getNextSection(userId: string, currentSection: Section) {
  const sections = await getSectionsForUser(userId);
  return (
    sections.find((section) => section.orderIndex === currentSection.orderIndex + 1) ??
    null
  );
}
