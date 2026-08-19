ALTER TABLE "study_sessions" ADD COLUMN "abandonedAt" TIMESTAMPTZ(6);

CREATE INDEX "study_sessions_userId_completedAt_abandonedAt_idx"
ON "study_sessions"("userId", "completedAt", "abandonedAt");
