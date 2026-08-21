import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FREE_CHARACTER_LIMIT } from "@/modules/access/free-tier.service";
import {
  CONTENT_SECTIONS,
  LEVEL_SIZE,
  LEVELS_PER_SECTION,
  SECTION_CHARACTER_COUNT,
  TOTAL_CHARACTERS,
  TOTAL_LEVELS,
  contentSectionForLevel,
} from "./content-plan";

type CourseItem = {
  hanzi: string;
  pinyin: string;
  meaningEn: string;
  structure: string;
  memoryHook: string;
  exampleWord: string;
  examplePinyin: string;
  exampleMeaningEn: string;
  sectionKey: string;
  level: number;
  orderInLevel: number;
  difficulty?: number;
  audioText: string;
  orderIndex: number;
  isFree: boolean;
};

const courseItemKeys = [
  "audioText",
  "exampleMeaningEn",
  "examplePinyin",
  "exampleWord",
  "hanzi",
  "isFree",
  "level",
  "meaningEn",
  "memoryHook",
  "orderInLevel",
  "orderIndex",
  "pinyin",
  "sectionKey",
  "structure",
];

const course = JSON.parse(
  readFileSync(join(process.cwd(), "data/hanzi_300_launch_final.json"), "utf8"),
) as CourseItem[];

describe("launch course plan", () => {
  it("uses the 300 Hanzi, 15 level structure", () => {
    expect(TOTAL_CHARACTERS).toBe(300);
    expect(TOTAL_LEVELS).toBe(15);
    expect(LEVELS_PER_SECTION).toBe(3);
    expect(LEVEL_SIZE).toBe(20);
    expect(SECTION_CHARACTER_COUNT).toBe(60);
    expect(CONTENT_SECTIONS).toHaveLength(5);
  });

  it("maps section 1 to levels 1-3 and section 5 to levels 13-15", () => {
    expect([1, 2, 3].map((level) => contentSectionForLevel(level)?.key)).toEqual([
      "basics",
      "basics",
      "basics",
    ]);
    expect([13, 14, 15].map((level) => contentSectionForLevel(level)?.key)).toEqual([
      "work_and_world",
      "work_and_world",
      "work_and_world",
    ]);
    expect(contentSectionForLevel(16)).toBeNull();
  });

  it("uses the final launch section names", () => {
    expect(CONTENT_SECTIONS.map((section) => section.name)).toEqual([
      "Foundations",
      "People & Actions",
      "Home & Daily Life",
      "Nature & Movement",
      "Communication & Connections",
    ]);
  });
});

describe("hanzi_300_launch_final.json", () => {
  it("keeps the production character schema and required content", () => {
    for (const item of course) {
      expect(Object.keys(item).sort()).toEqual(courseItemKeys);
      expect([
        item.hanzi,
        item.pinyin,
        item.meaningEn,
        item.structure,
        item.memoryHook,
        item.exampleWord,
        item.examplePinyin,
        item.exampleMeaningEn,
        item.sectionKey,
        item.audioText,
      ].every((value) => value.trim().length > 0)).toBe(true);
      expect(item.difficulty ?? 1).toBeGreaterThanOrEqual(1);
      expect(item.difficulty ?? 1).toBeLessThanOrEqual(5);
    }
  });

  it("contains exactly 300 unique Hanzi in continuous course order", () => {
    expect(course).toHaveLength(TOTAL_CHARACTERS);
    expect(new Set(course.map((item) => item.hanzi)).size).toBe(TOTAL_CHARACTERS);
    expect(course.map((item) => item.orderIndex)).toEqual(
      Array.from({ length: TOTAL_CHARACTERS }, (_, index) => index + 1),
    );
  });

  it("contains 15 complete levels and five complete sections", () => {
    expect(new Set(course.map((item) => item.level))).toEqual(
      new Set(Array.from({ length: TOTAL_LEVELS }, (_, index) => index + 1)),
    );

    for (let level = 1; level <= TOTAL_LEVELS; level += 1) {
      const levelItems = course.filter((item) => item.level === level);
      expect(levelItems).toHaveLength(LEVEL_SIZE);
      expect(levelItems.map((item) => item.orderInLevel)).toEqual(
        Array.from({ length: LEVEL_SIZE }, (_, index) => index + 1),
      );
      expect(new Set(levelItems.map((item) => item.sectionKey))).toEqual(
        new Set([contentSectionForLevel(level)?.key]),
      );
    }

    for (const section of CONTENT_SECTIONS) {
      expect(course.filter((item) => item.sectionKey === section.key)).toHaveLength(
        SECTION_CHARACTER_COUNT,
      );
    }
  });

  it("keeps exactly the first 30 Hanzi free", () => {
    expect(FREE_CHARACTER_LIMIT).toBe(30);
    expect(course.filter((item) => item.isFree)).toHaveLength(FREE_CHARACTER_LIMIT);
    expect(course.every((item) => item.isFree === (item.orderIndex <= 30))).toBe(true);
  });
});
