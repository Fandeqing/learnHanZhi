import { createPublicKey, verify, type JsonWebKey } from "node:crypto";
import { CharacterStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";

const appleIdentitySchema = z.object({
  identityToken: z.string().trim().min(1, "identityToken is required."),
});

type AppleTokenHeader = { alg?: string; kid?: string };
type AppleTokenPayload = { aud?: string | string[]; exp?: number; iss?: string; sub?: string };
type AppleJwk = JsonWebKey & { kid?: string; use?: string };

let appleKeys: AppleJwk[] | null = null;
let appleKeysExpiresAt = 0;

export async function linkAppleAccount(userId: string, rawInput: unknown) {
  const { identityToken } = appleIdentitySchema.parse(rawInput);
  const appleSubject = await verifyAppleIdentityToken(identityToken);

  const existingUser = await prisma.user.findUnique({
    where: { appleSubject },
  });

  if (!existingUser || existingUser.id === userId) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { appleSubject },
      include: { settings: true },
    });
    return { user, merged: false };
  }

  return prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await mergeUserData(tx, currentUser.id, existingUser.id);

    await tx.user.delete({ where: { id: currentUser.id } });
    const user = await tx.user.update({
      where: { id: existingUser.id },
      data: {
        deviceId: currentUser.deviceId,
        isPro: existingUser.isPro || currentUser.isPro,
        proPurchasedAt: earliestDate(existingUser.proPurchasedAt, currentUser.proPurchasedAt),
        appleOriginalTransactionId:
          existingUser.appleOriginalTransactionId ?? currentUser.appleOriginalTransactionId,
        appleProductId: existingUser.appleProductId ?? currentUser.appleProductId,
        onboardingCompleted: existingUser.onboardingCompleted || currentUser.onboardingCompleted,
        onboardingCompletedAt: earliestDate(
          existingUser.onboardingCompletedAt,
          currentUser.onboardingCompletedAt,
        ),
      },
      include: { settings: true },
    });

    return { user, merged: true };
  });
}

async function mergeUserData(tx: Prisma.TransactionClient, sourceUserId: string, targetUserId: string) {
  const [sourceProgress, targetProgress, sourceCompletions, targetCompletions, sourceUnlocks, targetUnlocks] =
    await Promise.all([
      tx.userCharacterProgress.findMany({ where: { userId: sourceUserId } }),
      tx.userCharacterProgress.findMany({ where: { userId: targetUserId } }),
      tx.dailyCharacterCompletion.findMany({ where: { userId: sourceUserId } }),
      tx.dailyCharacterCompletion.findMany({ where: { userId: targetUserId } }),
      tx.userSectionUnlock.findMany({ where: { userId: sourceUserId } }),
      tx.userSectionUnlock.findMany({ where: { userId: targetUserId } }),
    ]);

  const targetProgressByCharacter = new Map(targetProgress.map((item) => [item.characterId, item]));
  for (const source of sourceProgress) {
    const target = targetProgressByCharacter.get(source.characterId);
    if (!target) {
      await tx.userCharacterProgress.update({ where: { id: source.id }, data: { userId: targetUserId } });
      continue;
    }

    const sourceRank = progressRank(source.status);
    const targetRank = progressRank(target.status);
    if (sourceRank > targetRank) {
      await tx.userCharacterProgress.update({
        where: { id: target.id },
        data: {
          status: source.status,
          sectionId: source.sectionId,
          lastReviewedAt: latestDate(source.lastReviewedAt, target.lastReviewedAt),
          nextReviewAt: source.nextReviewAt ?? target.nextReviewAt,
          reviewCount: Math.max(source.reviewCount, target.reviewCount),
          successCount: Math.max(source.successCount, target.successCount),
          consecutiveSuccessCount: Math.max(source.consecutiveSuccessCount, target.consecutiveSuccessCount),
          isMastered: source.isMastered || target.isMastered,
        },
      });
    }
    await tx.userCharacterProgress.delete({ where: { id: source.id } });
  }

  const completionKeys = new Set(targetCompletions.map((item) => `${item.characterId}:${item.studyDate.toISOString()}`));
  for (const source of sourceCompletions) {
    const key = `${source.characterId}:${source.studyDate.toISOString()}`;
    if (completionKeys.has(key)) {
      await tx.dailyCharacterCompletion.delete({ where: { id: source.id } });
    } else {
      await tx.dailyCharacterCompletion.update({ where: { id: source.id }, data: { userId: targetUserId } });
    }
  }

  const targetUnlockIds = new Set(targetUnlocks.map((item) => item.sectionId));
  for (const source of sourceUnlocks) {
    if (targetUnlockIds.has(source.sectionId)) {
      await tx.userSectionUnlock.delete({ where: { id: source.id } });
    } else {
      await tx.userSectionUnlock.update({ where: { id: source.id }, data: { userId: targetUserId } });
    }
  }

  await tx.studySessionCard.updateMany({ where: { userId: sourceUserId }, data: { userId: targetUserId } });
  await tx.studySession.updateMany({ where: { userId: sourceUserId }, data: { userId: targetUserId } });
  await tx.purchase.updateMany({ where: { userId: sourceUserId }, data: { userId: targetUserId } });
  await tx.userSetting.deleteMany({ where: { userId: sourceUserId } });
}

