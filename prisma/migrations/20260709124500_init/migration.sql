CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "CharacterStatus" AS ENUM ('NEW', 'LEARNING', 'LEARNED', 'MASTERED');
CREATE TYPE "StudySessionType" AS ENUM ('DAILY', 'REVIEW_AGAIN', 'LEARN_MORE', 'MANUAL_REVIEW');
CREATE TYPE "StudyCardType" AS ENUM ('NEW', 'REVIEW');
CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY', 'KNOW');
CREATE TYPE "PurchasePlatform" AS ENUM ('IOS');
CREATE TYPE "PurchaseStatus" AS ENUM ('ACTIVE', 'REFUNDED', 'REVOKED', 'PENDING');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "deviceId" TEXT NOT NULL,
  "isPro" BOOLEAN NOT NULL DEFAULT false,
  "proPurchasedAt" TIMESTAMPTZ(6),
  "appleOriginalTransactionId" TEXT,
  "appleProductId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "orderIndex" INTEGER NOT NULL,
  "unlockLearnedRequired" INTEGER NOT NULL DEFAULT 67,
  "totalCharacters" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "dailyNewCharacterGoal" INTEGER NOT NULL DEFAULT 5,
  "pronunciationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "autoPlayEnabled" BOOLEAN NOT NULL DEFAULT false,
  "currentSectionId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "characters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "hanzi" TEXT NOT NULL,
  "pinyin" TEXT NOT NULL,
  "meaningEn" TEXT NOT NULL,
  "structure" TEXT NOT NULL,
  "memoryHook" TEXT NOT NULL,
  "exampleWord" TEXT NOT NULL,
  "exampleMeaning" TEXT NOT NULL,
  "sectionId" UUID NOT NULL,
  "difficulty" INTEGER NOT NULL DEFAULT 1,
  "audioText" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "isFree" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_character_progress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "characterId" UUID NOT NULL,
  "sectionId" UUID NOT NULL,
  "status" "CharacterStatus" NOT NULL DEFAULT 'NEW',
  "lastReviewedAt" TIMESTAMPTZ(6),
  "nextReviewAt" TIMESTAMPTZ(6),
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "consecutiveSuccessCount" INTEGER NOT NULL DEFAULT 0,
  "isMastered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_character_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "sessionType" "StudySessionType" NOT NULL,
  "sectionId" UUID,
  "totalCards" INTEGER NOT NULL DEFAULT 0,
  "newCount" INTEGER NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "completedCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "study_session_cards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "characterId" UUID NOT NULL,
  "cardType" "StudyCardType" NOT NULL,
  "rating" "ReviewRating",
  "revealed" BOOLEAN NOT NULL DEFAULT false,
  "reviewedAt" TIMESTAMPTZ(6),
  "statusBefore" "CharacterStatus",
  "statusAfter" "CharacterStatus",
  "becameSeal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "study_session_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "platform" "PurchasePlatform" NOT NULL DEFAULT 'IOS',
  "productId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "originalTransactionId" TEXT NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "purchasedAt" TIMESTAMPTZ(6),
  "revokedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_deviceId_key" ON "users"("deviceId");
CREATE UNIQUE INDEX "sections_key_key" ON "sections"("key");
CREATE UNIQUE INDEX "sections_orderIndex_key" ON "sections"("orderIndex");
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");
CREATE INDEX "user_settings_currentSectionId_idx" ON "user_settings"("currentSectionId");
CREATE UNIQUE INDEX "characters_hanzi_key" ON "characters"("hanzi");
CREATE UNIQUE INDEX "characters_sectionId_orderIndex_key" ON "characters"("sectionId", "orderIndex");
CREATE INDEX "characters_sectionId_idx" ON "characters"("sectionId");
CREATE INDEX "characters_isFree_idx" ON "characters"("isFree");
CREATE UNIQUE INDEX "user_character_progress_userId_characterId_key" ON "user_character_progress"("userId", "characterId");
CREATE INDEX "user_character_progress_userId_status_nextReviewAt_idx" ON "user_character_progress"("userId", "status", "nextReviewAt");
CREATE INDEX "user_character_progress_userId_sectionId_status_idx" ON "user_character_progress"("userId", "sectionId", "status");
CREATE INDEX "user_character_progress_characterId_idx" ON "user_character_progress"("characterId");
CREATE INDEX "study_sessions_userId_startedAt_idx" ON "study_sessions"("userId", "startedAt");
CREATE INDEX "study_sessions_sessionType_idx" ON "study_sessions"("sessionType");
CREATE INDEX "study_sessions_sectionId_idx" ON "study_sessions"("sectionId");
CREATE UNIQUE INDEX "study_session_cards_sessionId_characterId_key" ON "study_session_cards"("sessionId", "characterId");
CREATE INDEX "study_session_cards_sessionId_idx" ON "study_session_cards"("sessionId");
CREATE INDEX "study_session_cards_sessionId_becameSeal_idx" ON "study_session_cards"("sessionId", "becameSeal");
CREATE INDEX "study_session_cards_userId_characterId_idx" ON "study_session_cards"("userId", "characterId");
CREATE INDEX "study_session_cards_rating_idx" ON "study_session_cards"("rating");
CREATE UNIQUE INDEX "purchases_transactionId_key" ON "purchases"("transactionId");
CREATE INDEX "purchases_userId_status_idx" ON "purchases"("userId", "status");
CREATE INDEX "purchases_originalTransactionId_idx" ON "purchases"("originalTransactionId");

ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_currentSectionId_fkey" FOREIGN KEY ("currentSectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "characters" ADD CONSTRAINT "characters_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_character_progress" ADD CONSTRAINT "user_character_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_character_progress" ADD CONSTRAINT "user_character_progress_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_character_progress" ADD CONSTRAINT "user_character_progress_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "study_session_cards" ADD CONSTRAINT "study_session_cards_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_session_cards" ADD CONSTRAINT "study_session_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_session_cards" ADD CONSTRAINT "study_session_cards_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
