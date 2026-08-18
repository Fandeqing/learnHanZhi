ALTER TABLE "purchases" ADD COLUMN "appleSubjectHash" TEXT;
ALTER TABLE "purchases" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_userId_fkey";
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "purchases_appleSubjectHash_idx" ON "purchases"("appleSubjectHash");
