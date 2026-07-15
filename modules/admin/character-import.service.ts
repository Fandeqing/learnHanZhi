import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  LEVEL_SIZE,
  SECTION_CHARACTER_COUNT,
  TOTAL_CHARACTERS,
  TOTAL_LEVELS,
  contentSectionForLevel,
} from "@/modules/content/content-plan";
import { ensureDefaultSections } from "@/modules/sections/section.service";

export type CharacterImportMode = "upsert" | "replace";

const characterImportItemSchema = z.object({
  hanzi: z.string().trim().min(1, "hanzi is required."),
  pinyin: z.string().trim().min(1, "pinyin is required."),
  meaningEn: z.string().trim().min(1, "meaningEn is required."),
  structure: z.string().trim().min(1, "structure is required."),
  memoryHook: z.string().trim().min(1, "memoryHook is required."),
  exampleWord: z.string().trim().min(1, "exampleWord is required."),
  examplePinyin: z.string().trim().min(1, "examplePinyin is required."),
  exampleMeaningEn: z.string().trim().min(1, "exampleMeaningEn is required."),
  sectionKey: z.string().trim().min(1, "sectionKey is required."),
  level: z.number().int().min(1).max(TOTAL_LEVELS),
  orderInLevel: z.number().int().min(1).max(LEVEL_SIZE),
  difficulty: z.number().int().min(1).max(5).default(1),
  audioText: z.string().trim().min(1, "audioText is required."),
  orderIndex: z.number().int().positive("orderIndex must be positive."),
  isFree: z.boolean().default(false),
});

const characterImportSchema = z.array(characterImportItemSchema).min(1);

type CharacterImportItem = z.infer<typeof characterImportItemSchema>;

export async function importCharactersFromJson(
  rawJson: unknown,
  mode: CharacterImportMode = "upsert",
) {
  const items = characterImportSchema.parse(rawJson);
  validateNoDuplicateKeys(items);
  validateLevelOrdering(items);
  validateSectionAssignments(items);

  if (mode === "replace") {
    validateFullDataset(items);
  }

  await ensureDefaultSections();

  const sectionKeys = Array.from(new Set(items.map((item) => item.sectionKey)));
  const sections = await prisma.section.findMany({
    where: {
      key: {
        in: sectionKeys,
      },
    },
  });
  const sectionByKey = new Map(sections.map((section) => [section.key, section]));
  const missingSectionKeys = sectionKeys.filter((key) => !sectionByKey.has(key));

  if (missingSectionKeys.length > 0) {
    throw new ApiError(
      400,
      "UNKNOWN_SECTION_KEY",
      `Unknown sectionKey: ${missingSectionKeys.join(", ")}.`,
    );
  }

  let createdCount = 0;
  let updatedCount = 0;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deleted =
        mode === "replace" ? await clearCharacterDataset(tx) : null;
      const existingCharacters = await tx.character.findMany({
        where: {
          hanzi: {
            in: items.map((item) => item.hanzi),
          },
        },
        select: {
          hanzi: true,
        },
      });
      const existingHanzi = new Set(
        existingCharacters.map((character) => character.hanzi),
      );

      for (const item of items) {
        const section = sectionByKey.get(item.sectionKey);

        if (!section) {
          throw new ApiError(
            400,
            "UNKNOWN_SECTION_KEY",
            `Unknown sectionKey: ${item.sectionKey}.`,
          );
        }

        const data = {
          pinyin: item.pinyin,
          meaningEn: item.meaningEn,
          structure: item.structure,
          memoryHook: item.memoryHook,
          exampleWord: item.exampleWord,
          examplePinyin: item.examplePinyin,
          exampleMeaningEn: item.exampleMeaningEn,
          sectionId: section.id,
          difficulty: item.difficulty,
          audioText: item.audioText,
          orderIndex: item.orderIndex,
          isFree: item.isFree,
        };

        await tx.character.upsert({
          where: {
            hanzi: item.hanzi,
          },
          update: data,
          create: {
            hanzi: item.hanzi,
            ...data,
          },
        });

        if (existingHanzi.has(item.hanzi)) {
          updatedCount += 1;
        } else {
          createdCount += 1;
        }
      }

      return {
        totalCharacters: await tx.character.count(),
        deleted,
      };
    }, {
      maxWait: 10_000,
      timeout: 60_000,
    });

    return {
      mode,
      importedCount: items.length,
      createdCount,
      updatedCount,
      totalCharacters: result.totalCharacters,
      sectionKeys,
      deleted: result.deleted,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        409,
        "UNIQUE_CONSTRAINT_FAILED",
        `Import conflicts with an existing unique field: ${String(
          error.meta?.target ?? "unknown",
        )}.`,
      );
    }

    throw error;
  }
}

