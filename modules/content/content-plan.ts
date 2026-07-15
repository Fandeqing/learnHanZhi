export const LEVEL_SIZE = 20;
export const LEVELS_PER_SECTION = 5;
export const SECTION_CHARACTER_COUNT = LEVEL_SIZE * LEVELS_PER_SECTION;
export const SECTION_UNLOCK_LEARNED_REQUIRED = 67;

export const CONTENT_SECTIONS = [
  {
    key: "basics",
    name: "Basics",
    subtitle: "基础",
    description: "The most common beginner Chinese characters.",
    orderIndex: 1,
  },
  {
    key: "people_and_home",
    name: "People & Home",
    subtitle: "人物与家",
    description: "Characters for people, family, and the home.",
    orderIndex: 2,
  },
  {
    key: "daily_routines",
    name: "Daily Routines",
    subtitle: "日常生活",
    description: "Characters for everyday actions and routines.",
    orderIndex: 3,
  },
  {
    key: "around_town",
    name: "Around Town",
    subtitle: "城镇出行",
    description: "Characters for places, travel, and getting around town.",
    orderIndex: 4,
  },
  {
    key: "explore_more",
    name: "Explore More",
    subtitle: "探索进阶",
    description: "Characters for broader conversations and exploration.",
    orderIndex: 5,
  },
] as const;

export type ContentSectionKey = (typeof CONTENT_SECTIONS)[number]["key"];

export const TOTAL_LEVELS = CONTENT_SECTIONS.length * LEVELS_PER_SECTION;
export const TOTAL_CHARACTERS = TOTAL_LEVELS * LEVEL_SIZE;

export function contentSectionForLevel(level: number) {
  const sectionIndex = Math.floor((level - 1) / LEVELS_PER_SECTION);
  return CONTENT_SECTIONS[sectionIndex] ?? null;
}
