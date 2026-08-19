import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashDeviceCredential } from "@/lib/device-credential";

const { updateMany } = vi.hoisted(() => ({
  updateMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    userDevice: { updateMany },
  },
}));

import {
  deviceCredentialSchema,
  registerDeviceCredential,
} from "./device-credential.service";

describe("device credentials", () => {
  beforeEach(() => {
    updateMany.mockReset();
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects anonymous authentication without a sufficiently strong credential", () => {
    expect(() => deviceCredentialSchema.parse({})).toThrow();
    expect(() => deviceCredentialSchema.parse({ deviceCredential: "too-short" })).toThrow();
  });

  it("stores only a hash for the authenticated user's current device", async () => {
    const deviceCredential = "a-secure-installation-credential-1234";

    await expect(
      registerDeviceCredential("user-id", "device-id", { deviceCredential }),
    ).resolves.toEqual({ registered: true });

    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "user-id", deviceId: "device-id" },
      data: { credentialHash: hashDeviceCredential(deviceCredential) },
    });
  });
});
