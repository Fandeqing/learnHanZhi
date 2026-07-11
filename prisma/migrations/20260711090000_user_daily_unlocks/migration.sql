ALTER TABLE "users"
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboardingCompletedAt" TIMESTAMPTZ(6),
ADD COLUMN "lastStudyDate" DATE,
ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "longestStreak" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "daily_character_completions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "characterId" UUID NOT NULL,
  "sectionId" UUID NOT NULL,
  "sessionId" UUID,
  "cardType" "StudyCardType" NOT NULL,
  "rating" "ReviewRating",
  "studyDate" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "daily_character_completions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_section_unlocks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "sectionId" UUID NOT NULL,
  "unlockedBySectionId" UUID,
  "learnedCountAtUnlock" INTEGER,
  "unlockedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_section_unlocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_character_completions_userId_characterId_studyDate_key"
ON "daily_character_completions"("userId", "characterId", "studyDate");

CREATE INDEX "daily_character_completions_userId_studyDate_idx"
ON "daily_character_completions"("userId", "studyDate");

CREATE INDEX "daily_character_completions_sessionId_idx"
ON "daily_character_completions"("sessionId");

CREATE UNIQUE INDEX "user_section_unlocks_userId_sectionId_key"
ON "user_section_unlocks"("userId", "sectionId");

CREATE INDEX "user_section_unlocks_userId_idx"
ON "user_section_unlocks"("userId");

ALTER TABLE "daily_character_completions"
ADD CONSTRAINT "daily_character_completions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_character_completions"
ADD CONSTRAINT "daily_character_completions_characterId_fkey"
FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_character_completions"
ADD CONSTRAINT "daily_character_completions_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_character_completions"
ADD CONSTRAINT "daily_character_completions_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_section_unlocks"
ADD CONSTRAINT "user_section_unlocks_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_section_unlocks"
ADD CONSTRAINT "user_section_unlocks_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
