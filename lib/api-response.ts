import { ZodError } from "zod";
import { isApiError } from "./api-error";

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(
    {
      success: true,
      data,
    },
    init,
  );
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message,
        ...details,
      },
    },
    { status },
  );
}

export function handleRouteError(error: unknown) {
  if (isApiError(error)) {
    return fail(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return fail(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.");
  }

  console.error(error);
  return fail(500, "INTERNAL_SERVER_ERROR", "Something went wrong.");
}
