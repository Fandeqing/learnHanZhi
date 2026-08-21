import { prisma } from "@/lib/db";
import {
  currentCourseCharacterWhere,
  currentCourseSectionWhere,
} from "@/modules/content/current-course";

export async function getCharacterDataPackage() {
  const [sections, characters, latestCharacter] = await Promise.all([
    prisma.section.findMany({
      where: currentCourseSectionWhere(),
      orderBy: { orderIndex: "asc" },
    }),
    prisma.character.findMany({
      where: currentCourseCharacterWhere(),
      orderBy: [{ sectionId: "asc" }, { orderIndex: "asc" }],
    }),
    prisma.character.findFirst({
      where: currentCourseCharacterWhere(),
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
