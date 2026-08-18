import { describe, expect, it } from "vitest";
import { accountDeletionSchema } from "./account-deletion.service";

describe("accountDeletionSchema", () => {
  it("accepts anonymous deletion without Apple credentials", () => {
    expect(accountDeletionSchema.parse({})).toEqual({});
  });

  it("requires the Apple identity token and authorization code together", () => {
    expect(() => accountDeletionSchema.parse({ identityToken: "token" })).toThrow();
    expect(() => accountDeletionSchema.parse({ authorizationCode: "code" })).toThrow();
    expect(
      accountDeletionSchema.parse({ identityToken: "token", authorizationCode: "code" }),
    ).toEqual({ identityToken: "token", authorizationCode: "code" });
  });
});
