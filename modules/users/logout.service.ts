import { prisma } from "@/lib/db";

export async function logoutDevice(userId: string, deviceId: string) {
  await prisma.userDevice.deleteMany({
    where: { userId, deviceId },
  });

  return { loggedOut: true };
}
