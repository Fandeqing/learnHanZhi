import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { deleteAccount } from "@/modules/users/account-deletion.service";

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await deleteAccount(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}
