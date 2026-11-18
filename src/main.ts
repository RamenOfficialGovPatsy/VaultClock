import { App, Modal, Plugin, WorkspaceLeaf } from "obsidian";
import { STATS_VIEW_TYPE, StatsView } from "./StatsView";
import { TimeTrackerStorage } from "./storage";
import { formatDuration, sanitizeSeconds, todayKey } from "./utils";

const TICK_INTERVAL_SECONDS = 30;
const TICK_INTERVAL_MS = TICK_INTERVAL_SECONDS * 1000;

class ConfirmResetModal extends Modal {
  private readonly onConfirm: () => Promise<void>;

  constructor(app: App, onConfirm: () => Promise<void>) {
    super(app);
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h3", { text: "Сбросить статистику?" });
    contentEl.createEl("p", {
      text: "Все сохранённые данные о времени в Obsidian будут удалены без возможности восстановления.",
    });

    const actions = contentEl.createDiv({ cls: "time-tracker-modal-actions" });

    const cancelButton = actions.createEl("button", { text: "Отмена" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const confirmButton = actions.createEl("button", {
      text: "Сбросить",
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
          () => this.flushElapsedSeconds()
        )
    );

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("time-tracker-status-bar");
    this.statusBarEl.setAttribute("aria-label", "Открыть статистику Time Tracker");
    this.registerDomEvent(this.statusBarEl, "click", () => {
      void this.activateStatsView();
    });
    this.updateStatusBar();

    // Obsidian автоматически добавляет префикс "<Название плагина>: " в палитре команд,
    // поэтому в палитре команды отображаются как "Time Tracker: Открыть статистику" и "Time Tracker: Сбросить статистику".
    this.addCommand({
      id: "open-stats",
      name: "Открыть статистику",
      callback: () => {
        void this.activateStatsView();
      },
    });

    this.addCommand({
      id: "reset-stats",
      name: "Сбросить статистику",
      callback: () => {
        new ConfirmResetModal(this.app, async () => {
          await this.storage.reset();
          this.lastTickAt = Date.now();
          this.updateStatusBar();
          this.refreshOpenStatsViews();
        }).open();
      },
    });

    this.lastTickAt = Date.now();
    this.registerInterval(
      window.setInterval(() => {
        this.onTick();
      }, TICK_INTERVAL_MS)
    );
  }

  onunload(): void {
    this.storage.cancelPendingSave();
    this.flushElapsedSeconds(false);

    // Принудительное сохранение при выгрузке плагина.
    void this.storage.saveNow();
  }

  private onTick(): void {
    this.flushElapsedSeconds(true);
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
    const data = this.storage.getData();
    const todaySeconds = sanitizeSeconds(data.days[todayKey()]);
    this.statusBarEl.setText(`⏱️ ${formatDuration(todaySeconds)}`);
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