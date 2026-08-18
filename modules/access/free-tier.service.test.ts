import { describe, expect, it } from "vitest";
import { remainingFreeCharacterCount } from "./free-tier.service";

describe("remainingFreeCharacterCount", () => {
  it("only consumes the free allowance after a character is completed", () => {
    expect(remainingFreeCharacterCount(0)).toBe(30);
    expect(remainingFreeCharacterCount(29)).toBe(1);
    expect(remainingFreeCharacterCount(30)).toBe(0);
    expect(remainingFreeCharacterCount(31)).toBe(0);
  });
});
