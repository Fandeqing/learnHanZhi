import { Environment, Type, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-error";
import {
  LIFETIME_PRO_PRODUCT_ID,
  validateLifetimeProTransaction,
} from "./apple-store.service";

const bundleId = "com.deqingfan.learnHanZhiIos";

function transaction(
  overrides: Partial<JWSTransactionDecodedPayload> = {},
): JWSTransactionDecodedPayload {
  return {
    bundleId,
    environment: Environment.SANDBOX,
    productId: LIFETIME_PRO_PRODUCT_ID,
    type: Type.NON_CONSUMABLE,
    transactionId: "2000000000000001",
    originalTransactionId: "2000000000000001",
    purchaseDate: Date.UTC(2026, 7, 17),
    ...overrides,
  };
}

describe("validateLifetimeProTransaction", () => {
  it("accepts a matching non-consumable Lifetime Pro transaction", () => {
    const result = validateLifetimeProTransaction(
      transaction(),
      {
        transactionId: "2000000000000001",
        originalTransactionId: "2000000000000001",
      },
      bundleId,
      Environment.SANDBOX,
    );

    expect(result).toMatchObject({
      productId: LIFETIME_PRO_PRODUCT_ID,
      transactionId: "2000000000000001",
      environment: Environment.SANDBOX,
      revokedAt: null,
    });
  });

  it.each([
    ["bundle", { bundleId: "com.example.other" }],
    ["environment", { environment: Environment.PRODUCTION }],
    ["product", { productId: "other_product" }],
    ["type", { type: Type.CONSUMABLE }],
    ["transaction ID", { transactionId: "different" }],
    ["original transaction ID", { originalTransactionId: "different" }],
  ])("rejects a mismatched %s", (_, overrides) => {
    expect(() =>
      validateLifetimeProTransaction(
        transaction(overrides),
        {
          transactionId: "2000000000000001",
          originalTransactionId: "2000000000000001",
        },
        bundleId,
        Environment.SANDBOX,
      ),
    ).toThrow(ApiError);
  });

  it("preserves Apple's revocation date for entitlement reconciliation", () => {
    const revocationDate = Date.UTC(2026, 7, 18);
    const result = validateLifetimeProTransaction(
      transaction({ revocationDate }),
      {},
      bundleId,
      Environment.SANDBOX,
    );

    expect(result.revokedAt).toEqual(new Date(revocationDate));
  });
});
