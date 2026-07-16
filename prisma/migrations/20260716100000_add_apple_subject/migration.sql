ALTER TABLE "users" ADD COLUMN "appleSubject" TEXT;

CREATE UNIQUE INDEX "users_appleSubject_key" ON "users"("appleSubject");
