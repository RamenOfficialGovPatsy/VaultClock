import { debounce, Debouncer, Plugin } from "obsidian";
import { sanitizeSeconds } from "./utils";

export interface TimeTrackerData {
  days: Record<string, number>;
}

const SAVE_DEBOUNCE_MS = 60_000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function createDefaultData(): TimeTrackerData {
  return { days: {} };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Проверяет и очищает данные из data.json.
 * Невалидные значения секунд для ключей-дат сбрасываются в 0; ключи не в формате YYYY-MM-DD отбрасываются.
 */
function sanitizeData(raw: unknown): { data: TimeTrackerData; changed: boolean } {
  if (!isPlainRecord(raw)) {
    return { data: createDefaultData(), changed: true };
  }

  const rawDays = raw.days;
  if (!isPlainRecord(rawDays)) {
    return { data: createDefaultData(), changed: true };
  }

  const cleanDays: Record<string, number> = {};
  let changed = false;

  for (const [key, value] of Object.entries(rawDays)) {
    if (!DATE_KEY_PATTERN.test(key)) {
      changed = true;
      continue;
    }

    const sanitized = sanitizeSeconds(value);
    if (sanitized !== value) {
      changed = true;
    }
    cleanDays[key] = sanitized;
  }

  return { data: { days: cleanDays }, changed };
}

export class TimeTrackerStorage {
  private readonly plugin: Plugin;
  private data: TimeTrackerData = createDefaultData();
  private readonly debouncedSave: Debouncer<[], void>;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    // resetTimer = false: при регулярных вызовах каждые 30с запись происходит
    // не чаще раза в 60с (без бесконечного откладывания таймера).
    this.debouncedSave = debounce(
      () => {
        void this.saveNow();
      },
      SAVE_DEBOUNCE_MS,
      false
    );
  }

  async load(): Promise<void> {
    const raw: unknown = await this.plugin.loadData();
    const { data, changed } = sanitizeData(raw);
    this.data = data;

    // Если data.json отсутствует или содержал повреждённые поля — сразу сохраняем валидный дефолт.
    if (changed) {
      await this.saveNow();
    }
  }

  getData(): TimeTrackerData {
    return this.data;
  }

  addSeconds(dateKey: string, seconds: number): void {
    const safeDelta = sanitizeSeconds(seconds);
    if (safeDelta === 0) {
      return;
    }
    const current = sanitizeSeconds(this.data.days[dateKey]);
    this.data.days[dateKey] = current + safeDelta;
  }

  requestSave(): void {
    this.debouncedSave();
  }

  cancelPendingSave(): void {
    this.debouncedSave.cancel();
  }

  async saveNow(): Promise<void> {
    await this.plugin.saveData(this.data);
  }

  async reset(): Promise<void> {
    this.cancelPendingSave();
    this.data = createDefaultData();
    await this.saveNow();
  }
}