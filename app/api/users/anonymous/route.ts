import { handleRouteError, ok } from "@/lib/api-response";
import {
  anonymousUserSchema,
  createAnonymousUser,
} from "@/modules/users/user.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await createAnonymousUser(anonymousUserSchema.parse(body));
    return ok(user, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
