import { handleRouteError, ok } from "@/lib/api-response";
import { getCharacterDataPackage } from "@/modules/sync/character-sync.service";

export async function GET() {
  try {
    return ok(await getCharacterDataPackage(), {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
