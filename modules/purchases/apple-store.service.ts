import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  APIError,
  APIException,
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  Type,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";
import { ApiError } from "@/lib/api-error";

export const LIFETIME_PRO_PRODUCT_ID = "lifetime_pro";

export type VerifiedLifetimeProTransaction = {
  transactionId: string;
  originalTransactionId: string;
  productId: typeof LIFETIME_PRO_PRODUCT_ID;
  environment: Environment.PRODUCTION | Environment.SANDBOX;
  purchasedAt: Date;
  revokedAt: Date | null;
  appAccountToken: string | null;
};

type ExpectedTransaction = {
  transactionId?: string;
  originalTransactionId?: string;
};

type AppleIapConfiguration = {
  bundleId: string;
  productId: typeof LIFETIME_PRO_PRODUCT_ID;
  issuerId: string;
  keyId: string;
  privateKey: string;
  appAppleId: number;
};

let rootCertificatesPromise: Promise<Buffer[]> | null = null;

export async function fetchVerifiedLifetimeProTransaction(
  anyTransactionId: string,
  expected: ExpectedTransaction,
): Promise<VerifiedLifetimeProTransaction> {
  const configuration = getAppleIapConfiguration();

  console.info("Apple IAP config", {
    issuerId: configuration.issuerId,
    keyId: configuration.keyId,
    bundleId: configuration.bundleId,
    productId: configuration.productId,
    appId: configuration.appAppleId,
    privateKeyPresent: Boolean(configuration.privateKey),
    privateKeyStartsCorrectly: configuration.privateKey.includes(
      "-----BEGIN PRIVATE KEY-----",
    ),
    privateKeyEndsCorrectly: configuration.privateKey.includes(
      "-----END PRIVATE KEY-----",
    ),
  });

  for (const environment of [Environment.PRODUCTION, Environment.SANDBOX] as const) {
    try {
      console.info("Apple transaction lookup attempt", { environment });
      const client = new AppStoreServerAPIClient(
        configuration.privateKey,
        configuration.keyId,
        configuration.issuerId,
        configuration.bundleId,
        environment,
      );
      const response = await client.getTransactionInfo(anyTransactionId);
      if (!response.signedTransactionInfo) {
        throw new ApiError(
          502,
          "APPLE_TRANSACTION_MISSING_SIGNED_DATA",
          "Apple returned a transaction without signed transaction data.",
        );
      }

      const verifier = new SignedDataVerifier(
        await loadAppleRootCertificates(),
        true,
        environment,
        configuration.bundleId,
        environment === Environment.PRODUCTION ? configuration.appAppleId : undefined,
      );
      const decoded = await verifier.verifyAndDecodeTransaction(
        response.signedTransactionInfo,
      );

      console.info("Apple transaction lookup succeeded", { environment });

      return validateLifetimeProTransaction(
        decoded,
        expected,
        configuration.bundleId,
        environment,
      );
    } catch (error) {
      if (environment === Environment.PRODUCTION && error instanceof APIException) {
        if (error.apiError === APIError.TRANSACTION_ID_NOT_FOUND) {
          console.info("Apple production transaction not found; trying sandbox");
          continue;
        }

        if (error.httpStatusCode === 401) {
          console.warn("Apple production authorization failed; testing sandbox", {
            httpStatusCode: error.httpStatusCode,
            apiError: error.apiError,
            errorMessage: error.errorMessage,
          });
          continue;
        }
      }

      if (error instanceof ApiError) {
        throw error;
      }

      if (
        environment === Environment.SANDBOX &&
        error instanceof APIException &&
        error.apiError === APIError.TRANSACTION_ID_NOT_FOUND
      ) {
        throw new ApiError(
          400,
          "APPLE_TRANSACTION_NOT_FOUND",
          "Apple could not find this transaction in production or sandbox.",
        );
      }

      console.error("Apple transaction verification failed", {
        environment,
        httpStatusCode:
          error instanceof APIException ? error.httpStatusCode : undefined,
        apiError: error instanceof APIException ? error.apiError : undefined,
        errorMessage:
          error instanceof APIException ? error.errorMessage : undefined,
        error,
      });
      throw new ApiError(
        502,
        "APPLE_IAP_VERIFICATION_FAILED",
        "Apple could not verify this purchase. Please try again.",
      );
    }
  }

  throw new ApiError(
    400,
    "APPLE_TRANSACTION_NOT_FOUND",
    "Apple could not find this transaction in production or sandbox.",
  );
}

