import { createPrivateKey, sign } from "node:crypto";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";

const appleTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  id_token: z.string().min(1),
});

export type AppleAuthorizationTokens = {
  accessToken: string;
  refreshToken: string | null;
  identityToken: string;
};

export async function exchangeAppleAuthorizationCode(
  authorizationCode: string,
): Promise<AppleAuthorizationTokens> {
  const config = appleSignInConfig();
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: createAppleClientSecret(config),
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      503,
      "APPLE_TOKEN_EXCHANGE_FAILED",
      "Apple authorization could not be validated. Please try again.",
    );
  }

  const tokens = appleTokenResponseSchema.parse(body);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    identityToken: tokens.id_token,
  };
}

export async function revokeAppleAuthorization(tokens: AppleAuthorizationTokens) {
  const config = appleSignInConfig();
  const token = tokens.refreshToken ?? tokens.accessToken;
  const tokenType = tokens.refreshToken ? "refresh_token" : "access_token";
  const response = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: createAppleClientSecret(config),
      token,
      token_type_hint: tokenType,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new ApiError(
      503,
      "APPLE_TOKEN_REVOCATION_FAILED",
      "Apple authorization could not be revoked automatically.",
    );
  }
}

type AppleSignInConfig = {
  teamId: string;
  keyId: string;
  privateKey: string;
  clientId: string;
};

function appleSignInConfig(): AppleSignInConfig {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID?.trim();
  const privateKey = process.env.APPLE_SIGN_IN_PRIVATE_KEY
    ?.replace(/\\n/g, "\n")
    .trim();
  const clientId = process.env.APPLE_BUNDLE_ID?.trim();

  if (!teamId || !keyId || !privateKey || !clientId) {
    throw new ApiError(
      503,
      "APPLE_SIGN_IN_NOT_CONFIGURED",
      "Apple account revocation is not configured.",
    );
  }

  return { teamId, keyId, privateKey, clientId };
}

function createAppleClientSecret(config: AppleSignInConfig) {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = encodeJwtPart({ alg: "ES256", kid: config.keyId, typ: "JWT" });
  const encodedPayload = encodeJwtPart({
    iss: config.teamId,
    iat: now,
    exp: now + 5 * 60,
    aud: "https://appleid.apple.com",
    sub: config.clientId,
  });
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${signature.toString("base64url")}`;
}

function encodeJwtPart(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
