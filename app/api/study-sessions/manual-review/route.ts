import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  createManualReviewSession,
  manualReviewSchema,
} from "@/modules/study/study.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { characterId } = manualReviewSchema.parse(body);
    return ok(await createManualReviewSession(user.id, characterId), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
