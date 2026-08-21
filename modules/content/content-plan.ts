export const LEVEL_SIZE = 20;
export const LEVELS_PER_SECTION = 3;
export const SECTION_CHARACTER_COUNT = LEVEL_SIZE * LEVELS_PER_SECTION;
export const SECTION_UNLOCK_LEARNED_REQUIRED = 40;

export const CONTENT_SECTIONS = [
  {
    key: "basics",
    name: "Foundations",
    subtitle: "基础",
    description: "The most common beginner Chinese characters.",
    orderIndex: 1,
  },
  {
    key: "people_and_home",
    name: "People & Actions",
    subtitle: "人物与家",
    description: "Characters for people, family, and the home.",
    orderIndex: 2,
  },
  {
    key: "daily_life",
    name: "Home & Daily Life",
    subtitle: "日常生活",
    description: "Characters for everyday life and routines.",
    orderIndex: 3,
  },
  {
    key: "around_town",
    name: "Nature & Movement",
    subtitle: "校园与城市",
    description: "Characters for places, travel, and getting around town.",
    orderIndex: 4,
  },
  {
    key: "work_and_world",
    name: "Communication & Connections",
    subtitle: "工作与世界",
    description: "Characters for work, travel, and broader conversations.",
    orderIndex: 5,
  },
] as const;

export type ContentSectionKey = (typeof CONTENT_SECTIONS)[number]["key"];

export const TOTAL_LEVELS = CONTENT_SECTIONS.length * LEVELS_PER_SECTION;
export const TOTAL_CHARACTERS = TOTAL_LEVELS * LEVEL_SIZE;
export const CONTENT_SECTION_KEYS = CONTENT_SECTIONS.map((section) => section.key);

export function contentSectionForLevel(level: number) {
  const sectionIndex = Math.floor((level - 1) / LEVELS_PER_SECTION);
  return CONTENT_SECTIONS[sectionIndex] ?? null;
}
