import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-error";
import { assertTransactionOwnership } from "./purchase.service";

describe("assertTransactionOwnership", () => {
  it("accepts a new transaction bound to the current user", () => {
    expect(() => assertTransactionOwnership("user-a", null, "user-a")).not.toThrow();
  });

  it("keeps verification idempotent for the existing owner", () => {
    expect(() => assertTransactionOwnership("user-a", "user-a", null)).not.toThrow();
  });

  it("rejects replaying an owned transaction on another user", () => {
    expect(() => assertTransactionOwnership("user-b", "user-a", "user-b")).toThrow(ApiError);
  });

  it("rejects an unowned transaction without a matching app account token", () => {
    expect(() => assertTransactionOwnership("user-b", null, "user-a")).toThrow(ApiError);
  });

  it("allows an orphaned purchase to be restored by the same Apple account", () => {
    expect(() =>
      assertTransactionOwnership("user-b", null, null, "apple-hash", "apple-hash"),
    ).not.toThrow();
  });

  it("rejects an orphaned purchase from a different Apple account", () => {
    expect(() =>
      assertTransactionOwnership("user-b", null, "user-b", "owner-hash", "other-hash"),
    ).toThrow(ApiError);
  });
});
