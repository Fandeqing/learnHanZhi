import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "./api-error";
import { createSessionToken, verifySessionToken } from "./session-token";

describe("session tokens", () => {
  const previousSecret = process.env.SESSION_TOKEN_SECRET;

  beforeEach(() => {
    process.env.SESSION_TOKEN_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.SESSION_TOKEN_SECRET;
    } else {
      process.env.SESSION_TOKEN_SECRET = previousSecret;
    }
  });

  it("round-trips the authenticated user and device", () => {
    const token = createSessionToken("user-id", "device-id");
    expect(verifySessionToken(token)).toMatchObject({ userId: "user-id", deviceId: "device-id" });
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken("user-id", "device-id");
    expect(() => verifySessionToken(`${token}x`)).toThrow(ApiError);
  });
});
