-- Keep section IDs stable so existing settings and unlock references remain valid.
UPDATE "sections"
SET
  "key" = 'daily_life',
  "name" = 'Daily Life',
  "description" = 'Characters for everyday life and routines.'
WHERE "key" = 'daily_routines';

UPDATE "sections"
SET
  "key" = 'school_and_city',
  "name" = 'School & City',
  "description" = 'Characters for school, places, and getting around town.'
WHERE "key" = 'around_town';

UPDATE "sections"
SET
  "key" = 'work_and_world',
  "name" = 'Work & World',
  "description" = 'Characters for work, travel, and broader conversations.'
WHERE "key" = 'explore_more';
