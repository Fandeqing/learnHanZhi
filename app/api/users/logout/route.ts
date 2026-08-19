import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { logoutDevice } from "@/modules/users/logout.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await logoutDevice(user.id, user.deviceId));
  } catch (error) {
    return handleRouteError(error);
  }
}
