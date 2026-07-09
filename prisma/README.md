# Database Model

This schema targets Railway PostgreSQL with Prisma. Set `DATABASE_URL` to the Railway Postgres connection string before running migrations.

## Models

- `User`: anonymous app user identified by `deviceId`; stores the current Lifetime Pro entitlement snapshot.
- `UserSetting`: one settings row per user; stores daily new character goal, audio preferences, and current section.
- `Section`: the three MVP learning sections: Basics, Daily Life, and Expression.
- `Character`: canonical Hanzi card content, including pinyin, English meaning, memory hook, section, order, difficulty, audio text, and free access flag.
- `UserCharacterProgress`: per-user SRS state for each character. The `(userId, characterId)` unique key ensures one progress row per user and card.
- `StudySession`: one learning/review session, including counts and completion timestamps.
- `StudySessionCard`: per-card activity inside a session; stores whether the back was revealed and the user's review rating.
- `Purchase`: Apple IAP Lifetime Pro purchase records. This is intentionally not named `subscription` because MVP only supports one-time purchase.

## Key Indexes

- `characters(sectionId, orderIndex)` is unique so each section has stable card ordering.
- `user_character_progress(userId, status, nextReviewAt)` supports Today Deck queries for due reviews.
- `user_character_progress(userId, sectionId, status)` supports section unlock checks like Learned count >= 67.
- `study_session_cards(sessionId)` loads all cards in a session quickly.
- `study_session_cards(userId, characterId)` supports learning history for one user/card pair.
- `purchases(transactionId)` is unique to prevent duplicate Apple transaction processing.
- `purchases(originalTransactionId)` supports Apple restore and entitlement reconciliation.

## Why No `collections` or `seal_book` Table Yet

For MVP, the seal book can be derived from `user_character_progress`: a character appears collected when it reaches `LEARNED` or `MASTERED`. This avoids duplicating state and keeps SRS progress as the single source of truth.

Add a collection table only when collection behavior diverges from learning progress, such as separate unlock animations, puzzle pieces, cosmetic rewards, or manually curated collection sets.

## Future Puzzle Collection Extension

If the app later adds crane, tiger, or panda puzzle collections, add small reward-focused tables without changing the SRS core:

```prisma
model CollectionSet {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique
  name        String
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)

  pieces      CollectionPiece[]

  @@map("collection_sets")
}

model CollectionPiece {
  id              String   @id @default(uuid()) @db.Uuid
  collectionSetId String   @db.Uuid
  characterId     String?  @db.Uuid
  orderIndex      Int
  assetKey        String
  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime @updatedAt @db.Timestamptz(6)

  collectionSet   CollectionSet @relation(fields: [collectionSetId], references: [id], onDelete: Cascade)
  character       Character?    @relation(fields: [characterId], references: [id], onDelete: SetNull)

  @@unique([collectionSetId, orderIndex])
  @@map("collection_pieces")
}

model UserCollectionPiece {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  pieceId     String   @db.Uuid
  unlockedAt  DateTime @default(now()) @db.Timestamptz(6)
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)

  @@unique([userId, pieceId])
  @@map("user_collection_pieces")
}
```

## Seed Design

Seed `sections` first:

- `basics`: order `1`, `totalCharacters = 100`, `unlockLearnedRequired = 67`
- `daily_life`: order `2`, `totalCharacters = 100`, `unlockLearnedRequired = 67`
- `expression`: order `3`, `totalCharacters = 100`, `unlockLearnedRequired = 67`

Then seed 300 `characters`, 100 per section. Mark the free tier with `isFree = true` for the first 30-50 Basics characters, and `false` for the remaining characters.
