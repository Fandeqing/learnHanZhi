import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "./api-error";
import { requireAdmin } from "./admin-auth";

const previousEnabled = process.env.ADMIN_ENABLED;
const previousToken = process.env.ADMIN_API_TOKEN;

afterEach(() => {
  restoreEnvironment("ADMIN_ENABLED", previousEnabled);
  restoreEnvironment("ADMIN_API_TOKEN", previousToken);
});

describe("requireAdmin", () => {
  it("returns not found while admin access is disabled", () => {
    delete process.env.ADMIN_ENABLED;
    expect(() => requireAdmin(new Request("https://example.com/api/admin"))).toThrow(ApiError);
    try {
      requireAdmin(new Request("https://example.com/api/admin"));
    } catch (error) {
      expect(error).toMatchObject({ status: 404, code: "NOT_FOUND" });
    }
  });

  it("accepts only the configured bearer token", () => {
    const token = "test-admin-token-that-is-at-least-32-characters";
    process.env.ADMIN_ENABLED = "true";
    process.env.ADMIN_API_TOKEN = token;

    expect(() =>
      requireAdmin(
        new Request("https://example.com/api/admin", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      requireAdmin(
        new Request("https://example.com/api/admin", {
          headers: { authorization: "Bearer wrong-token" },
        }),
      ),
    ).toThrow(ApiError);
  });
});

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
