import {
  PurchaseEnvironment,
  PurchasePlatform,
  PurchaseStatus,
} from "@prisma/client";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { hashAppleSubject } from "@/lib/apple-account";
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

export function assertApplePurchaseAccount(appleSubject: string | null) {
  if (!appleSubject) {
    throw new ApiError(
      403,
      "APPLE_ACCOUNT_REQUIRED",
      "Sign in with Apple before purchasing or restoring Lifetime Pro.",
    );
  }
}

export function assertTransactionOwnership(
  currentUserId: string,
  existingOwnerId: string | null,
  appAccountToken: string | null,
  existingAppleSubjectHash: string | null = null,
  currentAppleSubjectHash: string | null = null,
  hasExistingPurchase = existingOwnerId !== null || existingAppleSubjectHash !== null,
) {
  const normalizedUserId = currentUserId.toLowerCase();
  if (existingOwnerId && existingOwnerId.toLowerCase() !== normalizedUserId) {
    throw new ApiError(
      409,
      "APPLE_TRANSACTION_ALREADY_OWNED",
      "This App Store transaction is already linked to another account.",
    );
  }
  if (
    hasExistingPurchase &&
    !existingOwnerId &&
    (!existingAppleSubjectHash || existingAppleSubjectHash !== currentAppleSubjectHash)
  ) {
    throw new ApiError(
      409,
      "APPLE_TRANSACTION_ALREADY_OWNED",
      "This App Store transaction is already linked to another account.",
    );
  }
  if (!hasExistingPurchase && appAccountToken?.toLowerCase() !== normalizedUserId) {
    throw new ApiError(
      409,
      "APPLE_TRANSACTION_OWNERSHIP_MISMATCH",
      "This App Store transaction was not created for the current account.",
    );
  }
}

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
    const currentUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { appleSubject: true },
    });
    const currentAppleSubjectHash = currentUser.appleSubject
      ? hashAppleSubject(currentUser.appleSubject)
      : null;
    assertApplePurchaseAccount(currentUser.appleSubject);
    const existingPurchase = await tx.purchase.findUnique({
      where: { transactionId: data.transactionId },
    });
    const environment = purchaseEnvironment(data);
    const existingOriginalPurchase = await tx.purchase.findUnique({
      where: {
        originalTransactionId_environment: {
          originalTransactionId: data.originalTransactionId,
          environment,
        },
      },
    });
    const ownedPurchase = existingPurchase ?? existingOriginalPurchase;

    assertTransactionOwnership(
      userId,
      ownedPurchase?.userId ?? null,
      data.appAccountToken,
      ownedPurchase?.appleSubjectHash ?? null,
      currentAppleSubjectHash,
      Boolean(ownedPurchase),
    );

    if (
      ownedPurchase &&
      (ownedPurchase.productId !== data.productId ||
        ownedPurchase.originalTransactionId !== data.originalTransactionId ||
        ownedPurchase.environment !== environment)
    ) {
      throw new ApiError(
        409,
        "APPLE_TRANSACTION_CONFLICT",
        "The verified transaction conflicts with an existing purchase.",
      );
    }

    const purchase = ownedPurchase
      ? await tx.purchase.update({
          where: { id: ownedPurchase.id },
          data: {
            userId,
            transactionId: data.transactionId,
            status: PurchaseStatus.ACTIVE,
            purchasedAt: data.purchasedAt,
            revokedAt: null,
            appAccountToken: data.appAccountToken ?? ownedPurchase.appAccountToken,
            appleSubjectHash:
              currentAppleSubjectHash ?? ownedPurchase.appleSubjectHash,
          },
        })
      : await tx.purchase.create({
          data: {
            userId,
            platform: PurchasePlatform.IOS,
            productId: data.productId,
            transactionId: data.transactionId,
            originalTransactionId: data.originalTransactionId,
            appAccountToken: data.appAccountToken,
            appleSubjectHash: currentAppleSubjectHash,
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
    const currentUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { appleSubject: true },
    });
    const currentAppleSubjectHash = currentUser.appleSubject
      ? hashAppleSubject(currentUser.appleSubject)
      : null;
    assertApplePurchaseAccount(currentUser.appleSubject);
    const existingPurchase = await tx.purchase.findUnique({
      where: { transactionId: data.transactionId },
    });
    const environment = purchaseEnvironment(data);
    const existingOriginalPurchase = await tx.purchase.findUnique({
      where: {
        originalTransactionId_environment: {
          originalTransactionId: data.originalTransactionId,
          environment,
        },
      },
    });
    const ownedPurchase = existingPurchase ?? existingOriginalPurchase;

    assertTransactionOwnership(
      userId,
      ownedPurchase?.userId ?? null,
      data.appAccountToken,
      ownedPurchase?.appleSubjectHash ?? null,
      currentAppleSubjectHash,
      Boolean(ownedPurchase),
    );

    if (
      ownedPurchase &&
      (ownedPurchase.productId !== data.productId ||
        ownedPurchase.originalTransactionId !== data.originalTransactionId ||
        ownedPurchase.environment !== environment)
    ) {
      throw new ApiError(
        409,
        "APPLE_TRANSACTION_CONFLICT",
        "The verified transaction conflicts with an existing purchase.",
      );
    }

    if (ownedPurchase) {
      await tx.purchase.update({
        where: { id: ownedPurchase.id },
        data: {
          userId,
          transactionId: data.transactionId,
          status: PurchaseStatus.REVOKED,
          revokedAt: data.revokedAt,
          appAccountToken: data.appAccountToken ?? ownedPurchase.appAccountToken,
          appleSubjectHash:
            currentAppleSubjectHash ?? ownedPurchase.appleSubjectHash,
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
          appAccountToken: data.appAccountToken,
          appleSubjectHash: currentAppleSubjectHash,
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

export async function reconcileAppStoreNotification(
  data: VerifiedLifetimeProTransaction,
) {
  const environment = purchaseEnvironment(data);
  const existingPurchase = await prisma.purchase.findFirst({
    where: {
      OR: [
        { transactionId: data.transactionId },
        { originalTransactionId: data.originalTransactionId, environment },
      ],
    },
  });

  const ownerId = existingPurchase?.userId ?? data.appAccountToken;
  if (!ownerId) return { handled: false };
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
  if (!owner) return { handled: false };

  if (data.revokedAt) {
    await applyRevokedLifetimeProPurchase(owner.id, data);
  } else {
    await applyVerifiedLifetimeProPurchase(owner.id, data);
  }
  return { handled: true };
}

function purchaseEnvironment(data: VerifiedLifetimeProTransaction) {
  return data.environment === "Sandbox"
    ? PurchaseEnvironment.SANDBOX
    : PurchaseEnvironment.PRODUCTION;
}
