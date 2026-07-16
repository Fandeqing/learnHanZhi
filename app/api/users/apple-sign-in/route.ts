import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { linkAppleAccount } from "@/modules/users/apple-sign-in.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await linkAppleAccount(user.id, await request.json()));
  } catch (error) {
    return handleRouteError(error);
  }
}
