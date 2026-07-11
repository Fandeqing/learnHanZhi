export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toStudyDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isPreviousStudyDate(previous: Date, current: Date) {
  const previousTime = toStudyDate(previous).getTime();
  const yesterdayTime = addDays(toStudyDate(current), -1).getTime();
  return previousTime === yesterdayTime;
}

export function isSameStudyDate(a: Date, b: Date) {
  return toStudyDate(a).getTime() === toStudyDate(b).getTime();
}
