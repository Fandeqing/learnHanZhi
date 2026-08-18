import { handleRouteError, ok } from "@/lib/api-response";
import { clearUserData } from "@/modules/admin/user-data.service";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    return ok(await clearUserData());
  } catch (error) {
    return handleRouteError(error);
  }
}
