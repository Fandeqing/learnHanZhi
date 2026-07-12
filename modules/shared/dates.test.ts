import { describe, expect, it } from "vitest";
import {
  getStudyDateUtcBounds,
  isPreviousStudyDate,
  isSameStudyDate,
  toStudyDate,
} from "./dates";

describe("study date helpers", () => {
  it("normalizes timestamps with the user's study time zone", () => {
    const timestamp = new Date("2026-07-11T23:59:00.000Z");

    expect(toStudyDate(timestamp, "Asia/Shanghai").toISOString()).toBe(
      "2026-07-12T00:00:00.000Z",
    );
    expect(toStudyDate(timestamp, "America/Los_Angeles").toISOString()).toBe(
      "2026-07-11T00:00:00.000Z",
    );
  });

  it("detects same stored study date", () => {
    expect(
      isSameStudyDate(
        new Date("2026-07-11T00:00:00.000Z"),
        new Date("2026-07-11T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("detects previous study date for streaks", () => {
    expect(
      isPreviousStudyDate(
        new Date("2026-07-10T00:00:00.000Z"),
        new Date("2026-07-11T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("returns UTC bounds for a study date in the user's time zone", () => {
    const shanghaiBounds = getStudyDateUtcBounds(
      new Date("2026-07-11T00:00:00.000Z"),
      "Asia/Shanghai",
    );
    const losAngelesBounds = getStudyDateUtcBounds(
      new Date("2026-07-11T00:00:00.000Z"),
      "America/Los_Angeles",
    );

    expect(shanghaiBounds.start.toISOString()).toBe("2026-07-10T16:00:00.000Z");
    expect(shanghaiBounds.end.toISOString()).toBe("2026-07-11T16:00:00.000Z");
    expect(losAngelesBounds.start.toISOString()).toBe("2026-07-11T07:00:00.000Z");
    expect(losAngelesBounds.end.toISOString()).toBe("2026-07-12T07:00:00.000Z");
  });
});
