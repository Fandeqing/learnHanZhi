import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  completeOnboarding,
  completeOnboardingSchema,
} from "@/modules/users/user.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    return ok(await completeOnboarding(user.id, completeOnboardingSchema.parse(body)));
  } catch (error) {
    return handleRouteError(error);
  }
}
