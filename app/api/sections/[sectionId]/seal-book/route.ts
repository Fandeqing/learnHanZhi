import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { getSealBook } from "@/modules/sections/seal-book.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ sectionId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { sectionId } = await context.params;
    return ok(await getSealBook(user.id, sectionId));
  } catch (error) {
    return handleRouteError(error);
  }
}
