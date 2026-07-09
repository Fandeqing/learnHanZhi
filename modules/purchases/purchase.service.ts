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

export async function verifyIosPurchasePlaceholder(
  userId: string,
  input: z.infer<typeof iosPurchaseVerifySchema>,
) {
  const data = iosPurchaseVerifySchema.parse(input);

  if (data.productId !== "lifetime_pro") {
    throw new ApiError(400, "UNSUPPORTED_PRODUCT", "Unsupported productId.");
  }

  const existingPurchase = await prisma.purchase.findUnique({
    where: { transactionId: data.transactionId },
  });

  if (existingPurchase) {
    throw new ApiError(409, "DUPLICATE_TRANSACTION", "transactionId already exists.");
  }

  // TODO: Before production, verify transaction data with Apple's App Store Server API.
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
