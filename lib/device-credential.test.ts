import { describe, expect, it } from "vitest";
import { hashDeviceCredential, matchesDeviceCredential } from "./device-credential";

describe("device credentials", () => {
  it("matches only the credential used to create the stored hash", () => {
    const hash = hashDeviceCredential("a-secure-installation-credential-1234");

    expect(matchesDeviceCredential("a-secure-installation-credential-1234", hash)).toBe(true);
    expect(matchesDeviceCredential("a-different-installation-credential", hash)).toBe(false);
  });
});
