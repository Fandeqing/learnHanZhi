export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function toStudyDate(date: Date) {
  const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
  const shanghaiDate = new Date(date.getTime() + shanghaiOffsetMs);
  return new Date(
    Date.UTC(
      shanghaiDate.getUTCFullYear(),
      shanghaiDate.getUTCMonth(),
      shanghaiDate.getUTCDate(),
    ),
  );
}

export function getStudyDateUtcBounds(studyDate: Date) {
  const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
  const start = new Date(studyDate.getTime() - shanghaiOffsetMs);
  const end = addDays(start, 1);
  return { start, end };
}

export function isPreviousStudyDate(previous: Date, current: Date) {
  const previousTime = toStudyDate(previous).getTime();
  const yesterdayTime = addDays(toStudyDate(current), -1).getTime();
  return previousTime === yesterdayTime;
}

export function isSameStudyDate(a: Date, b: Date) {
  return toStudyDate(a).getTime() === toStudyDate(b).getTime();
}
