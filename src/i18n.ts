import { moment } from "obsidian";

export type Language = "ru" | "en";

export interface Translations {
  statusBarAriaLabel: string;
  metrics: {
    total: string;
    today: string;
    last7Days: string;
    last30Days: string;
  };
  refreshAriaLabel: string;
  refreshTitle: string;
  resetModal: {
    title: string;
    description: string;
    cancel: string;
    confirm: string;
  };
  commands: {
    openStats: string;
    resetStats: string;
    toggleLanguage: string;
  };
  settings: {
    languageName: string;
    languageDesc: string;
  };
  duration: {
    lessThanMinute: string;
    hoursSuffix: string;
    minutesSuffix: string;
  };
}

const TRANSLATIONS: Record<Language, Translations> = {
  ru: {
    statusBarAriaLabel: "Открыть статистику VaultClock",
    metrics: {
      total: "Общее время",
      today: "Сегодня",
      last7Days: "За 7 дней",
      last30Days: "За 30 дней",
    },
    refreshAriaLabel: "Обновить статистику",
    refreshTitle: "Обновить",
    resetModal: {
      title: "Сбросить статистику?",
      description:
        "Все сохранённые данные о времени в этом хранилище будут удалены без возможности восстановления.",
      cancel: "Отмена",
      confirm: "Сбросить",
    },
    commands: {
      openStats: "Открыть статистику",
      resetStats: "Сбросить статистику",
      toggleLanguage: "Сменить язык (RU / EN)",
    },
    settings: {
      languageName: "Язык",
      languageDesc:
        "Выберите язык интерфейса плагина (названия команд обновятся после перезапуска плагина).",
    },
    duration: {
      lessThanMinute: "< 1м",
      hoursSuffix: "ч",
      minutesSuffix: "м",
    },
  },
  en: {
    statusBarAriaLabel: "Open VaultClock statistics",
    metrics: {
      total: "Total time",
      today: "Today",
      last7Days: "Last 7 days",
      last30Days: "Last 30 days",
    },
    refreshAriaLabel: "Refresh statistics",
    refreshTitle: "Refresh",
    resetModal: {
      title: "Reset statistics?",
      description:
        "All saved time data for this vault will be permanently deleted.",
      cancel: "Cancel",
      confirm: "Reset",
    },
    commands: {
      openStats: "Open statistics",
      resetStats: "Reset statistics",
      toggleLanguage: "Switch language (RU / EN)",
    },
    settings: {
      languageName: "Language",
      languageDesc:
        "Choose the plugin interface language (command names update after reloading the plugin).",
    },
    duration: {
      lessThanMinute: "< 1m",
      hoursSuffix: "h",
      minutesSuffix: "m",
    },
  },
};

export function isLanguage(value: unknown): value is Language {
  return value === "ru" || value === "en";
}

export function detectDefaultLanguage(): Language {
  const locale = moment.locale().toLowerCase();
  return locale.startsWith("ru") ? "ru" : "en";
}

export function getTranslations(lang: Language): Translations {
  return TRANSLATIONS[lang];
}