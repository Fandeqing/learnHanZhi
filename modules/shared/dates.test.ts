import { describe, expect, it } from "vitest";
import {
  getStudyDateUtcBounds,
  isPreviousStudyDate,
  isSameStudyDate,
  toStudyDate,
} from "./dates";

describe("study date helpers", () => {
  it("normalizes timestamps to Asia/Shanghai study date", () => {
    expect(toStudyDate(new Date("2026-07-11T23:59:00.000Z")).toISOString()).toBe(
      "2026-07-12T00:00:00.000Z",
    );
  });

  it("detects same study date", () => {
    expect(
      isSameStudyDate(
        new Date("2026-07-11T01:00:00.000Z"),
        new Date("2026-07-11T15:00:00.000Z"),
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

  it("returns UTC bounds for an Asia/Shanghai study date", () => {
    const bounds = getStudyDateUtcBounds(new Date("2026-07-11T00:00:00.000Z"));

    expect(bounds.start.toISOString()).toBe("2026-07-10T16:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-07-11T16:00:00.000Z");
  });
});
