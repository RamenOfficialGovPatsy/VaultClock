import { moment } from "obsidian";

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
 * Форматирует секунды строго в виде "Xч Yм", а при значении меньше 1 минуты — "< 1м".
 * Если часов 0 (например, 5 минут), выводится "0ч 5м" согласно формату "Xч Yм".
 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = sanitizeSeconds(totalSeconds);
  if (safeSeconds < 60) {
    return "< 1м";
  }

  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}ч ${minutes}м`;
}