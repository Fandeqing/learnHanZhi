import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { createReviewSession } from "@/modules/study/study.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await createReviewSession(user.id), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
