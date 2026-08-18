import { prisma } from "./db";
import { ApiError } from "./api-error";
import { verifySessionToken } from "./session-token";

export async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing bearer session token.");
  }
  const session = verifySessionToken(authorization.slice("Bearer ".length).trim());

  const device = await prisma.userDevice.findUnique({
    where: { deviceId: session.deviceId },
    include: { user: true },
  });
  if (!device || device.userId !== session.userId) {
    throw new ApiError(401, "UNAUTHORIZED", "Session is no longer valid.");
  }

  void prisma.userDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  }).catch(() => undefined);

  return { ...device.user, deviceId: device.deviceId };
}
