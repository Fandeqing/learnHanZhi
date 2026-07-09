import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { ensureDefaultSections } from "@/modules/sections/section.service";

const characterImportItemSchema = z.object({
  hanzi: z.string().trim().min(1, "hanzi is required."),
  pinyin: z.string().trim().min(1, "pinyin is required."),
  meaningEn: z.string().trim().min(1, "meaningEn is required."),
  structure: z.string().trim().min(1, "structure is required."),
  memoryHook: z.string().trim().min(1, "memoryHook is required."),
  exampleWord: z.string().trim().min(1, "exampleWord is required."),
  exampleMeaning: z.string().trim().min(1, "exampleMeaning is required."),
  sectionKey: z.string().trim().min(1, "sectionKey is required."),
  difficulty: z.number().int().min(1).max(5).default(1),
  audioText: z.string().trim().min(1, "audioText is required."),
  orderIndex: z.number().int().positive("orderIndex must be positive."),
  isFree: z.boolean().default(false),
});

const characterImportSchema = z.array(characterImportItemSchema).min(1);

type CharacterImportItem = z.infer<typeof characterImportItemSchema>;

export async function importCharactersFromJson(rawJson: unknown) {
  const items = characterImportSchema.parse(rawJson);
  validateNoDuplicateKeys(items);

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
          exampleMeaning: item.exampleMeaning,
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

      return tx.character.count();
    });

    return {
      importedCount: items.length,
      createdCount,
      updatedCount,
      totalCharacters: result,
      sectionKeys,
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
