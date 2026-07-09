import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api-response";
import { getCharacterDetail } from "@/modules/characters/character.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { characterId } = await context.params;
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    return ok(await getCharacterDetail(user.id, characterId, sessionId));
  } catch (error) {
    return handleRouteError(error);
  }
}
