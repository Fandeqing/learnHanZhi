import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  accountDeletionSchema,
  deleteAccount,
} from "@/modules/users/account-deletion.service";

export async function GET(request: Request) {
  try {
    return ok(await requireUser(request));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    return ok(await deleteAccount(user.id, accountDeletionSchema.parse(body)));
  } catch (error) {
    return handleRouteError(error);
  }
}
