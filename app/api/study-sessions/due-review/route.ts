import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { createDueReviewSession } from "@/modules/study/study.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await createDueReviewSession(user.id), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
