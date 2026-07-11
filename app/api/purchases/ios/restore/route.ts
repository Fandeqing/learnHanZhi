import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  iosPurchaseRestoreSchema,
  restoreIosPurchase,
} from "@/modules/purchases/purchase.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    return ok(
      await restoreIosPurchase(user.id, iosPurchaseRestoreSchema.parse(body)),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
