import { moment } from "obsidian";
import { getTranslations, Language } from "./i18n";

export const DATE_FORMAT = "YYYY-MM-DD";

/**
 * Возвращает ключ текущей локальной даты в формате YYYY-MM-DD.
 */
export function todayKey(): string {
  return moment().format(DATE_FORMAT);
}

/**
 * Приводит произвольное числовое значение секунд к корректному неотрицательному целому.
 * Битые значения (NaN, Infinity, отрицательные) санитизируются в 0.
 */
export function sanitizeSeconds(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

/**
 * Форматирует секунды в виде "Xч Yм" / "Xh Ym", а при значении меньше 1 минуты — "< 1м" / "< 1m".
 */
export function formatDuration(totalSeconds: number, lang: Language): string {
  const t = getTranslations(lang).duration;
  const safeSeconds = sanitizeSeconds(totalSeconds);
  if (safeSeconds < 60) {
    return t.lessThanMinute;
  }

  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}${t.hoursSuffix} ${minutes}${t.minutesSuffix}`;
}