-- Keep the existing section ID so user settings and progress remain linked.
UPDATE "sections"
SET
  "key" = 'around_town',
  "name" = 'Around Town',
  "description" = 'Characters for places, travel, and getting around town.'
WHERE "key" = 'school_and_city';

UPDATE "sections"
SET
  "totalCharacters" = 60,
  "unlockLearnedRequired" = 40;

ALTER TABLE "sections"
  ALTER COLUMN "totalCharacters" SET DEFAULT 60,
  ALTER COLUMN "unlockLearnedRequired" SET DEFAULT 40;