function progressRank(status: CharacterStatus) {
  return [CharacterStatus.NEW, CharacterStatus.LEARNING, CharacterStatus.LEARNED, CharacterStatus.MASTERED].indexOf(status);
}

function latestDate(first: Date | null, second: Date | null) {
  if (!first) return second;
  if (!second) return first;
  return first > second ? first : second;
}

function earliestDate(first: Date | null, second: Date | null) {
  if (!first) return second;
  if (!second) return first;
  return first < second ? first : second;
}

async function verifyAppleIdentityToken(identityToken: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = identityToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new ApiError(401, "INVALID_APPLE_IDENTITY_TOKEN", "Invalid Apple identity token.");
  }

  const header = decodeJwtPart<AppleTokenHeader>(encodedHeader);
  const payload = decodeJwtPart<AppleTokenPayload>(encodedPayload);
  if (header.alg !== "RS256" || !header.kid || payload.iss !== "https://appleid.apple.com" || !payload.sub || !payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new ApiError(401, "INVALID_APPLE_IDENTITY_TOKEN", "Invalid Apple identity token.");
  }

  const audience = process.env.APPLE_BUNDLE_ID;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience || !audiences.includes(audience)) {
    throw new ApiError(401, "INVALID_APPLE_IDENTITY_TOKEN", "Apple identity token is for a different app.");
  }

  const keys = await getAppleKeys();
  const jwk = keys.find((item) => item.kid === header.kid && item.use === "sig");
  if (!jwk) {
    throw new ApiError(401, "INVALID_APPLE_IDENTITY_TOKEN", "Apple signing key was not found.");
  }

  const valid = verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!valid) {
    throw new ApiError(401, "INVALID_APPLE_IDENTITY_TOKEN", "Apple identity token signature is invalid.");
  }

  return payload.sub;
}

async function getAppleKeys() {
  if (appleKeys && appleKeysExpiresAt > Date.now()) return appleKeys;
  const response = await fetch("https://appleid.apple.com/auth/keys");
  if (!response.ok) throw new ApiError(503, "APPLE_ID_UNAVAILABLE", "Apple sign in is temporarily unavailable.");
  const body = (await response.json()) as { keys?: AppleJwk[] };
  appleKeys = body.keys ?? [];
  appleKeysExpiresAt = Date.now() + 60 * 60 * 1000;
  return appleKeys;
}

function decodeJwtPart<T>(part: string) {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    throw new ApiError(401, "INVALID_APPLE_IDENTITY_TOKEN", "Invalid Apple identity token.");
  }
}