export async function decodeAppStoreServerNotification(
  signedPayload: string,
): Promise<{
  notification: ResponseBodyV2DecodedPayload;
  transaction: VerifiedLifetimeProTransaction | null;
}> {
  const configuration = getAppleIapConfiguration();

  for (const environment of [Environment.PRODUCTION, Environment.SANDBOX] as const) {
    try {
      const verifier = new SignedDataVerifier(
        await loadAppleRootCertificates(),
        true,
        environment,
        configuration.bundleId,
        environment === Environment.PRODUCTION ? configuration.appAppleId : undefined,
      );
      const notification = await verifier.verifyAndDecodeNotification(signedPayload);
      const signedTransaction = notification.data?.signedTransactionInfo;
      if (!signedTransaction) return { notification, transaction: null };
      const decoded = await verifier.verifyAndDecodeTransaction(signedTransaction);
      return {
        notification,
        transaction: validateLifetimeProTransaction(
          decoded,
          {},
          configuration.bundleId,
          environment,
        ),
      };
    } catch (error) {
      if (environment === Environment.PRODUCTION) continue;
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        400,
        "INVALID_APP_STORE_NOTIFICATION",
        "The App Store notification signature is invalid.",
      );
    }
  }

  throw new ApiError(
    400,
    "INVALID_APP_STORE_NOTIFICATION",
    "The App Store notification signature is invalid.",
  );
}

export function validateLifetimeProTransaction(
  transaction: JWSTransactionDecodedPayload,
  expected: ExpectedTransaction,
  bundleId: string,
  environment: Environment.PRODUCTION | Environment.SANDBOX,
): VerifiedLifetimeProTransaction {
  if (transaction.bundleId !== bundleId) {
    throw invalidTransaction("The transaction belongs to a different app.");
  }
  if (transaction.environment !== environment) {
    throw invalidTransaction("The transaction environment does not match.");
  }
  if (transaction.productId !== LIFETIME_PRO_PRODUCT_ID) {
    throw invalidTransaction("The transaction is not for Lifetime Pro.");
  }
  if (transaction.type !== Type.NON_CONSUMABLE) {
    throw invalidTransaction("Lifetime Pro must be a non-consumable purchase.");
  }
  if (!transaction.transactionId || !transaction.originalTransactionId) {
    throw invalidTransaction("The transaction identifiers are missing.");
  }
  if (
    expected.transactionId &&
    transaction.transactionId !== expected.transactionId
  ) {
    throw invalidTransaction("The transaction identifier does not match.");
  }
  if (
    expected.originalTransactionId &&
    transaction.originalTransactionId !== expected.originalTransactionId
  ) {
    throw invalidTransaction("The original transaction identifier does not match.");
  }
  if (!transaction.purchaseDate || !Number.isFinite(transaction.purchaseDate)) {
    throw invalidTransaction("The transaction purchase date is missing.");
  }

  return {
    transactionId: transaction.transactionId,
    originalTransactionId: transaction.originalTransactionId,
    productId: LIFETIME_PRO_PRODUCT_ID,
    environment,
    purchasedAt: new Date(transaction.purchaseDate),
    revokedAt: transaction.revocationDate
      ? new Date(transaction.revocationDate)
      : null,
    appAccountToken: transaction.appAccountToken?.toLowerCase() ?? null,
  };
}

function getAppleIapConfiguration(): AppleIapConfiguration {
  const bundleId = process.env.APPLE_BUNDLE_ID?.trim();
  const productId = process.env.APPLE_PRODUCT_ID?.trim();
  const issuerId = process.env.APPLE_ISSUER_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKey = normalizePrivateKey(process.env.APPLE_PRIVATE_KEY);
  const appAppleId = Number(process.env.APPLE_APP_ID);

  if (
    !bundleId ||
    productId !== LIFETIME_PRO_PRODUCT_ID ||
    !issuerId ||
    !keyId ||
    !privateKey ||
    !Number.isSafeInteger(appAppleId) ||
    appAppleId <= 0
  ) {
    throw new ApiError(
      503,
      "APPLE_IAP_VERIFICATION_NOT_CONFIGURED",
      "Apple App Store Server API verification is not configured.",
    );
  }

  return {
    bundleId,
    productId: LIFETIME_PRO_PRODUCT_ID,
    issuerId,
    keyId,
    privateKey,
    appAppleId,
  };
}

function normalizePrivateKey(value: string | undefined) {
  if (!value) return "";

  const normalized = value.trim().replace(/\\n/g, "\n");
  if (normalized.includes("-----BEGIN PRIVATE KEY-----")) {
    return normalized;
  }

  try {
    const decoded = Buffer.from(normalized, "base64").toString("utf8").trim();
    return decoded.includes("-----BEGIN PRIVATE KEY-----") ? decoded : normalized;
  } catch {
    return normalized;
  }
}

async function loadAppleRootCertificates() {
  rootCertificatesPromise ??= readFile(
    path.join(process.cwd(), "certificates", "apple-root-certificates.pem"),
    "utf8",
  ).then((contents) => {
    const certificates = contents.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
    );
    if (!certificates?.length) {
      throw new Error("Apple root certificates are missing.");
    }

    return certificates.map((certificate) =>
      Buffer.from(
        certificate
          .replace("-----BEGIN CERTIFICATE-----", "")
          .replace("-----END CERTIFICATE-----", "")
          .replace(/\s/g, ""),
        "base64",
      ),
    );
  });

  return rootCertificatesPromise;
}

function invalidTransaction(message: string) {
  return new ApiError(400, "INVALID_APPLE_TRANSACTION", message);
}
