import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  getSettings,
  settingsPatchSchema,
  updateSettings,
} from "@/modules/settings/settings.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await getSettings(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    return ok(await updateSettings(user.id, settingsPatchSchema.parse(body)));
  } catch (error) {
    return handleRouteError(error);
  }
}
