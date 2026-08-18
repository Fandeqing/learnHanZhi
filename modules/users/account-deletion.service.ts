import { hashAppleSubject } from "@/lib/apple-account";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import { verifyAppleIdentityToken } from "@/modules/users/apple-sign-in.service";
import {
  exchangeAppleAuthorizationCode,
  revokeAppleAuthorization,
} from "@/modules/users/apple-token.service";
import { z } from "zod";

export const accountDeletionSchema = z
  .object({
    identityToken: z.string().trim().min(1).optional(),
    authorizationCode: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) => Boolean(data.identityToken) === Boolean(data.authorizationCode),
    "identityToken and authorizationCode must be provided together.",
  );

export async function deleteAccount(
  userId: string,
  input: z.infer<typeof accountDeletionSchema>,
) {
  const data = accountDeletionSchema.parse(input);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { appleSubject: true },
  });

  let appleAuthorizationRevoked: boolean | null = null;
  if (user.appleSubject) {
    appleAuthorizationRevoked = false;
    if (data.identityToken && data.authorizationCode) {
      const confirmedSubject = await verifyAppleIdentityToken(data.identityToken);
      if (confirmedSubject !== user.appleSubject) {
        throw new ApiError(
          403,
          "APPLE_ACCOUNT_MISMATCH",
          "Use the Apple account currently linked to this profile.",
        );
      }

      try {
        const tokens = await exchangeAppleAuthorizationCode(data.authorizationCode);
        const exchangedSubject = await verifyAppleIdentityToken(tokens.identityToken);
        if (exchangedSubject !== user.appleSubject) {
          throw new ApiError(
            403,
            "APPLE_ACCOUNT_MISMATCH",
            "Apple returned authorization for a different account.",
          );
        }
        await revokeAppleAuthorization(tokens);
        appleAuthorizationRevoked = true;
      } catch (error) {
        if (error instanceof ApiError && error.code === "APPLE_ACCOUNT_MISMATCH") {
          throw error;
        }
        console.error("Apple authorization revocation failed during account deletion.");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (user.appleSubject) {
      await tx.purchase.updateMany({
        where: { userId },
        data: { appleSubjectHash: hashAppleSubject(user.appleSubject) },
      });
    }

    await tx.user.delete({ where: { id: userId } });
  });

  return {
    deleted: true,
    appleAuthorizationRevoked,
    manualAppleRevocationRequired:
      user.appleSubject !== null && appleAuthorizationRevoked !== true,
  };
}
