import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { getHome } from "@/modules/home/home.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await getHome(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
