
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
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

type ChartMetric =
  | 'cpu_max'
  | 'memory_avg'
  | 'disk_avg';

type ChartFocus = ChartMetric | 'all';

interface ChartMarker {
  x: number;
  y: number;
  metric: ChartMetric;
}

interface ChartHoverPoint {
  x: number;
  y: number;
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}

@Component({
  selector: 'app-server-performance-chart',
  standalone: true,

  imports: [
    DatePipe,
    DecimalPipe,
  ],

  template: `
    <section class="history-card">

      <div class="history-header">
        <div>
          <span class="eyebrow">
            PERFORMANCE ANALYTICS
          </span>

          <h2>Performance History</h2>

          <p>
            Historical server resource usage
          </p>
        </div>

        <div
          class="range-control"
          role="group"
          aria-label="History range"
        >
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

      @if (
        history?.summary?.peak_cpu_percent != null
      ) {
        <div class="peak-summary">

          <div>
            <span>Peak CPU observed</span>
            <strong>
              {{
                history!.summary.peak_cpu_percent
                  | number:'1.0-1'
              }}%
            </strong>
          </div>

          <div>
            <span>Peak recorded at</span>
            <strong class="peak-date">
              {{
                history!.summary.peak_cpu_at
                  | date:'MMM d, HH:mm'
              }}
            </strong>
          </div>

          <div>
            <span>Samples recorded</span>
            <strong>
              {{ history!.sample_count }}
            </strong>
          </div>

        </div>
      }

      @if (loading) {

        <div class="chart-state">
          Loading performance history...
        </div>

      } @else if (error) {

        <div
          class="chart-state error"
          role="alert"
        >
          {{ error }}
        </div>

      } @else if (
        !history ||
        history.data.length === 0
      ) {

        <div class="chart-state">
          No historical measurements available yet.
        </div>

      } @else {

        <!-- Metric Focus -->

        <div class="chart-toolbar">

          <div
            class="metric-control"
            role="group"
            aria-label="Chart metric focus"
          >
            @for (
              option of metricOptions;
              track option.value
            ) {
              <button
                type="button"
                [class.active]="focusMetric === option.value"
                [attr.aria-pressed]="focusMetric === option.value"
                (click)="setFocus(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>

          <!-- Zoom Controls -->

        <div class="zoom-actions">

          <button
            type="button"
            class="zoom-button"
            [class.active]="zoomMode"
            [attr.aria-pressed]="zoomMode"
            (click)="toggleZoomMode()"
          >
            {{
              zoomMode
                ? 'Cancel Selection'
                : 'Select to Zoom'
            }}
          </button>

          <button
            type="button"
            class="fit-button"
            [disabled]="!hasFittableData"
            (click)="fitToData()"
          >
            Fit to Data
          </button>

          @if (isZoomed) {
            <button
              type="button"
              class="reset-button"
              (click)="resetZoom()"
            >
              Reset Zoom
            </button>
          }

        </div>

        </div>

        <!-- Legend -->

        <div class="chart-legend">
          @if (
            focusMetric === 'all' ||
            focusMetric === 'cpu_max'
          ) {
            <span>
              <i class="dot cpu"></i>
              CPU Peak
            </span>
          }

          @if (
            focusMetric === 'all' ||
            focusMetric === 'memory_avg'
          ) {
            <span>
              <i class="dot memory"></i>
              RAM Average
            </span>
          }

          @if (
            focusMetric === 'all' ||
            focusMetric === 'disk_avg'
          ) {
            <span>
              <i class="dot disk"></i>
              Disk Average
            </span>
          }
        </div>

        @if (zoomMode) {
          <div class="zoom-hint">
            Drag across the chart to select a
            time range. Works with mouse or touch.
          </div>
        }

        @if (focusMetric !== 'all') {
          <div class="focus-hint">
            Focused view — the vertical axis
            is automatically scaled.
          </div>
        }

        <!-- Chart -->

        <div class="chart-layout">

          <div class="y-axis">
            @for (
              value of yAxisLabels;
              track $index
            ) {
              <span>
                {{ value | number:'1.0-1' }}%
              </span>
            }
          </div>

          <div class="chart-main">

            <svg
              viewBox="0 0 900 200"
              preserveAspectRatio="none"
              role="img"
              aria-label="Interactive CPU, RAM and Disk performance chart"
              [class.zoom-mode]="zoomMode"
              (pointerdown)="onChartPointerDown($event)"
              (pointermove)="onChartPointerMove($event)"
              (pointerup)="onChartPointerUp($event)"
              (pointercancel)="onChartPointerCancel()"
              (pointerleave)="onChartPointerLeave($event)"
            >

              <!-- Grid -->

              @for (
                y of gridLines;
                track y
              ) {
                <line
                  x1="0"
                  [attr.y1]="y"
                  x2="900"
                  [attr.y2]="y"
                  class="grid-line"
                />
              }

              <!-- Lines -->

              @if (
                focusMetric === 'all' ||
                focusMetric === 'cpu_max'
              ) {
                <path
                  [attr.d]="cpuPath"
                  class="line-cpu"
                />
              }

              @if (
                focusMetric === 'all' ||
                focusMetric === 'memory_avg'
              ) {
                <path
                  [attr.d]="memoryPath"
                  class="line-memory"
                />
              }

              @if (
                focusMetric === 'all' ||
                focusMetric === 'disk_avg'
              ) {
                <path
                  [attr.d]="diskPath"
                  class="line-disk"
                />
              }

              <!-- Small sample markers -->

              @for (
                marker of chartMarkers;
                track $index
              ) {
                <circle
                  [attr.cx]="marker.x"
                  [attr.cy]="marker.y"
                  r="3"
                  [attr.class]="
                    'chart-point ' + marker.metric
                  "
                />
              }

              <!-- Transparent interaction surface -->

              <rect
                x="0"
                y="0"
                width="900"
                height="200"
                fill="transparent"
                class="interaction-layer"
              />

              <!-- Zoom selection -->

              @if (
                zoomMode &&
                selectionStartX !== null &&
                selectionEndX !== null
              ) {
                <rect
                  [attr.x]="selectionLeft"
                  y="0"
                  [attr.width]="selectionWidth"
                  height="200"
                  class="selection-area"
                />

                <line
                  [attr.x1]="selectionLeft"
                  y1="0"
                  [attr.x2]="selectionLeft"
                  y2="200"
                  class="selection-edge"
                />

                <line
                  [attr.x1]="selectionLeft + selectionWidth"
                  y1="0"
                  [attr.x2]="selectionLeft + selectionWidth"
                  y2="200"
                  class="selection-edge"
                />
              }

              <!-- Hover crosshair -->

              @if (hoveredPoint; as point) {
                <line
                  [attr.x1]="point.x"
                  y1="0"
                  [attr.x2]="point.x"
                  y2="200"
                  class="hover-crosshair"
                />

                <circle
                  [attr.cx]="point.x"
                  [attr.cy]="point.y"
                  r="5"
                  class="hover-point"
                />
              }

            </svg>

            <!-- Tooltip -->

            @if (hoveredPoint; as point) {
              <div class="chart-tooltip">

                <div class="tooltip-date">
                  {{
                    point.time
                      | date:'MMM d, HH:mm'
                  }}
                </div>

                <div class="tooltip-row">
                  <i class="dot cpu"></i>
                  <span>CPU Peak</span>
                  <strong>
                    {{ point.cpu | number:'1.0-1' }}%
                  </strong>
                </div>

                <div class="tooltip-row">
                  <i class="dot memory"></i>
                  <span>RAM Average</span>
                  <strong>
                    {{
                      point.memory | number:'1.0-1'
                    }}%
                  </strong>
                </div>

                <div class="tooltip-row">
                  <i class="dot disk"></i>
                  <span>Disk Average</span>
                  <strong>
                    {{ point.disk | number:'1.0-1' }}%
                  </strong>
                </div>

              </div>
            }

            <!-- Time Axis -->

            <div class="x-axis">
              @for (
                label of timeLabels;
                track $index
              ) {
                <span>{{ label }}</span>
              }
            </div>

          </div>
        </div>

        @if (isZoomed) {
          <p class="zoom-status">
            Zoomed time range —
            use Reset Zoom to return
            to the full chart.
          </p>
        }

        <p class="chart-note">
          Values represent recorded samples.
          Short spikes between measurements
          may not be captured.
        </p>

      }

    </section>
  `,

  styles: [`
    :host {
      display: block;
    }

    .history-card {
      padding: 24px;
      background: #ffffff;
      border: 1px solid #e7e9ed;
      border-radius: 18px;
      box-shadow: 0 5px 22px rgba(25,30,42,.025);
      color: #23262b;
      font-family: Inter, -apple-system,
        BlinkMacSystemFont, 'Segoe UI', sans-serif;
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

    .range-control,
    .metric-control {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 4px;
      background: #f5f6f8;
      border-radius: 12px;
    }

    .range-control button,
    .metric-control button {
      padding: 9px 13px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: #747b86;
      font: inherit;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }

    .range-control button.active,
    .metric-control button.active {
      background: #fff;
      color: #e66a13;
      box-shadow: 0 1px 5px rgba(0,0,0,.06);
    }

    button:focus-visible {
      outline: 2px solid #ff842e;
      outline-offset: 2px;
    }

    button:disabled {
      opacity: .6;
      cursor: default;
    }

    .peak-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 12px;
      margin-bottom: 22px;
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

    .peak-summary .peak-date {
      font-size: 14px;
    }

    .chart-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }

    .zoom-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .zoom-button,
    .fit-button,
    .reset-button {
      padding: 10px 13px;
      border-radius: 10px;
      font: inherit;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: background 150ms ease;
    }
    .fit-button {
      background: #fff;
      color: #e66a13;
      border: 1px solid #ffd4b5;
    }

    .fit-button:disabled {
      opacity: .55;
      cursor: default;
    }

    .zoom-button {
      background: #fff;
      color: #666d77;
      border: 1px solid #e4e6eb;
    }

    .zoom-button.active {
      background: #fff1e7;
      color: #e66a13;
      border-color: #ffd4b5;
    }

    .reset-button {
      background: #23262b;
      color: #fff;
      border: 1px solid #23262b;
    }

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
      flex: 0 0 9px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }

    .cpu {
      background: #ff7627;
    }

    .memory {
      background: #648be0;
    }

    .disk {
      background: #a77ada;
    }

    .zoom-hint,
    .focus-hint {
      margin-bottom: 13px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #fff7f0;
      color: #ac641e;
      font-size: 11px;
      line-height: 1.6;
    }

    .focus-hint {
      background: #f5f7fb;
      color: #717b8a;
    }

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
      min-width: 42px;
      color: #a0a5ae;
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .chart-main {
      position: relative;
      flex: 1;
      min-width: 0;
    }

    svg {
      display: block;
      width: 100%;
      height: 200px;
      overflow: hidden;
      touch-action: pan-y;
      cursor: crosshair;
    }

    svg.zoom-mode {
      touch-action: none;
      cursor: col-resize;
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

    .line-cpu {
      stroke: #ff7627;
    }

    .line-memory {
      stroke: #648be0;
    }

    .line-disk {
      stroke: #a77ada;
    }

    .chart-point {
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }

    .chart-point.cpu_max {
      fill: #ff7627;
    }

    .chart-point.memory_avg {
      fill: #648be0;
    }

    .chart-point.disk_avg {
      fill: #a77ada;
    }

    .interaction-layer {
      pointer-events: all;
    }

    .selection-area {
      fill: rgba(255, 118, 39, .12);
      pointer-events: none;
    }

    .selection-edge {
      stroke: #ff7627;
      stroke-width: 2;
      stroke-dasharray: 4 3;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }

    .hover-crosshair {
      stroke: #a0a5ae;
      stroke-width: 1.5;
      stroke-dasharray: 4 5;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }

    .hover-point {
      fill: #ff7627;
      stroke: #fff;
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
      pointer-events: none;
    }

    .chart-tooltip {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 5;
      width: 190px;
      max-width: calc(100% - 16px);
      padding: 13px;
      background: rgba(255,255,255,.97);
      border: 1px solid #e7e9ed;
      border-radius: 13px;
      box-shadow: 0 8px 28px rgba(20,25,35,.10);
      pointer-events: none;
    }

    .tooltip-date {
      margin-bottom: 11px;
      padding-bottom: 9px;
      border-bottom: 1px solid #edf0f3;
      font-size: 11px;
      font-weight: 750;
    }

    .tooltip-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      color: #777e89;
      font-size: 10px;
    }

    .tooltip-row strong {
      margin-left: auto;
      color: #23262b;
      font-size: 12px;
      font-weight: 750;
      font-variant-numeric: tabular-nums;
    }

    .x-axis {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin-top: 11px;
      color: #a0a5ae;
      font-size: 10px;
    }

    .zoom-status {
      margin: 16px 0 0;
      color: #e66a13;
      font-size: 11px;
      font-weight: 650;
    }

    .chart-state {
      display: grid;
      place-items: center;
      min-height: 235px;
      color: #9297a0;
      font-size: 12px;
      text-align: center;
    }

    .chart-state.error {
      color: #c43838;
    }

    .chart-note {
      margin: 17px 0 0;
      color: #a0a5ae;
      font-size: 10px;
      line-height: 1.6;
    }

    @media (max-width: 600px) {
      .history-card {
        padding: 18px 14px;
      }

      h2 {
        font-size: 19px;
      }

      .peak-summary {
        gap: 7px;
      }

      .peak-summary > div {
        padding: 11px;
      }

      .peak-summary span {
        font-size: 9px;
      }

      .peak-summary strong {
        font-size: 16px;
      }

      .peak-summary .peak-date {
        font-size: 11px;
      }

      .chart-toolbar {
        align-items: flex-start;
      }

      .metric-control {
        width: 100%;
        justify-content: space-between;
      }

      .metric-control button {
        flex: 1;
        padding: 9px 7px;
      }

      .x-axis {
        font-size: 9px;
      }

      .chart-tooltip {
        width: 170px;
      }
    }
  `],
})
export class ServerPerformanceChartComponent
  implements OnChanges {

  @Input()
  history: ServerPerformanceHistoryResponse | null = null;

  @Input()
  range: ServerHistoryRange = '24h';

  @Input()
  loading = false;

  @Input()
  error = '';

  @Output()
  rangeChange = new EventEmitter<ServerHistoryRange>();

  readonly ranges: {
    value: ServerHistoryRange;
    label: string;
  }[] = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
  ];

  readonly metricOptions: {
    value: ChartFocus;
    label: string;
  }[] = [
    { value: 'all', label: 'All' },
    { value: 'cpu_max', label: 'CPU' },
    { value: 'memory_avg', label: 'RAM' },
    { value: 'disk_avg', label: 'Disk' },
  ];

  readonly gridLines = [0, 50, 100, 150, 200];

  focusMetric: ChartFocus = 'all';

  visibleDataStartMs: number | null = null;
  visibleDataEndMs: number | null = null;
  get hasFittableData(): boolean {
    return (
      this.visibleDataStartMs !== null &&
      this.visibleDataEndMs !== null &&
      this.visibleDataEndMs > this.visibleDataStartMs
    );
  }

  zoomMode = false;

  zoomStartMs: number | null = null;
  zoomEndMs: number | null = null;

  selectionStartX: number | null = null;
  selectionEndX: number | null = null;

  private dragging = false;

  private fullStartMs = 0;
  private fullEndMs = 0;

  private viewStartMs = 0;
  private viewEndMs = 0;

  private yMin = 0;
  private yMax = 100;

  cpuPath = '';
  memoryPath = '';
  diskPath = '';

  chartMarkers: ChartMarker[] = [];

  timeLabels: string[] = [];
  yAxisLabels: number[] = [100, 75, 50, 25, 0];

  hoveredPoint: ChartHoverPoint | null = null;

  private hoverPoints: ChartHoverPoint[] = [];

  get isZoomed(): boolean {
    return (
      this.zoomStartMs !== null &&
      this.zoomEndMs !== null
    );
  }

  get selectionLeft(): number {
    return Math.min(
      this.selectionStartX ?? 0,
      this.selectionEndX ?? 0,
    );
  }

  get selectionWidth(): number {
    return Math.abs(
      (this.selectionEndX ?? 0) -
      (this.selectionStartX ?? 0),
    );
  }


  ngOnChanges(changes: SimpleChanges): void {
    const dataChanged =
      !!changes['history'] ||
      !!changes['range'];

    if (dataChanged) {
      this.zoomStartMs = null;
      this.zoomEndMs = null;
      this.zoomMode = false;
      this.clearSelection();
    }

    this.buildChart();

    // Auto-Fit only when new history arrives.
    if (
      !dataChanged ||
      !this.history ||
      this.history.range !== this.range ||
      this.history.data.length < 2 ||
      !this.hasFittableData
    ) {
      return;
    }

    const fullDuration =
      this.fullEndMs - this.fullStartMs;

    const dataDuration =
      this.visibleDataEndMs! -
      this.visibleDataStartMs!;

    // Auto-Fit when data occupies less
    // than 35% of the selected time range.
    if (
      dataDuration > 0 &&
      dataDuration < fullDuration * 0.35
    ) {
      this.fitToData();
    }
  }


  changeRange(value: ServerHistoryRange): void {
    if (!this.loading && value !== this.range) {
      this.rangeChange.emit(value);
    }
  }

  setFocus(metric: ChartFocus): void {
    if (metric === this.focusMetric) {
      return;
    }

    this.focusMetric = metric;
    this.hoveredPoint = null;

    this.buildChart();
  }

  toggleZoomMode(): void {
    this.zoomMode = !this.zoomMode;
    this.hoveredPoint = null;
    this.clearSelection();
  }

  resetZoom(): void {
    this.zoomStartMs = null;
    this.zoomEndMs = null;
    this.zoomMode = false;

    this.clearSelection();
    this.buildChart();
  }

  onChartPointerDown(event: PointerEvent): void {
    if (!this.zoomMode) {
      this.onChartPointerMove(event);
      return;
    }

    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    const svg = event.currentTarget as SVGSVGElement;
    const x = this.pointerX(event, svg);

    this.selectionStartX = x;
    this.selectionEndX = x;

    this.dragging = true;
    this.hoveredPoint = null;

    svg.setPointerCapture(event.pointerId);
  }

  onChartPointerMove(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const x = this.pointerX(event, svg);

    if (this.zoomMode) {
      if (this.dragging) {
        this.selectionEndX = x;
      }

      return;
    }

    if (this.hoverPoints.length === 0) {
      return;
    }

    const nearest = this.hoverPoints.reduce(
      (best, point) =>
        Math.abs(point.x - x) <
        Math.abs(best.x - x)
          ? point
          : best,
    );

    const rect = svg.getBoundingClientRect();

    const hitRadius =
      rect.width > 0
        ? Math.max(15, (24 / rect.width) * 900)
        : 15;

    this.hoveredPoint =
      Math.abs(nearest.x - x) <= hitRadius
        ? nearest
        : null;
  }

  onChartPointerUp(event: PointerEvent): void {
    if (!this.zoomMode || !this.dragging) {
      return;
    }

    const svg = event.currentTarget as SVGSVGElement;

    this.selectionEndX = this.pointerX(event, svg);
    this.dragging = false;

    if (svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }

    const left = this.selectionLeft;
    const width = this.selectionWidth;

    // Ignore accidental short taps.
    if (width < 15) {
      this.clearSelection();
      return;
    }

    const duration =
      this.viewEndMs - this.viewStartMs;

    const start =
      this.viewStartMs + (left / 900) * duration;

    const end =
      this.viewStartMs +
      ((left + width) / 900) * duration;

    if (end <= start) {
      this.clearSelection();
      return;
    }

    this.zoomStartMs = start;
    this.zoomEndMs = end;

    this.zoomMode = false;

    this.clearSelection();
    this.buildChart();
  }

  onChartPointerCancel(): void {
    this.clearSelection();
  }

  onChartPointerLeave(event: PointerEvent): void {
    if (this.dragging) {
      return;
    }

    if (event.pointerType !== 'touch') {
      this.hoveredPoint = null;
    }
  }

  private clearSelection(): void {
    this.dragging = false;
    this.selectionStartX = null;
    this.selectionEndX = null;
  }

  private pointerX(
    event: PointerEvent,
    svg: SVGSVGElement,
  ): number {
    const rect = svg.getBoundingClientRect();

    if (rect.width <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        900,
        ((event.clientX - rect.left) / rect.width) * 900,
      ),
    );
  }

  private buildChart(): void {
    this.cpuPath = '';
    this.memoryPath = '';
    this.diskPath = '';

    this.chartMarkers = [];
    this.hoverPoints = [];
    this.hoveredPoint = null;

    const duration = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[this.range];

    this.fullEndMs = Date.now();
    this.fullStartMs = this.fullEndMs - duration;

    this.viewStartMs =
      this.zoomStartMs ?? this.fullStartMs;

    this.viewEndMs =
      this.zoomEndMs ?? this.fullEndMs;

    if (
      !this.history ||
      this.history.range !== this.range
    ) {
      this.yMin = 0;
      this.yMax = 100;

      this.updateAxisLabels();
      return;
    }

    const points = [...this.history.data]
      .filter(point =>
        Number.isFinite(Date.parse(point.time)),
      )
      .sort(
        (a, b) =>
          Date.parse(a.time) - Date.parse(b.time),
      );
    this.visibleDataStartMs = null;
    this.visibleDataEndMs = null;

    const visiblePoints = points.filter(point => {
      const time = Date.parse(point.time);

      return (
        time >= this.viewStartMs &&
        time <= this.viewEndMs
      );
    });
    if (points.length > 0) {
      this.visibleDataStartMs = Date.parse(points[0].time);
      this.visibleDataEndMs = Date.parse(
        points[points.length - 1].time,
      );
    }

    this.updateYAxis(visiblePoints);

    this.cpuPath = this.makePath(
      visiblePoints,
      'cpu_max',
    );

    this.memoryPath = this.makePath(
      visiblePoints,
      'memory_avg',
    );

    this.diskPath = this.makePath(
      visiblePoints,
      'disk_avg',
    );

    const metrics: ChartMetric[] =
      this.focusMetric === 'all'
        ? ['cpu_max', 'memory_avg', 'disk_avg']
        : [this.focusMetric];

    // Show dots when only a few samples exist.

    // Show dots when only a few samples exist.
    if (visiblePoints.length <= 24) {
      const markers: ChartMarker[] = [];

      for (const point of visiblePoints) {
        for (const metric of metrics) {
          const value = point[metric];

          if (!Number.isFinite(value)) {
            continue;
          }

          markers.push({
            x: this.xPosition(
              Date.parse(point.time),
            ),
            y: this.yPosition(value),
            metric,
          });
        }
      }

      this.chartMarkers = markers;
    }


    this.hoverPoints = visiblePoints
      .filter(point =>
        Number.isFinite(point.cpu_max) &&
        Number.isFinite(point.memory_avg) &&
        Number.isFinite(point.disk_avg),
      )
      .map(point => {
        const focusValue =
          this.focusMetric === 'all'
            ? point.cpu_max
            : point[this.focusMetric];

        return {
          x: this.xPosition(
            Date.parse(point.time),
          ),
          y: this.yPosition(focusValue),
          time: point.time,
          cpu: point.cpu_max,
          memory: point.memory_avg,
          disk: point.disk_avg,
        };
      });
  }

  private updateYAxis(
    points: ServerHistoryPoint[],
  ): void {
    if (
      this.focusMetric === 'all' ||
      points.length === 0
    ) {
      this.yMin = 0;
      this.yMax = 100;

      this.updateAxisLabels();
      return;
    }

    const values = points
      .map(point => point[this.focusMetric as ChartMetric])
      .filter(value => Number.isFinite(value));

    if (values.length === 0) {
      this.yMin = 0;
      this.yMax = 100;

      this.updateAxisLabels();
      return;
    }

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);

    const padding = Math.max(
      0.5,
      (maximum - minimum) * 0.2,
    );

    this.yMin = Math.max(
      0,
      Math.floor((minimum - padding) * 10) / 10,
    );

    this.yMax = Math.min(
      100,
      Math.ceil((maximum + padding) * 10) / 10,
    );

    if (this.yMax <= this.yMin) {
      this.yMax = Math.min(
        100,
        this.yMin + 1,
      );
    }

    this.updateAxisLabels();
  }

  private updateAxisLabels(): void {
    const span = this.yMax - this.yMin;

    this.yAxisLabels = Array.from(
      { length: 5 },
      (_, index) =>
        this.yMax - (span * index) / 4,
    );

    const duration =
      this.viewEndMs - this.viewStartMs;

    this.timeLabels = Array.from(
      { length: 5 },
      (_, index) => {
        const date = new Date(
          this.viewStartMs +
          (duration * index) / 4,
        );

        return duration <= 2 * 24 * 60 * 60 * 1000
          ? date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })
          : date.toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric',
          });
      },
    );
  }

  private makePath(
    points: ServerHistoryPoint[],
    metric: ChartMetric,
  ): string {
    const commands: string[] = [];

    let previousTime: number | null = null;

    const maxGap =
      (this.history?.interval_seconds ?? 300) * 2500;

    for (const point of points) {
      const time = Date.parse(point.time);
      const value = point[metric];

      if (!Number.isFinite(value)) {
        previousTime = null;
        continue;
      }

      const x = this.xPosition(time);
      const y = this.yPosition(value);

      const connected =
        previousTime !== null &&
        time - previousTime <= maxGap;

      commands.push(
        `${connected ? 'L' : 'M'}` +
        `${x.toFixed(2)},${y.toFixed(2)}`,
      );

      previousTime = time;
    }

    return commands.join(' ');
  }

  private xPosition(time: number): number {
    const duration =
      this.viewEndMs - this.viewStartMs;

    if (duration <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        900,
        ((time - this.viewStartMs) / duration) * 900,
      ),
    );
  }

  private yPosition(value: number): number {
    const span = this.yMax - this.yMin;

    if (span <= 0) {
      return 100;
    }

    return Math.max(
      0,
      Math.min(
        200,
        ((this.yMax - value) / span) * 200,
      ),
    );
  }

  fitToData(): void {
    if (
      this.visibleDataStartMs === null ||
      this.visibleDataEndMs === null
    ) {
      return;
    }

    const start = this.visibleDataStartMs;
    const end = this.visibleDataEndMs;

    const span = Math.max(
      5 * 60 * 1000,
      end - start,
    );

    const padding = Math.max(
      2 * 60 * 1000,
      span * 0.08,
    );

    this.zoomStartMs = Math.max(
      this.fullStartMs,
      start - padding,
    );

    this.zoomEndMs = Math.min(
      this.fullEndMs,
      end + padding,
    );

    this.zoomMode = false;
    this.clearSelection();
    this.buildChart();
  }
}
