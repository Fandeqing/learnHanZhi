const DEFAULT_STUDY_TIME_ZONE = "UTC";

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function normalizeStudyTimeZone(timeZone?: string | null) {
  if (!timeZone) {
    return DEFAULT_STUDY_TIME_ZONE;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_STUDY_TIME_ZONE;
  }
}

export function toStudyDate(date: Date, timeZone?: string | null) {
  const parts = getTimeZoneDateParts(date, normalizeStudyTimeZone(timeZone));
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
    ),
  );
}

export function getStudyDateUtcBounds(studyDate: Date, timeZone?: string | null) {
  const normalizedTimeZone = normalizeStudyTimeZone(timeZone);
  const start = getUtcForTimeZoneDate(
    studyDate.getUTCFullYear(),
    studyDate.getUTCMonth() + 1,
    studyDate.getUTCDate(),
    normalizedTimeZone,
  );
  const nextStudyDate = addDays(studyDate, 1);
  const end = getUtcForTimeZoneDate(
    nextStudyDate.getUTCFullYear(),
    nextStudyDate.getUTCMonth() + 1,
    nextStudyDate.getUTCDate(),
    normalizedTimeZone,
  );
  return { start, end };
}

export function isPreviousStudyDate(previous: Date, current: Date) {
  return previous.getTime() === addDays(current, -1).getTime();
}

export function isSameStudyDate(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return localAsUtc - date.getTime();
}

function getUtcForTimeZoneDate(
  year: number,
  month: number,
  day: number,
  timeZone: string,
) {
  let utc = Date.UTC(year, month - 1, day);

  for (let i = 0; i < 3; i += 1) {
    utc = Date.UTC(year, month - 1, day) - getTimeZoneOffsetMs(new Date(utc), timeZone);
  }

  return new Date(utc);
}
