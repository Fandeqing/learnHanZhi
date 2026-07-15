UPDATE "sections"
SET
  "key" = 'city_life',
  "name" = 'City Life',
  "description" = 'Characters for navigating daily life in a Chinese-speaking city.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'expression';
