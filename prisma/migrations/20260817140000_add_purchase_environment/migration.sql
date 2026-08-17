CREATE TYPE "PurchaseEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

ALTER TABLE "purchases"
ADD COLUMN "environment" "PurchaseEnvironment" NOT NULL DEFAULT 'PRODUCTION';
