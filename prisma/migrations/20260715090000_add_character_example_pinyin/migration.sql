ALTER TABLE "characters" RENAME COLUMN "exampleMeaning" TO "exampleMeaningEn";

ALTER TABLE "characters"
ADD COLUMN "examplePinyin" TEXT NOT NULL DEFAULT '';

ALTER TABLE "characters"
ALTER COLUMN "examplePinyin" DROP DEFAULT;