function validateLevelOrdering(items: CharacterImportItem[]) {
  for (const item of items) {
    const expectedOrderIndex =
      (item.level - 1) * LEVEL_SIZE + item.orderInLevel;

    if (item.orderIndex !== expectedOrderIndex) {
      throw new ApiError(
        400,
        "INVALID_LEVEL_ORDER",
        `Expected orderIndex ${expectedOrderIndex} for level ${item.level}, orderInLevel ${item.orderInLevel}.`,
      );
    }
  }
}

function validateSectionAssignments(items: CharacterImportItem[]) {
  for (const item of items) {
    const expectedSection = contentSectionForLevel(item.level);

    if (item.sectionKey !== expectedSection?.key) {
      throw new ApiError(
        400,
        "INVALID_SECTION_FOR_LEVEL",
        `Expected sectionKey ${expectedSection?.key ?? "unknown"} for level ${item.level}.`,
      );
    }
  }
}

function validateFullDataset(items: CharacterImportItem[]) {
  if (items.length !== TOTAL_CHARACTERS) {
    throw new ApiError(
      400,
      "FULL_DATASET_REQUIRED",
      `Full replacement requires exactly ${TOTAL_CHARACTERS} characters.`,
    );
  }

  for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
    const levelItems = items.filter((item) => item.level === level);
    const expectedSection = contentSectionForLevel(level);

    if (levelItems.length !== LEVEL_SIZE) {
      throw new ApiError(
        400,
        "INCOMPLETE_LEVEL",
        `Level ${level} must contain exactly ${LEVEL_SIZE} characters.`,
      );
    }

    const orderInLevel = new Set(levelItems.map((item) => item.orderInLevel));
    if (orderInLevel.size !== LEVEL_SIZE) {
      throw new ApiError(
        400,
        "DUPLICATE_LEVEL_ORDER",
        `Level ${level} must use each orderInLevel from 1 to ${LEVEL_SIZE} once.`,
      );
    }

    const sectionItems = items.filter(
      (item) => item.sectionKey === expectedSection?.key,
    );
    if (sectionItems.length !== SECTION_CHARACTER_COUNT) {
      throw new ApiError(
        400,
        "INCOMPLETE_SECTION",
        `Section ${expectedSection?.key ?? "unknown"} must contain exactly ${SECTION_CHARACTER_COUNT} characters.`,
      );
    }
  }
}

async function clearCharacterDataset(tx: Prisma.TransactionClient) {
  const deletedDailyCompletions = await tx.dailyCharacterCompletion.deleteMany();
  const deletedStudySessionCards = await tx.studySessionCard.deleteMany();
  const deletedStudySessions = await tx.studySession.deleteMany();
  const deletedProgress = await tx.userCharacterProgress.deleteMany();
  const deletedSectionUnlocks = await tx.userSectionUnlock.deleteMany();
  const deletedCharacters = await tx.character.deleteMany();

  return {
    dailyCharacterCompletions: deletedDailyCompletions.count,
    studySessionCards: deletedStudySessionCards.count,
    studySessions: deletedStudySessions.count,
    userCharacterProgress: deletedProgress.count,
    userSectionUnlocks: deletedSectionUnlocks.count,
    characters: deletedCharacters.count,
  };
}

function validateNoDuplicateKeys(items: CharacterImportItem[]) {
  const hanzi = new Set<string>();
  const sectionOrders = new Set<string>();

  for (const item of items) {
    if (hanzi.has(item.hanzi)) {
      throw new ApiError(
        400,
        "DUPLICATE_HANZI_IN_FILE",
        `Duplicate hanzi in file: ${item.hanzi}.`,
      );
    }

    hanzi.add(item.hanzi);

    const sectionOrderKey = `${item.sectionKey}:${item.orderIndex}`;
    if (sectionOrders.has(sectionOrderKey)) {
      throw new ApiError(
        400,
        "DUPLICATE_SECTION_ORDER_IN_FILE",
        `Duplicate sectionKey/orderIndex in file: ${sectionOrderKey}.`,
      );
    }

    sectionOrders.add(sectionOrderKey);
  }
}
