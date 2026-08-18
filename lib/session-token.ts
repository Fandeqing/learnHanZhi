import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./api-error";

const SESSION_TTL_SECONDS = 180 * 24 * 60 * 60;

type SessionPayload = {
  userId: string;
  deviceId: string;
  exp: number;
};

export function createSessionToken(userId: string, deviceId: string) {
  const payload: SessionPayload = {
    userId,
    deviceId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string): SessionPayload {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) {
    throw unauthorized();
  }

  const expectedSignature = sign(encodedPayload);
  const actual = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw unauthorized();
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.deviceId || !payload.exp || payload.exp <= Date.now() / 1000) {
      throw unauthorized();
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw unauthorized();
  }
}

function sign(value: string) {
  const secret = process.env.SESSION_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_TOKEN_SECRET must be configured with at least 32 characters.");
  }
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function unauthorized() {
  return new ApiError(401, "UNAUTHORIZED", "Invalid or expired session token.");
}
