-- Preserve existing section IDs so characters, user settings, and unlocks remain linked.
UPDATE "sections"
SET
  "key" = 'people_and_home',
  "name" = 'People & Home',
  "description" = 'Characters for people, family, and the home.',
  "orderIndex" = 2,
  "totalCharacters" = 100,
  "unlockLearnedRequired" = 67
WHERE "key" = 'daily_life';

UPDATE "sections"
SET
  "key" = 'daily_routines',
  "name" = 'Daily Routines',
  "description" = 'Characters for everyday actions and routines.',
  "orderIndex" = 3,
  "totalCharacters" = 100,
  "unlockLearnedRequired" = 67
WHERE "key" = 'city_life';
