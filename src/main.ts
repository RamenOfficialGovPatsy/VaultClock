import { App, Modal, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from "obsidian";
import { getTranslations, isLanguage, Language } from "./i18n";
import { STATS_VIEW_TYPE, StatsView } from "./StatsView";
import { TimeTrackerStorage } from "./storage";
import { formatDuration, sanitizeSeconds, todayKey } from "./utils";

const TICK_INTERVAL_SECONDS = 30;
const TICK_INTERVAL_MS = TICK_INTERVAL_SECONDS * 1000;

class ConfirmResetModal extends Modal {
  private readonly lang: Language;
  private readonly onConfirm: () => Promise<void>;

  constructor(app: App, lang: Language, onConfirm: () => Promise<void>) {
    super(app);
    this.lang = lang;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const t = getTranslations(this.lang).resetModal;
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h3", { text: t.title });
    contentEl.createEl("p", { text: t.description });

    const actions = contentEl.createDiv({ cls: "time-tracker-modal-actions" });

    const cancelButton = actions.createEl("button", { text: t.cancel });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const confirmButton = actions.createEl("button", {
      text: t.confirm,
      cls: "mod-warning",
    });
    confirmButton.addEventListener("click", () => {
      void this.handleConfirm();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async handleConfirm(): Promise<void> {
    await this.onConfirm();
    this.close();
  }
}

class VaultClockSettingTab extends PluginSettingTab {
  private readonly plugin: TimeTrackerPlugin;

  constructor(app: App, plugin: TimeTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const lang = this.plugin.getLanguage();
    const t = getTranslations(lang).settings;

    containerEl.empty();

    new Setting(containerEl)
      .setName(t.languageName)
      .setDesc(t.languageDesc)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("ru", "Русский")
          .addOption("en", "English")
          .setValue(lang)
          .onChange(async (value) => {
            if (!isLanguage(value)) {
              return;
            }
            await this.plugin.setLanguage(value);
            this.display();
          })
      );
  }
}

export default class TimeTrackerPlugin extends Plugin {
  private storage!: TimeTrackerStorage;
  private statusBarEl: HTMLElement | null = null;
  private lastTickAt = 0;

  async onload(): Promise<void> {
    this.storage = new TimeTrackerStorage(this);
    await this.storage.load();

    this.registerView(
      STATS_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new StatsView(
          leaf,
          () => this.storage.getData(),
          () => this.storage.getLanguage(),
          () => this.flushElapsedSeconds(true)
        )
    );

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("time-tracker-status-bar");
    this.registerDomEvent(this.statusBarEl, "click", () => {
      void this.activateStatsView();
    });
    this.updateStatusBar();

    this.addSettingTab(new VaultClockSettingTab(this.app, this));

    const commandText = getTranslations(this.storage.getLanguage()).commands;

    // Obsidian автоматически добавляет префикс "<Название плагина>: " в палитре команд.
    this.addCommand({
      id: "open-stats",
      name: commandText.openStats,
      callback: () => {
        void this.activateStatsView();
      },
    });

    this.addCommand({
      id: "reset-stats",
      name: commandText.resetStats,
      callback: () => {
        new ConfirmResetModal(this.app, this.storage.getLanguage(), async () => {
          await this.storage.reset();
          this.lastTickAt = Date.now();
          this.updateStatusBar();
          this.refreshOpenStatsViews();
        }).open();
      },
    });

    this.addCommand({
      id: "toggle-language",
      name: commandText.toggleLanguage,
      callback: () => {
        const nextLang: Language =
          this.storage.getLanguage() === "ru" ? "en" : "ru";
        void this.setLanguage(nextLang);
      },
    });

    // Сохранение при закрытии окна и при уходе приложения в фон (важно для мобильных ОС).
    this.registerDomEvent(window, "beforeunload", () => {
      this.flushAndSaveNow();
    });

    this.registerDomEvent(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flushAndSaveNow();
      }
    });

    // Защита от «двойного счёта» при перезапуске/краше: lastTickAt не сохраняется в data.json,
    // при старте плагина всегда начинаем новый отсчёт с текущего момента без добавления времени простоя.
    this.lastTickAt = Date.now();
    this.registerInterval(
      window.setInterval(() => {
        this.onTick();
      }, TICK_INTERVAL_MS)
    );
  }

  onunload(): void {
    this.flushAndSaveNow();
  }

  getLanguage(): Language {
    return this.storage.getLanguage();
  }

  async setLanguage(language: Language): Promise<void> {
    await this.storage.setLanguage(language);
    this.updateStatusBar();
    this.refreshOpenStatsViews();
  }

  private onTick(): void {
    this.flushElapsedSeconds(true);
  }

  private flushAndSaveNow(): void {
    this.storage.cancelPendingSave();
    this.flushElapsedSeconds(false);
    void this.storage.saveNow();
  }

  private flushElapsedSeconds(scheduleSave = true): void {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.lastTickAt) / 1000);
    const deltaSeconds = Math.min(
      TICK_INTERVAL_SECONDS,
      Math.max(0, elapsedSeconds)
    );
    this.lastTickAt = now;

    if (deltaSeconds > 0) {
      this.storage.addSeconds(todayKey(), deltaSeconds);
      if (scheduleSave) {
        this.storage.requestSave();
      }
      this.updateStatusBar();
    }
  }

  private updateStatusBar(): void {
    if (!this.statusBarEl) {
      return;
    }
    const lang = this.storage.getLanguage();
    const t = getTranslations(lang);
    const data = this.storage.getData();
    const todaySeconds = sanitizeSeconds(data.days[todayKey()]);

    this.statusBarEl.setAttribute("aria-label", t.statusBarAriaLabel);
    this.statusBarEl.setText(`⏱️ ${formatDuration(todaySeconds, lang)}`);
  }

  private async activateStatsView(): Promise<void> {
    const { workspace } = this.app;
    const [existingLeaf] = workspace.getLeavesOfType(STATS_VIEW_TYPE);

    if (existingLeaf) {
      await workspace.revealLeaf(existingLeaf);
      return;
    }

    // Дефолт: открываем в правой боковой панели; если она недоступна, используем новую вкладку.
    const leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf("tab");
    await leaf.setViewState({
      type: STATS_VIEW_TYPE,
      active: true,
    });
    await workspace.revealLeaf(leaf);
  }

  private refreshOpenStatsViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(STATS_VIEW_TYPE)) {
      if (leaf.view instanceof StatsView) {
        leaf.view.render();
      }
    }
  }
}