import { debounce, Debouncer, Plugin } from "obsidian";
import { detectDefaultLanguage, isLanguage, Language } from "./i18n";
import { sanitizeSeconds } from "./utils";

export interface TimeTrackerData {
  days: Record<string, number>;
  language: Language;
}

const SAVE_DEBOUNCE_MS = 60_000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function createDefaultData(language: Language = detectDefaultLanguage()): TimeTrackerData {
  return { days: {}, language };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Проверяет и очищает данные из data.json.
 * Невалидные значения секунд сбрасываются в 0, отсутствующий язык заполняется дефолтным.
 */
function sanitizeData(raw: unknown): { data: TimeTrackerData; changed: boolean } {
  if (!isPlainRecord(raw)) {
    return { data: createDefaultData(), changed: true };
  }

  let changed = false;

  let language: Language;
  if (isLanguage(raw.language)) {
    language = raw.language;
  } else {
    language = detectDefaultLanguage();
    changed = true;
  }

  const rawDays = raw.days;
  if (!isPlainRecord(rawDays)) {
    return { data: createDefaultData(language), changed: true };
  }

  const cleanDays: Record<string, number> = {};

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

  return { data: { days: cleanDays, language }, changed };
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

    if (changed) {
      await this.saveNow();
    }
  }

  getData(): TimeTrackerData {
    return this.data;
  }

  getLanguage(): Language {
    return this.data.language;
  }

  async setLanguage(language: Language): Promise<void> {
    this.data.language = language;
    await this.saveNow();
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
    // Сохраняем выбранный пользователем язык при сбросе статистики.
    this.data = createDefaultData(this.data.language);
    await this.saveNow();
  }
}