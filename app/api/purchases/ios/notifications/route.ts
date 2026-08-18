import { z } from "zod";
import { handleRouteError, ok } from "@/lib/api-response";
import { decodeAppStoreServerNotification } from "@/modules/purchases/apple-store.service";
import { reconcileAppStoreNotification } from "@/modules/purchases/purchase.service";

export const runtime = "nodejs";

const notificationSchema = z.object({
  signedPayload: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const { signedPayload } = notificationSchema.parse(await request.json());
    const decoded = await decodeAppStoreServerNotification(signedPayload);
    if (!decoded.transaction) {
      return ok({ handled: false, notificationType: decoded.notification.notificationType });
    }
    const result = await reconcileAppStoreNotification(decoded.transaction);
    return ok({ ...result, notificationType: decoded.notification.notificationType });
  } catch (error) {
    return handleRouteError(error);
  }
}
