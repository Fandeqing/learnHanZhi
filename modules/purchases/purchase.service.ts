import {
  PurchaseEnvironment,
  PurchasePlatform,
  PurchaseStatus,
} from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  fetchVerifiedLifetimeProTransaction,
  LIFETIME_PRO_PRODUCT_ID,
  type VerifiedLifetimeProTransaction,
} from "@/modules/purchases/apple-store.service";

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

  if (data.productId !== LIFETIME_PRO_PRODUCT_ID) {
    throw new ApiError(400, "UNSUPPORTED_PRODUCT", "Unsupported productId.");
  }

  const transaction = await fetchVerifiedLifetimeProTransaction(
    data.transactionId,
    {
      transactionId: data.transactionId,
      originalTransactionId: data.originalTransactionId,
    },
  );
  return reconcileVerifiedLifetimeProPurchase(userId, transaction);
}

export async function restoreIosPurchase(
  userId: string,
  input: z.infer<typeof iosPurchaseRestoreSchema>,
) {
  const data = iosPurchaseRestoreSchema.parse(input);
  const transaction = await fetchVerifiedLifetimeProTransaction(
    data.originalTransactionId,
    { originalTransactionId: data.originalTransactionId },
  );
  return reconcileVerifiedLifetimeProPurchase(userId, transaction);
}

export async function applyVerifiedLifetimeProPurchase(
  userId: string,
  data: VerifiedLifetimeProTransaction,
) {
  return prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.purchase.findUnique({
      where: { transactionId: data.transactionId },
    });
    const environment = purchaseEnvironment(data);

    if (
      existingPurchase &&
      (existingPurchase.productId !== data.productId ||
        existingPurchase.originalTransactionId !== data.originalTransactionId ||
        existingPurchase.environment !== environment)
    ) {
      throw new ApiError(
        409,
        "APPLE_TRANSACTION_CONFLICT",
        "The verified transaction conflicts with an existing purchase.",
      );
    }

    const purchase = existingPurchase
      ? await tx.purchase.update({
          where: { id: existingPurchase.id },
          data: {
            status: PurchaseStatus.ACTIVE,
            purchasedAt: data.purchasedAt,
            revokedAt: null,
          },
        })
      : await tx.purchase.create({
          data: {
            userId,
            platform: PurchasePlatform.IOS,
            productId: data.productId,
            transactionId: data.transactionId,
            originalTransactionId: data.originalTransactionId,
            environment,
            status: PurchaseStatus.ACTIVE,
            purchasedAt: data.purchasedAt,
          },
        });

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        isPro: true,
        proPurchasedAt: data.purchasedAt,
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

async function reconcileVerifiedLifetimeProPurchase(
  userId: string,
  transaction: VerifiedLifetimeProTransaction,
) {
  if (transaction.revokedAt) {
    await applyRevokedLifetimeProPurchase(userId, transaction);
    throw new ApiError(
      403,
      "APPLE_PURCHASE_REVOKED",
      "Apple has refunded or revoked this purchase.",
    );
  }

  return applyVerifiedLifetimeProPurchase(userId, transaction);
}

async function applyRevokedLifetimeProPurchase(
  userId: string,
  data: VerifiedLifetimeProTransaction,
) {
  return prisma.$transaction(async (tx) => {
    const existingPurchase = await tx.purchase.findUnique({
      where: { transactionId: data.transactionId },
    });
    const environment = purchaseEnvironment(data);

    if (existingPurchase) {
      await tx.purchase.update({
        where: { id: existingPurchase.id },
        data: {
          status: PurchaseStatus.REVOKED,
          revokedAt: data.revokedAt,
        },
      });
    } else {
      await tx.purchase.create({
        data: {
          userId,
          platform: PurchasePlatform.IOS,
          productId: data.productId,
          transactionId: data.transactionId,
          originalTransactionId: data.originalTransactionId,
          environment,
          status: PurchaseStatus.REVOKED,
          purchasedAt: data.purchasedAt,
          revokedAt: data.revokedAt,
        },
      });
    }

    await tx.user.updateMany({
      where: {
        appleOriginalTransactionId: data.originalTransactionId,
      },
      data: {
        isPro: false,
        proPurchasedAt: null,
      },
    });
  });
}

function purchaseEnvironment(data: VerifiedLifetimeProTransaction) {
  return data.environment === "Sandbox"
    ? PurchaseEnvironment.SANDBOX
    : PurchaseEnvironment.PRODUCTION;
}
