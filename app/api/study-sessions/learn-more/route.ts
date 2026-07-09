import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  createLearnMoreSession,
  learnMoreSchema,
} from "@/modules/study/study.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    return ok(await createLearnMoreSession(user.id, learnMoreSchema.parse(body)), {
      status: 201,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
