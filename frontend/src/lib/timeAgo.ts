const DIVISORS = [
  ["year",   60 * 60 * 24 * 365],
  ["month",  60 * 60 * 24 * 30],
  ["week",   60 * 60 * 24 * 7],
  ["day",    60 * 60 * 24],
  ["hour",   60 * 60],
  ["minute", 60],
  ["second", 1],
] as const;

export function timeAgo(date: Date | string | number, locale = "es") {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000); // negativo = pasado
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  for (const [unit, secondsInUnit] of DIVISORS) {
    const value = Math.trunc(diffSec / secondsInUnit);
    if (Math.abs(value) >= 1 || unit === "second") {
      return rtf.format(value, unit as Intl.RelativeTimeFormatUnit);
    }
  }
  return rtf.format(0, "second");
}
