
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import {
  Subscription,
} from 'rxjs';

import {
  VpnDailyUsageData,
  VpnDailyUsagePeriod,
  VpnDailyUsageUser,
} from '../../models/vpn-daily-usage.model';

import {
  VpnDailyUsageService,
} from '../../services/vpn-daily-usage.service';

@Component({
  selector: 'app-vpn-usage-chart',
  standalone: true,
  templateUrl: './vpn-usage-chart.component.html',
  styleUrls: ['./vpn-usage-chart.component.scss'],
})
export class VpnUsageChartComponent
  implements OnInit, OnDestroy {

  private readonly usageService =
    inject(VpnDailyUsageService);

  private usageSubscription:
    Subscription | null = null;

  readonly periods: {
    value: VpnDailyUsagePeriod;
    label: string;
  }[] = [
    {
      value: 'today',
      label: 'Today',
    },
    {
      value: 'yesterday',
      label: 'Yesterday',
    },
    {
      value: 'last7days',
      label: 'Last 7 days',
    },
  ];

  selectedPeriod: VpnDailyUsagePeriod =
    'today';

  usageData: VpnDailyUsageData | null =
    null;

  isLoading = false;

  loadError = '';

  ngOnInit(): void {
    this.loadUsage();
  }

  ngOnDestroy(): void {
    this.usageSubscription?.unsubscribe();
  }

  selectPeriod(
    period: VpnDailyUsagePeriod,
  ): void {
    if (period === this.selectedPeriod) {
      return;
    }

    this.selectedPeriod = period;
    this.loadUsage();
  }

  refresh(): void {
    this.loadUsage();
  }

  loadUsage(): void {
    this.usageSubscription?.unsubscribe();

    this.isLoading = true;
    this.loadError = '';

    this.usageSubscription =
      this.usageService
        .getUsage(this.selectedPeriod)
        .subscribe({
          next: (data) => {
            this.usageData = data;
            this.isLoading = false;
          },

          error: () => {
            this.usageData = null;
            this.isLoading = false;
            this.loadError =
              'Unable to load VPN usage.';
          },
        });
  }

  get users(): VpnDailyUsageUser[] {
    return this.usageData?.users.slice(0, 7)
      ?? [];
  }

  get maxUsageBytes(): number {
    let maximum = 0;

    for (const user of this.users) {
      maximum = Math.max(
        maximum,
        user.downlink_bytes,
        user.uplink_bytes,
      );
    }

    return maximum;
  }

  get totalDownloadBytes(): number {
    return this.users.reduce(
      (total, user) =>
        total + user.downlink_bytes,
      0,
    );
  }

  get totalUploadBytes(): number {
    return this.users.reduce(
      (total, user) =>
        total + user.uplink_bytes,
      0,
    );
  }

  get totalUsageBytes(): number {
    return (
      this.totalDownloadBytes +
      this.totalUploadBytes
    );
  }

  get hasUsage(): boolean {
    return this.users.some(
      (user) => user.total_bytes > 0,
    );
  }

  get periodDescription(): string {
    switch (this.selectedPeriod) {
      case 'yesterday':
        return 'Usage recorded yesterday';

      case 'last7days':
        return 'Total usage over the last 7 days';

      default:
        return 'Usage recorded today';
    }
  }

  barHeight(
    bytes: number,
  ): number {
    const maximum = this.maxUsageBytes;

    if (
      maximum <= 0 ||
      bytes <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      (bytes / maximum) * 100,
    );
  }


  readonly dailyLimitBytes =
    5 * 1024 * 1024 * 1024;

  get isDailyPeriod(): boolean {
    return (
      this.selectedPeriod === 'today' ||
      this.selectedPeriod === 'yesterday'
    );
  }

  dailyUsageLevel(
    user: VpnDailyUsageUser,
  ): 'safe' | 'warning' | 'exceeded' {
    const usage = user.total_bytes;

    if (usage >= this.dailyLimitBytes) {
      return 'exceeded';
    }

    if (usage >= 3 * 1024 * 1024 * 1024) {
      return 'warning';
    }

    return 'safe';
  }

  dailyUsagePercent(
    user: VpnDailyUsageUser,
  ): number {
    if (this.dailyLimitBytes <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        (user.total_bytes / this.dailyLimitBytes) * 100,
      ),
    );
  }


  formatBytes(
    bytes: number,
  ): string {
    if (
      !Number.isFinite(bytes) ||
      bytes <= 0
    ) {
      return '0 B';
    }

    const units = [
      'B',
      'KB',
      'MB',
      'GB',
      'TB',
    ];

    let value = bytes;
    let index = 0;

    while (
      value >= 1024 &&
      index < units.length - 1
      ) {
      value /= 1024;
      index++;
    }

    const digits =
      index === 0 ? 0 : 2;

    return `${value.toFixed(digits)} ${units[index]}`;
  }
}
