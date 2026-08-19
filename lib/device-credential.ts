import { createHash, timingSafeEqual } from "node:crypto";

export function hashDeviceCredential(credential: string) {
  return createHash("sha256").update(credential, "utf8").digest("hex");
}

export function matchesDeviceCredential(credential: string, expectedHash: string) {
  const actual = Buffer.from(hashDeviceCredential(credential), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
