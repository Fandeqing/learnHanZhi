import { prisma } from "./db";
import { ApiError } from "./api-error";

export async function requireUser(request: Request) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing x-user-id header.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid x-user-id header.");
  }

  return user;
}
