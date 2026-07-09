import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { completeStudySession } from "@/modules/study/study.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { sessionId } = await context.params;
    return ok(await completeStudySession(user.id, sessionId));
  } catch (error) {
    return handleRouteError(error);
  }
}
