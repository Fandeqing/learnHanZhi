import { describe, expect, it } from "vitest";
import { isPreviousStudyDate, isSameStudyDate, toStudyDate } from "./dates";

describe("study date helpers", () => {
  it("normalizes timestamps to UTC study date", () => {
    expect(toStudyDate(new Date("2026-07-11T23:59:00.000Z")).toISOString()).toBe(
      "2026-07-11T00:00:00.000Z",
    );
  });

  it("detects same study date", () => {
    expect(
      isSameStudyDate(
        new Date("2026-07-11T01:00:00.000Z"),
        new Date("2026-07-11T22:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("detects previous study date for streaks", () => {
    expect(
      isPreviousStudyDate(
        new Date("2026-07-10T12:00:00.000Z"),
        new Date("2026-07-11T01:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
