import { prisma } from "@/lib/db";

export async function getCharacterDataPackage() {
  const [sections, characters, latestCharacter] = await Promise.all([
    prisma.section.findMany({
      orderBy: { orderIndex: "asc" },
    }),
    prisma.character.findMany({
      orderBy: [{ sectionId: "asc" }, { orderIndex: "asc" }],
    }),
    prisma.character.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  return {
    version: latestCharacter?.updatedAt.toISOString() ?? "empty",
    generatedAt: new Date().toISOString(),
    sections: sections.map((section) => ({
      id: section.id,
      key: section.key,
      name: section.name,
      description: section.description,
      orderIndex: section.orderIndex,
      unlockLearnedRequired: section.unlockLearnedRequired,
      totalCharacters: section.totalCharacters,
      updatedAt: section.updatedAt,
    })),
    characters: characters.map((character) => ({
      id: character.id,
      hanzi: character.hanzi,
      pinyin: character.pinyin,
      meaningEn: character.meaningEn,
      structure: character.structure,
      memoryHook: character.memoryHook,
      exampleWord: character.exampleWord,
      examplePinyin: character.examplePinyin,
      exampleMeaningEn: character.exampleMeaningEn,
      sectionId: character.sectionId,
      difficulty: character.difficulty,
      audioText: character.audioText,
      orderIndex: character.orderIndex,
      isFree: character.isFree,
      updatedAt: character.updatedAt,
    })),
  };
}
