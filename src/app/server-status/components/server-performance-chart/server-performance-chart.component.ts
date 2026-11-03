
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';

import {
  DatePipe,
  DecimalPipe,
} from '@angular/common';

import {
  ServerHistoryRange,
  ServerPerformanceHistoryResponse,
  ServerHistoryPoint,
} from '../../services/server-performance-history.service';

type ChartMetric = 'cpu_max' | 'memory_avg' | 'disk_avg';

interface ChartMarker {
  x: number;
  y: number;
  title: string;
}

@Component({
  selector: 'app-server-performance-chart',
  standalone: true,
  imports: [DatePipe, DecimalPipe],

  template: `
    <section class="history-card">

      <div class="history-header">
        <div>
          <span class="eyebrow">PERFORMANCE ANALYTICS</span>
          <h2>Performance History</h2>
          <p>Historical server resource usage</p>
        </div>

        <div class="range-control" aria-label="History range">
          @for (option of ranges; track option.value) {
            <button
              type="button"
              [class.active]="range === option.value"
              [attr.aria-pressed]="range === option.value"
              [disabled]="loading"
              (click)="changeRange(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      @if (history?.summary?.peak_cpu_percent != null) {
        <div class="peak-summary">
          <div>
            <span>Peak CPU observed</span>
            <strong>
              {{ history!.summary.peak_cpu_percent | number:'1.0-1' }}%
            </strong>
          </div>
          <div>
            <span>Peak recorded at</span>
            <strong class="peak-date">
              {{ history!.summary.peak_cpu_at | date:'MMM d, HH:mm' }}
            </strong>
          </div>
          <div>
            <span>Samples recorded</span>
            <strong>{{ history!.sample_count }}</strong>
          </div>
        </div>
      }

      @if (loading) {
        <div class="chart-state">Loading performance history...</div>
      } @else if (error) {
        <div class="chart-state error" role="alert">
          {{ error }}
        </div>
      } @else if (!history || history.data.length === 0) {
        <div class="chart-state">
          No historical measurements available yet.
        </div>
      } @else {
        <div class="chart-legend">
          <span><i class="dot cpu"></i> CPU Peak</span>
          <span><i class="dot memory"></i> RAM Average</span>
          <span><i class="dot disk"></i> Disk Average</span>
        </div>

        <div class="chart-layout">
          <div class="y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div class="chart-main">
            <svg
              viewBox="0 0 900 200"
              preserveAspectRatio="none"
              role="img"
              aria-label="CPU, memory and disk usage over time"
            >
              @for (y of gridLines; track y) {
                <line
                  x1="0"
                  [attr.y1]="y"
                  x2="900"
                  [attr.y2]="y"
                  class="grid-line"
                />
              }

              <path [attr.d]="cpuPath" class="line-cpu" />
              <path [attr.d]="memoryPath" class="line-memory" />
              <path [attr.d]="diskPath" class="line-disk" />

              @for (marker of cpuMarkers; track $index) {
                <circle
                  [attr.cx]="marker.x"
                  [attr.cy]="marker.y"
                  r="5"
                  class="cpu-marker"
                >
                  <title>{{ marker.title }}</title>
                </circle>
              }
            </svg>

            <div class="x-axis">
              @for (label of timeLabels; track $index) {
                <span>{{ label }}</span>
              }
            </div>
          </div>
        </div>

        <p class="chart-note">
          Values represent recorded samples. Short spikes
          between measurements may not be captured.
        </p>
      }
    </section>
  `,

  styles: [`
    :host { display: block; }

    .history-card {
      padding: 24px;
      background: #fff;
      border: 1px solid #e7e9ed;
      border-radius: 18px;
      box-shadow: 0 5px 22px rgba(25,30,42,.025);
      color: #23262b;
      font-family: Inter, -apple-system, BlinkMacSystemFont,
        'Segoe UI', sans-serif;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 22px;
    }

    .eyebrow {
      color: #a0a4ad;
      font-size: 10px;
      font-weight: 750;
      letter-spacing: .13em;
    }

    h2 {
      margin: 8px 0 5px;
      font-size: 21px;
      font-weight: 750;
      letter-spacing: -.025em;
    }

    .history-header p {
      margin: 0;
      color: #9297a0;
      font-size: 12px;
    }

    .range-control {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: #f5f6f8;
      border-radius: 12px;
    }

    .range-control button {
      padding: 9px 13px;
      background: transparent;
      border: 0;
      border-radius: 9px;
      color: #747b86;
      font: inherit;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }

    .range-control button.active {
      color: #e66a13;
      background: #fff;
      box-shadow: 0 1px 5px rgba(0,0,0,.06);
    }

    .range-control button:focus-visible {
      outline: 2px solid #ff842e;
      outline-offset: 2px;
    }

    .range-control button:disabled {
      opacity: .6;
      cursor: default;
    }

    .peak-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .peak-summary > div {
      display: flex;
      flex-direction: column;
      gap: 7px;
      padding: 17px;
      background: #fafbfc;
      border: 1px solid #eff0f3;
      border-radius: 13px;
    }

    .peak-summary span {
      color: #9297a0;
      font-size: 11px;
    }

    .peak-summary strong {
      font-size: 21px;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .peak-summary .peak-date { font-size: 14px; }

    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 19px;
      margin-bottom: 17px;
      color: #757b86;
      font-size: 11px;
      font-weight: 600;
    }

    .chart-legend span {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    .dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }

    .cpu { background: #ff7627; }
    .memory { background: #648be0; }
    .disk { background: #a77ada; }

    .chart-layout {
      display: flex;
      gap: 12px;
      min-width: 0;
    }

    .y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 200px;
      color: #a0a5ae;
      font-size: 10px;
      font-variant-numeric: tabular-nums;
    }

    .chart-main {
      flex: 1;
      min-width: 0;
    }

    svg {
      display: block;
      width: 100%;
      height: 200px;
      overflow: visible;
    }

    .grid-line {
      stroke: #edf0f3;
      stroke-width: 1;
    }

    path {
      fill: none;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .line-cpu { stroke: #ff7627; }
    .line-memory { stroke: #648be0; }
    .line-disk { stroke: #a77ada; }

    .cpu-marker {
      fill: #ff7627;
      opacity: 0;
      cursor: crosshair;
    }

    .cpu-marker:hover { opacity: 1; }

    .x-axis {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin-top: 11px;
      color: #a0a5ae;
      font-size: 10px;
    }

    .chart-state {
      display: grid;
      place-items: center;
      min-height: 235px;
      color: #9297a0;
      font-size: 12px;
      text-align: center;
    }

    .chart-state.error { color: #c43838; }

    .chart-note {
      margin: 17px 0 0;
      color: #a0a5ae;
      font-size: 10px;
      line-height: 1.6;
    }

    @media (max-width: 600px) {
      .history-card { padding: 18px 14px; }
      h2 { font-size: 19px; }
      .peak-summary { gap: 7px; }
      .peak-summary > div { padding: 11px; }
      .peak-summary span { font-size: 9px; }
      .peak-summary strong { font-size: 16px; }
      .peak-summary .peak-date { font-size: 11px; }
      .x-axis { font-size: 9px; }
    }
  `],
})
export class ServerPerformanceChartComponent implements OnChanges {

