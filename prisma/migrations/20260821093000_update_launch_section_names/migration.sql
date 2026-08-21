UPDATE "sections"
SET "name" = CASE "key"
  WHEN 'basics' THEN 'Foundations'
  WHEN 'people_and_home' THEN 'People & Actions'
  WHEN 'daily_life' THEN 'Home & Daily Life'
  WHEN 'around_town' THEN 'Nature & Movement'
  WHEN 'work_and_world' THEN 'Communication & Connections'
  ELSE "name"
END
WHERE "key" IN (
  'basics',
  'people_and_home',
  'daily_life',
  'around_town',
  'work_and_world'
);
