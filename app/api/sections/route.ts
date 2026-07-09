import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { getSectionsForUser } from "@/modules/sections/section.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await getSectionsForUser(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
