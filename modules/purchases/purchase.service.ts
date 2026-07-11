import { PurchasePlatform, PurchaseStatus } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";

export const iosPurchaseVerifySchema = z.object({
  productId: z.string().trim().min(1, "productId is required."),
  transactionId: z.string().trim().min(1, "transactionId is required."),
  originalTransactionId: z
    .string()
    .trim()
    .min(1, "originalTransactionId is required."),
});

export const iosPurchaseRestoreSchema = z.object({
  originalTransactionId: z
    .string()
    .trim()
    .min(1, "originalTransactionId is required."),
});

export async function verifyIosPurchase(
  userId: string,
  input: z.infer<typeof iosPurchaseVerifySchema>,
) {
  const data = iosPurchaseVerifySchema.parse(input);

  if (data.productId !== "lifetime_pro") {
    throw new ApiError(400, "UNSUPPORTED_PRODUCT", "Unsupported productId.");
  }

  if (!isAppleServerApiConfigured()) {
    throw new ApiError(
      501,
      "APPLE_IAP_VERIFICATION_NOT_CONFIGURED",
      "Apple App Store Server API verification is not configured. Purchase was not applied.",
    );
  }

  void userId;
  throw new ApiError(
    501,
    "APPLE_IAP_VERIFICATION_NOT_IMPLEMENTED",
    "Apple App Store Server API verification is not implemented yet.",
  );
}

export async function restoreIosPurchase(
  userId: string,
  input: z.infer<typeof iosPurchaseRestoreSchema>,
) {
  iosPurchaseRestoreSchema.parse(input);

  if (!isAppleServerApiConfigured()) {
    throw new ApiError(
      501,
      "APPLE_IAP_VERIFICATION_NOT_CONFIGURED",
      "Apple restore purchase verification is not configured. Entitlement was not changed.",
    );
  }

  void userId;
  throw new ApiError(
    501,
    "APPLE_RESTORE_NOT_IMPLEMENTED",
    "Apple restore purchase verification is not implemented yet.",
  );
}

function isAppleServerApiConfigured() {
  return Boolean(
    process.env.APPLE_BUNDLE_ID &&
      process.env.APPLE_ISSUER_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY,
  );
}

export async function applyVerifiedLifetimeProPurchase(
  userId: string,
  data: z.infer<typeof iosPurchaseVerifySchema>,
) {
  const existingPurchase = await prisma.purchase.findUnique({
    where: { transactionId: data.transactionId },
  });

  if (existingPurchase) {
    throw new ApiError(409, "DUPLICATE_TRANSACTION", "transactionId already exists.");
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const purchase = await tx.purchase.create({
      data: {
        userId,
        platform: PurchasePlatform.IOS,
        productId: data.productId,
        transactionId: data.transactionId,
        originalTransactionId: data.originalTransactionId,
        status: PurchaseStatus.ACTIVE,
        purchasedAt: now,
      },
    });

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        isPro: true,
        proPurchasedAt: now,
        appleOriginalTransactionId: data.originalTransactionId,
        appleProductId: data.productId,
      },
      select: {
        id: true,
        isPro: true,
        proPurchasedAt: true,
        appleOriginalTransactionId: true,
        appleProductId: true,
      },
    });

    return {
      purchase,
      user,
    };
  });
}
