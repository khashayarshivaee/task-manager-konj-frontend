
import {
  Component,
  inject,
  OnInit,

} from '@angular/core';

import { DatePipe } from '@angular/common';

import {
  ServerSpeedTestService,
  ServerSpeedTestResult,
} from '../../services/server-speed-test.service';

import {
  Router,
} from '@angular/router';

import {
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

import {
  addIcons,
} from 'ionicons';

import {
  arrowBackOutline,
  serverOutline,
  speedometerOutline,
  refreshOutline,
} from 'ionicons/icons';

import {
  firstValueFrom,
  timeout,
} from 'rxjs';

import {
  ClientSpeedTestService,
  SpeedTestDownloadSize,
} from '../../services/client-speed-test.service';

@Component({
  selector: 'app-server-status',
  standalone: true,

  templateUrl: './server-status.page.html',
  styleUrls: ['./server-status.page.scss'],

  imports: [
    IonContent,
    IonIcon,
    DatePipe,
  ],
})
export class ServerStatusPage implements OnInit  {

  private readonly router = inject(Router);

  private readonly speedTestService = inject(
    ClientSpeedTestService,
  );


  private readonly serverSpeedTestService = inject(
    ServerSpeedTestService,
  );

  isServerTestLoading = false;

  serverTestStatus:
    'pending' | 'completed' | 'error' = 'pending';

  serverTestError = '';

  serverSpeedTestResult:
    ServerSpeedTestResult | null = null;


  isClientTestRunning = false;

  clientTestStatus = 'Not tested';

  clientTestError = '';

  clientDownloadMbps: number | null = null;

  clientUploadMbps: number | null = null;

  clientPingMs: number | null = null;

  clientJitterMs: number | null = null;

  clientLastTestedAt: Date | null = null;

  constructor() {
    addIcons({
      arrowBackOutline,
      serverOutline,
      speedometerOutline,
      refreshOutline,
    });
  }


  ngOnInit(): void {
    void this.loadServerSpeedTest();
  }

  async loadServerSpeedTest(): Promise<void> {
    if (this.isServerTestLoading) {
      return;
    }

    this.isServerTestLoading = true;
    this.serverTestError = '';

    try {
      const response = await firstValueFrom(
        this.serverSpeedTestService
          .getLatest()
          .pipe(timeout(15000)),
      );

      if (
        response.status === 'completed' &&
        response.data !== null
      ) {
        this.serverSpeedTestResult = response.data;
        this.serverTestStatus = 'completed';
      } else {
        this.serverSpeedTestResult = null;
        this.serverTestStatus = 'pending';
      }

    } catch (error) {
      console.error(
        '[Server Speed Test] Load failed:',
        error,
      );

      this.serverTestStatus = 'error';

      this.serverTestError =
        'Unable to load server speed test results.';
    } finally {
      this.isServerTestLoading = false;
    }
  }


  goBack(): void {
    void this.router.navigateByUrl('/home');
  }

  async startClientSpeedTest(): Promise<void> {

    if (this.isClientTestRunning) {
      return;
    }

    this.isClientTestRunning = true;

    this.clientTestStatus = 'Measuring ping';
    this.clientTestError = '';

    this.clientDownloadMbps = null;
    this.clientUploadMbps = null;
    this.clientPingMs = null;
    this.clientJitterMs = null;
    this.clientLastTestedAt = null;

    try {

      // --------------------------------
      // 1. Ping and Jitter
      // --------------------------------

      const pingSamples: number[] = [];

      for (let i = 0; i < 7; i++) {

        const start = performance.now();

        await firstValueFrom(
          this.speedTestService
            .ping()
            .pipe(timeout(15000)),
        );

        const elapsed =
          performance.now() - start;

        // Ignore the first warm-up request.
        if (i > 0) {
          pingSamples.push(elapsed);
        }
      }

      const averagePing =
        pingSamples.reduce(
          (sum, value) => sum + value,
          0,
        ) / pingSamples.length;

      let jitterTotal = 0;

      for (
        let i = 1;
        i < pingSamples.length;
        i++
      ) {
        jitterTotal += Math.abs(
          pingSamples[i] -
          pingSamples[i - 1],
        );
      }

      const averageJitter =
        jitterTotal / (pingSamples.length - 1);

      this.clientPingMs =
        this.roundToOne(averagePing);

      this.clientJitterMs =
        this.roundToOne(averageJitter);


      // --------------------------------
      // 2. Download Warm-up
      // --------------------------------

      this.clientTestStatus = 'Warming up';

      const warmupStart = performance.now();

      const warmupData = await firstValueFrom(
        this.speedTestService
          .download(2)
          .pipe(timeout(45000)),
      );

      const warmupDuration =
        performance.now() - warmupStart;

      const warmupMbps = this.calculateMbps(
        warmupData.byteLength,
        warmupDuration,
      );


      // --------------------------------
      // 3. Adaptive Download Test
      // --------------------------------

      this.clientTestStatus = 'Testing download';

      const downloadSize:
        SpeedTestDownloadSize =
        this.chooseDownloadSize(warmupMbps);

      let totalDownloadBytes = 0;
      let totalDownloadDuration = 0;

      for (let i = 0; i < 2; i++) {

        const start = performance.now();

        const data = await firstValueFrom(
          this.speedTestService
            .download(downloadSize)
            .pipe(timeout(45000)),
        );

        const duration =
          performance.now() - start;

        const expectedBytes =
          downloadSize * 1024 * 1024;

        if (data.byteLength !== expectedBytes) {
          throw new Error(
            'Download payload size mismatch.',
          );
        }

        totalDownloadBytes += data.byteLength;
        totalDownloadDuration += duration;

        this.clientDownloadMbps =
          this.calculateMbps(
            totalDownloadBytes,
            totalDownloadDuration,
          );
      }


      // --------------------------------
      // 4. Upload Test
      // --------------------------------

      this.clientTestStatus = 'Testing upload';

      const uploadBytes = new Uint8Array(
        1024 * 1024,
      );

      // Generate incompressible data.
      // crypto.getRandomValues has a
      // maximum of 65536 bytes per call.

      for (
        let offset = 0;
        offset < uploadBytes.length;
        offset += 65536
      ) {

        const chunk = uploadBytes.subarray(
          offset,
          Math.min(
            offset + 65536,
            uploadBytes.length,
          ),
        );

        crypto.getRandomValues(chunk);
      }

      const uploadPayload = new Blob(
        [uploadBytes],
        {
          type: 'application/octet-stream',
        },
      );

      let totalUploadBytes = 0;
      let totalUploadDuration = 0;

      for (let i = 0; i < 2; i++) {

        const start = performance.now();

        const response = await firstValueFrom(
          this.speedTestService
            .upload(uploadPayload)
            .pipe(timeout(45000)),
        );

        const duration =
          performance.now() - start;

        if (
          response.data.received_bytes !==
          uploadPayload.size
        ) {
          throw new Error(
            'Upload payload size mismatch.',
          );
        }

        totalUploadBytes +=
          response.data.received_bytes;

        totalUploadDuration += duration;

        this.clientUploadMbps =
          this.calculateMbps(
            totalUploadBytes,
            totalUploadDuration,
          );
      }


      // --------------------------------
      // 5. Completed
      // --------------------------------

      this.clientTestStatus = 'Completed';

      this.clientLastTestedAt = new Date();

    } catch (error) {

      console.error(
        '[Client Speed Test] Failed:',
        error,
      );

      this.clientTestStatus = 'Failed';

      this.clientTestError =
        'Unable to complete the speed test. ' +
        'Please check your connection and try again.';

    } finally {

      this.isClientTestRunning = false;

    }
  }


  private chooseDownloadSize(
    estimatedMbps: number,
  ): SpeedTestDownloadSize {

    if (estimatedMbps < 3) {
      return 2;
    }

    if (estimatedMbps < 25) {
      return 4;
    }

    return 8;
  }


  private calculateMbps(
    bytes: number,
    durationMs: number,
  ): number {

    if (durationMs <= 0) {
      return 0;
    }

    const bits = bytes * 8;

    const seconds = durationMs / 1000;

    const mbps =
      bits / seconds / 1_000_000;

    return this.roundToOne(mbps);
  }


  private roundToOne(
    value: number,
  ): number {

    return Math.round(
      value * 10,
    ) / 10;
  }
}
