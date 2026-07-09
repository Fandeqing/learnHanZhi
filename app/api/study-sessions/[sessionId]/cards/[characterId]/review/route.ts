import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import {
  reviewRatingSchema,
  submitReviewRating,
} from "@/modules/study/study.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string; characterId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { sessionId, characterId } = await context.params;
    const body = await request.json();
    return ok(
      await submitReviewRating(
        user.id,
        sessionId,
        characterId,
        reviewRatingSchema.parse(body),
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
