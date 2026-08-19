import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteMany } = vi.hoisted(() => ({
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    userDevice: { deleteMany },
  },
}));

import { logoutDevice } from "./logout.service";

describe("logoutDevice", () => {
  beforeEach(() => {
    deleteMany.mockReset();
    deleteMany.mockResolvedValue({ count: 1 });
  });

  it("invalidates only the current user's current device session", async () => {
    await expect(logoutDevice("user-id", "device-id")).resolves.toEqual({
      loggedOut: true,
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-id", deviceId: "device-id" },
    });
  });
});
