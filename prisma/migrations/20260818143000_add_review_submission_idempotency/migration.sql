CREATE TABLE "review_submissions" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "characterId" UUID NOT NULL,
    "rating" "ReviewRating" NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "review_submissions_submissionId_key" ON "review_submissions"("submissionId");
CREATE INDEX "review_submissions_userId_sessionId_idx" ON "review_submissions"("userId", "sessionId");
CREATE INDEX "review_submissions_sessionId_characterId_idx" ON "review_submissions"("sessionId", "characterId");

ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_submissions" ADD CONSTRAINT "review_submissions_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
