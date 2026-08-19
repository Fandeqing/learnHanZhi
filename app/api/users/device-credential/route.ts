import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  deviceCredentialSchema,
  registerDeviceCredential,
} from "@/modules/users/device-credential.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = deviceCredentialSchema.parse(await request.json());
    return ok(await registerDeviceCredential(user.id, user.deviceId, body));
  } catch (error) {
    return handleRouteError(error);
  }
}
