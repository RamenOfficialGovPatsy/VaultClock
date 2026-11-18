import { ItemView, WorkspaceLeaf } from "obsidian";
import { calculateStats } from "./stats";
import { TimeTrackerData } from "./storage";
import { formatDuration } from "./utils";

export const STATS_VIEW_TYPE = "obsidian-time-tracker-stats";
const VIEW_REFRESH_INTERVAL_MS = 30_000;

interface MetricRow {
  emoji: string;
  label: string;
  value: string;
}

export class StatsView extends ItemView {
  private readonly getData: () => TimeTrackerData;
  private refreshIntervalId: number | null = null;

  constructor(leaf: WorkspaceLeaf, getData: () => TimeTrackerData) {
    super(leaf);
    this.getData = getData;
  }

  getViewType(): string {
    return STATS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Time Tracker";
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

  render(): void {
    const stats = calculateStats(this.getData());
    const rows: MetricRow[] = [
      {
        emoji: "⏱️",
        label: "Общее время",
        value: formatDuration(stats.totalSeconds),
      },
      {
        emoji: "📅",
        label: "Сегодня",
        value: formatDuration(stats.todaySeconds),
      },
      {
        emoji: "📆",
        label: "За 7 дней",
        value: formatDuration(stats.last7DaysSeconds),
      },
      {
        emoji: "📅",
        label: "За 30 дней",
        value: formatDuration(stats.last30DaysSeconds),
      },
    ];

    const container = this.contentEl;
    container.empty();

    const wrapper = container.createDiv({ cls: "time-tracker-view" });
    wrapper.createEl("h4", {
      text: "Time Tracker",
      cls: "time-tracker-title",
    });

    const list = wrapper.createDiv({ cls: "time-tracker-list" });
    for (const row of rows) {
      const rowEl = list.createDiv({ cls: "time-tracker-row" });

      const labelWrap = rowEl.createDiv({ cls: "time-tracker-label" });
      labelWrap.createSpan({ text: row.emoji, cls: "time-tracker-emoji" });
      labelWrap.createSpan({ text: row.label });

      rowEl.createSpan({ text: row.value, cls: "time-tracker-value" });
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