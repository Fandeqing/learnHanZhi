import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { hashDeviceCredential } from "@/lib/device-credential";
import { prisma } from "@/lib/db";

export const deviceCredentialSchema = z.object({
  deviceCredential: z.string().trim().min(32).max(512),
});

export async function registerDeviceCredential(
  userId: string,
  deviceId: string,
  input: z.infer<typeof deviceCredentialSchema>,
) {
  const { deviceCredential } = deviceCredentialSchema.parse(input);
  const result = await prisma.userDevice.updateMany({
    where: { userId, deviceId },
    data: { credentialHash: hashDeviceCredential(deviceCredential) },
  });
  if (result.count !== 1) {
    throw new ApiError(401, "UNAUTHORIZED", "This device session is no longer valid.");
  }
  return { registered: true };
}
