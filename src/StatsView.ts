import { ItemView, setIcon, WorkspaceLeaf } from "obsidian";
import { getTranslations, Language } from "./i18n";
import { calculateStats } from "./stats";
import { TimeTrackerData } from "./storage";
import { formatDuration } from "./utils";

export const STATS_VIEW_TYPE = "obsidian-time-tracker-stats";
const VIEW_REFRESH_INTERVAL_MS = 30_000;
const REFRESH_ANIMATION_MS = 350;

interface MetricRow {
  emoji: string;
  label: string;
  value: string;
}

export class StatsView extends ItemView {
  private readonly getData: () => TimeTrackerData;
  private readonly getLanguage: () => Language;
  private readonly onRefresh?: () => void;
  private refreshIntervalId: number | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    getData: () => TimeTrackerData,
    getLanguage: () => Language,
    onRefresh?: () => void
  ) {
    super(leaf);
    this.getData = getData;
    this.getLanguage = getLanguage;
    this.onRefresh = onRefresh;
  }

  getViewType(): string {
    return STATS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "VaultClock";
  }

  getIcon(): string {
    return "clock";
  }

  async onOpen(): Promise<void> {
    this.render();
    this.startAutoRefresh();
  }

  async onClose(): Promise<void> {
    this.stopAutoRefresh();
    this.contentEl.empty();
  }

  render(animate = false): void {
    const lang = this.getLanguage();
    const t = getTranslations(lang);
    const stats = calculateStats(this.getData());

    const rows: MetricRow[] = [
      {
        emoji: "⏱️",
        label: t.metrics.total,
        value: formatDuration(stats.totalSeconds, lang),
      },
      {
        emoji: "📅",
        label: t.metrics.today,
        value: formatDuration(stats.todaySeconds, lang),
      },
      {
        emoji: "📆",
        label: t.metrics.last7Days,
        value: formatDuration(stats.last7DaysSeconds, lang),
      },
      {
        emoji: "📅",
        label: t.metrics.last30Days,
        value: formatDuration(stats.last30DaysSeconds, lang),
      },
    ];

    const container = this.contentEl;
    container.empty();

    const wrapper = container.createDiv({ cls: "time-tracker-view" });

    const header = wrapper.createDiv({ cls: "time-tracker-header" });
    header.createEl("h4", {
      text: "VaultClock",
      cls: "time-tracker-title",
    });

    const refreshButton = header.createEl("button", {
      cls: "time-tracker-refresh-btn",
      attr: {
        type: "button",
        "aria-label": t.refreshAriaLabel,
        title: t.refreshTitle,
      },
    });
    setIcon(refreshButton, "refresh-cw");
    refreshButton.addEventListener("click", () => {
      this.onRefresh?.();
      this.render(true);
    });

    const list = wrapper.createDiv({ cls: "time-tracker-list" });
    for (const row of rows) {
      const rowEl = list.createDiv({ cls: "time-tracker-row" });

      const labelWrap = rowEl.createDiv({ cls: "time-tracker-label" });
      labelWrap.createSpan({ text: row.emoji, cls: "time-tracker-emoji" });
      labelWrap.createSpan({ text: row.label });

      rowEl.createSpan({ text: row.value, cls: "time-tracker-value" });
    }

    if (animate) {
      refreshButton.addClass("is-spinning");
      list.addClass("is-refreshed");
      window.setTimeout(() => {
        refreshButton.removeClass("is-spinning");
        list.removeClass("is-refreshed");
      }, REFRESH_ANIMATION_MS);
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshIntervalId = window.setInterval(() => {
      this.render();
    }, VIEW_REFRESH_INTERVAL_MS);
  }

  private stopAutoRefresh(): void {
    if (this.refreshIntervalId !== null) {
      window.clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }
}