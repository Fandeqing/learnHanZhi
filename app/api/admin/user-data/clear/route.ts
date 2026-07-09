import { handleRouteError, ok } from "@/lib/api-response";
import { clearUserData } from "@/modules/admin/user-data.service";

export async function POST() {
  try {
    return ok(await clearUserData());
  } catch (error) {
    return handleRouteError(error);
  }
}
