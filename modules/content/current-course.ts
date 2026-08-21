import { Prisma } from "@prisma/client";
import {
  CONTENT_SECTION_KEYS,
  TOTAL_CHARACTERS,
} from "@/modules/content/content-plan";

export function currentCourseCharacterWhere(): Prisma.CharacterWhereInput {
  return {
    orderIndex: { gte: 1, lte: TOTAL_CHARACTERS },
    section: { key: { in: [...CONTENT_SECTION_KEYS] } },
  };
}

export function currentCourseSectionWhere(): Prisma.SectionWhereInput {
  return { key: { in: [...CONTENT_SECTION_KEYS] } };
}