  @Input() history: ServerPerformanceHistoryResponse | null = null;
  @Input() range: ServerHistoryRange = '24h';
  @Input() loading = false;
  @Input() error = '';

  @Output() rangeChange =
    new EventEmitter<ServerHistoryRange>();

  readonly ranges: {
    value: ServerHistoryRange;
    label: string;
  }[] = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
  ];

  readonly gridLines = [0, 50, 100, 150, 200];

  cpuPath = '';
  memoryPath = '';
  diskPath = '';

  cpuMarkers: ChartMarker[] = [];
  timeLabels: string[] = [];

  ngOnChanges(): void {
    this.buildChart();
  }

  changeRange(value: ServerHistoryRange): void {
    if (!this.loading && value !== this.range) {
      this.rangeChange.emit(value);
    }
  }

  private buildChart(): void {
    this.cpuPath = '';
    this.memoryPath = '';
    this.diskPath = '';
    this.cpuMarkers = [];

    const end = Date.now();

    const duration = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[this.range];

    const start = end - duration;

    this.timeLabels = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(start + duration * i / 4);

      return this.range === '24h'
        ? date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
        : date.toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric',
        });
    });

    if (!this.history || this.history.range !== this.range) {
      return;
    }

    const points = [...this.history.data]
      .filter(point => Number.isFinite(Date.parse(point.time)))
      .sort(
        (a, b) =>
          Date.parse(a.time) - Date.parse(b.time),
      );

    this.cpuPath = this.makePath(
      points, 'cpu_max', start, end,
    );

    this.memoryPath = this.makePath(
      points, 'memory_avg', start, end,
    );

    this.diskPath = this.makePath(
      points, 'disk_avg', start, end,
    );

    this.cpuMarkers = points
      .filter(point =>
        Number.isFinite(point.cpu_max) &&
        Date.parse(point.time) >= start &&
        Date.parse(point.time) <= end
      )
      .map(point => ({
        x: this.xPosition(Date.parse(point.time), start, end),
        y: this.yPosition(point.cpu_max),
        title:
          `${point.cpu_max}% CPU — ` +
          new Date(point.time).toLocaleString('en-GB'),
      }));
  }

  private makePath(
    points: ServerHistoryPoint[],
    metric: ChartMetric,
    start: number,
    end: number,
  ): string {
    const commands: string[] = [];

    let previousTime: number | null = null;

    const maxGap =
      (this.history?.interval_seconds ?? 300) * 2500;

    for (const point of points) {
      const time = Date.parse(point.time);
      const value = point[metric];

      if (
        time < start ||
        time > end ||
        !Number.isFinite(value)
      ) {
        continue;
      }

      const x = this.xPosition(time, start, end);
      const y = this.yPosition(value);

      const connected =
        previousTime !== null &&
        time - previousTime <= maxGap;

      commands.push(
        `${connected ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`,
      );

      previousTime = time;
    }

    return commands.join(' ');
  }

  private xPosition(
    time: number,
    start: number,
    end: number,
  ): number {
    return Math.max(
      0,
      Math.min(900, (time - start) / (end - start) * 900),
    );
  }

  private yPosition(value: number): number {
    const percent = Math.max(0, Math.min(100, value));
    return 200 - percent * 2;
  }
}
