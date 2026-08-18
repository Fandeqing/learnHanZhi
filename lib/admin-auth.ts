import { timingSafeEqual } from "node:crypto";
import { ApiError } from "./api-error";

export function isAdminEnabled() {
  return process.env.ADMIN_ENABLED === "true";
}

export function requireAdmin(request: Request) {
  if (!isAdminEnabled()) {
    throw new ApiError(404, "NOT_FOUND", "Not found.");
  }

  const expectedToken = process.env.ADMIN_API_TOKEN?.trim();
  if (!expectedToken || expectedToken.length < 32) {
    throw new ApiError(503, "ADMIN_NOT_CONFIGURED", "Admin access is not configured.");
  }

  const authorization = request.headers.get("authorization");
  const actualToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const actual = Buffer.from(actualToken);
  const expected = Buffer.from(expectedToken);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new ApiError(401, "ADMIN_UNAUTHORIZED", "Administrator authentication is required.");
  }
}
