CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

INSERT INTO "user_devices" ("id", "userId", "deviceId", "lastSeenAt", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "deviceId", CURRENT_TIMESTAMP, "createdAt", "updatedAt"
FROM "users";

CREATE UNIQUE INDEX "user_devices_deviceId_key" ON "user_devices"("deviceId");
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "users_deviceId_key";
ALTER TABLE "users" DROP COLUMN "deviceId";

ALTER TABLE "purchases" ADD COLUMN "appAccountToken" UUID;
CREATE UNIQUE INDEX "purchases_originalTransactionId_environment_key"
  ON "purchases"("originalTransactionId", "environment");
