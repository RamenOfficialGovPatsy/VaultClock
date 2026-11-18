import { moment } from "obsidian";
import { TimeTrackerData } from "./storage";
import { DATE_FORMAT, sanitizeSeconds } from "./utils";

export interface TimeStats {
  totalSeconds: number;
  todaySeconds: number;
  last7DaysSeconds: number;
  last30DaysSeconds: number;
}

/**
 * Рассчитывает 4 целевые метрики на основе дневных сумм.
 * Календарные диапазоны (7 и 30 дней) включают сегодняшний день.
 */
export function calculateStats(data: TimeTrackerData): TimeStats {
  const now = moment();
  const today = now.format(DATE_FORMAT);

  let totalSeconds = 0;
  for (const value of Object.values(data.days)) {
    totalSeconds += sanitizeSeconds(value);
  }

  const todaySeconds = sanitizeSeconds(data.days[today]);

  let last7DaysSeconds = 0;
  for (let i = 0; i < 7; i++) {
    const key = now.clone().subtract(i, "days").format(DATE_FORMAT);
    last7DaysSeconds += sanitizeSeconds(data.days[key]);
  }

  let last30DaysSeconds = 0;
  for (let i = 0; i < 30; i++) {
    const key = now.clone().subtract(i, "days").format(DATE_FORMAT);
    last30DaysSeconds += sanitizeSeconds(data.days[key]);
  }

  return {
    totalSeconds,
    todaySeconds,
    last7DaysSeconds,
    last30DaysSeconds,
  };
}