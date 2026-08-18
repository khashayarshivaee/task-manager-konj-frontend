import {
  Component,
  OnInit,
  inject,
} from '@angular/core';

import {
  DatePipe,
} from '@angular/common';



import {
  Router,
} from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonModal,
  IonSpinner,
} from '@ionic/angular/standalone';

import {
  addIcons,
} from 'ionicons';

import {
  addOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  copyOutline,
  powerOutline,
  refreshOutline,
  serverOutline,
} from 'ionicons/icons';

import {
  finalize,
} from 'rxjs';

import {
  ServerConnection,
  ServerConnectionsData,
} from '../../models/server-connection.model';

import {
  VpnUser,
  VpnUserDestination,
} from '../../models/vpn-user.model';

import {
  ServerConnectionService,
} from '../../services/server-connection.service';

import {
  VpnUserService,
} from '../../services/vpn-user.service';

interface ServerConnectionGroup {
  type: ServerConnection['type'];
  clientIp: string;
  service: string;
  protocol: ServerConnection['protocol'];

  connectionCount: number;

  serverPorts: number[];
  clientPorts: number[];

  sshUser?: string;
  elapsedSeconds?: number;
  proxiedConnections?: number;


}

@Component({
  selector: 'app-server-connections',
  templateUrl: './server-connections.page.html',
  styleUrls: ['./server-connections.page.scss'],
  imports: [
    IonContent,
    DatePipe,
    IonModal,
    IonIcon,
    IonSpinner,
  ],
})
export class ServerConnectionsPage
  implements OnInit {
  private readonly router =
    inject(Router);


  private readonly serverConnectionService =
    inject(ServerConnectionService);

  private readonly vpnUserService =
    inject(VpnUserService);

  data: ServerConnectionsData | null = null;

  connectionGroups:
    ServerConnectionGroup[] = [];

  vpnUsers: VpnUser[] = [];

  isConnectionsLoading = false;
  connectionsLoadError = '';

  isVpnUsersLoading = false;
  vpnUsersLoadError = '';

  isCreatingVpnUser = false;
  createVpnError = '';

  vpnUserName = '';

  processingVpnUserId:
    number | null = null;

  copiedVpnUserId:
    number | null = null;

  lastUpdatedAt: Date | null = null;

  isDestinationsModalOpen = false;

  destinationsModalUser: VpnUser | null = null;
  destinationsByUserId: Record<
    number,
    VpnUserDestination[]
  > = {};

  destinationsLoadingUserId: number | null = null;

  destinationsErrorByUserId: Record<
    number,
    string
  > = {};



  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      copyOutline,
      powerOutline,
      refreshOutline,
      serverOutline,
    });
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadVpnUsers();
    this.loadConnections();
  }

  loadVpnUsers(): void {
    if (this.isVpnUsersLoading) {
      return;
    }

    this.isVpnUsersLoading = true;
    this.vpnUsersLoadError = '';

    this.vpnUserService
      .getUsers()
      .pipe(
        finalize(() => {
          this.isVpnUsersLoading = false;
        }),
      )
      .subscribe({
        next: (vpnUsers) => {
          this.vpnUsers = vpnUsers;
          this.lastUpdatedAt = new Date();
        },

        error: () => {
          this.vpnUsersLoadError =
            'Unable to load VPN users.';
        },
      });
  }

  loadConnections(): void {
    if (this.isConnectionsLoading) {
      return;
    }

    this.isConnectionsLoading = true;
    this.connectionsLoadError = '';

    this.serverConnectionService
      .getActiveConnections()
      .pipe(
        finalize(() => {
          this.isConnectionsLoading = false;
        }),
      )
      .subscribe({
        next: (data) => {
          this.data = data;

          this.connectionGroups =
            this.buildConnectionGroups(
              data.connections,
            );

          this.lastUpdatedAt = new Date();
        },

        error: () => {
          this.connectionsLoadError =
            'Server connection reader is unavailable.';
        },
      });
  }

  createVpnUser(): void {
    const name =
      this.vpnUserName.trim();

    if (
      name === '' ||
      this.isCreatingVpnUser
    ) {
      return;
    }

    this.isCreatingVpnUser = true;
    this.createVpnError = '';

    this.vpnUserService
      .createUser({
        name,
      })
      .pipe(
        finalize(() => {
          this.isCreatingVpnUser = false;
        }),
      )
      .subscribe({
        next: () => {
          this.vpnUserName = '';
          this.loadVpnUsers();
        },

        error: () => {
          this.createVpnError =
            'Unable to create VPN user.';
        },
      });
  }

  revokeVpnUser(
    vpnUser: VpnUser,
  ): void {
    if (
      !vpnUser.is_active ||
      this.processingVpnUserId !== null
    ) {
      return;
    }

    this.processingVpnUserId =
      vpnUser.id;

    this.vpnUserService
      .revokeUser(vpnUser.id)
      .pipe(
        finalize(() => {
          this.processingVpnUserId = null;
        }),
      )
      .subscribe({
        next: (state) => {
          vpnUser.is_active =
            state.is_active;

          vpnUser.revoked_at =
            state.revoked_at;
        },

        error: () => {
          this.vpnUsersLoadError =
            'Unable to disable VPN user.';
        },
      });
  }

  enableVpnUser(
    vpnUser: VpnUser,
  ): void {
    if (
      vpnUser.is_active ||
      this.processingVpnUserId !== null
    ) {
      return;
    }

    this.processingVpnUserId =
      vpnUser.id;

    this.vpnUserService
      .enableUser(vpnUser.id)
      .pipe(
        finalize(() => {
          this.processingVpnUserId = null;
        }),
      )
      .subscribe({
        next: (state) => {
          vpnUser.is_active =
            state.is_active;

          vpnUser.revoked_at =
            state.revoked_at;
        },

        error: () => {
          this.vpnUsersLoadError =
            'Unable to enable VPN user.';
        },
      });
  }

  async copyVpnLink(
    vpnUser: VpnUser,
  ): Promise<void> {
    const url =
      vpnUser.connection?.url;

    if (!url) {
      return;
    }

    try {
      await navigator.clipboard
        .writeText(url);

      this.copiedVpnUserId =
        vpnUser.id;

      window.setTimeout(
        () => {
          if (
            this.copiedVpnUserId ===
            vpnUser.id
          ) {
            this.copiedVpnUserId = null;
          }
        },
        1600,
      );
    } catch {
      this.vpnUsersLoadError =
        'Unable to copy VPN link.';
    }
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
    let unitIndex = 0;

    while (
      value >= 1024 &&
      unitIndex < units.length - 1
      ) {
      value /= 1024;
      unitIndex += 1;
    }

    const fractionDigits =
      value >= 100 ||
      unitIndex === 0
        ? 0
        : 1;

    return `${value.toFixed(
      fractionDigits,
    )} ${units[unitIndex]}`;
  }

  connectionTypeLabel(
    type: ServerConnection['type'],
  ): string {
    switch (type) {
      case 'ssh_vpn':
        return 'SSH VPN';

      case 'ssh_admin':
        return 'SSH Admin';

      case 'ssh_preauth':
        return 'SSH Pre-auth';

      case 'ssh_other':
        return 'SSH Other';

      case 'outline':
        return 'Outline';

      case 'web':
        return 'Web / API';

      default:
        return 'Other';
    }
  }

  formatServerPorts(
    ports: number[],
  ): string {
    return ports.join(', ');
  }

  formatDuration(
    seconds?: number,
  ): string {
    if (
      seconds === undefined ||
      seconds < 0
    ) {
      return '';
    }

    const days =
      Math.floor(seconds / 86400);

    const hours =
      Math.floor(
        (seconds % 86400) / 3600,
      );

    const minutes =
      Math.floor(
        (seconds % 3600) / 60,
      );

    const remainingSeconds =
      seconds % 60;

    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    if (
      hours > 0 ||
      days > 0
    ) {
      parts.push(`${hours}h`);
    }

    if (
      minutes > 0 ||
      hours > 0 ||
      days > 0
    ) {
      parts.push(`${minutes}m`);
    }

    if (days === 0) {
      parts.push(
        `${remainingSeconds}s`,
      );
    }

    return parts.join(' ');
  }

  goBack(): void {
    void this.router.navigateByUrl('/');
  }

  private buildConnectionGroups(
    connections: ServerConnection[],
  ): ServerConnectionGroup[] {
    const groups =
      new Map<
        string,
        ServerConnectionGroup
      >();

    for (
      const connection
      of connections
      ) {
      const key =
        `${connection.type}:${connection.client_ip}`;

      const existing =
        groups.get(key);

      if (existing) {
        existing.connectionCount += 1;

        if (
          !existing.serverPorts.includes(
            connection.server_port,
          )
        ) {
          existing.serverPorts.push(
            connection.server_port,
          );
        }

        existing.clientPorts.push(
          connection.client_port,
        );

        if (
          connection.elapsed_seconds !==
          undefined
        ) {
          existing.elapsedSeconds =
            Math.max(
              existing.elapsedSeconds ?? 0,
              connection.elapsed_seconds,
            );
        }

        if (
          connection.proxied_connections !==
          undefined
        ) {
          existing.proxiedConnections =
            (
              existing.proxiedConnections ?? 0
            ) +
            connection.proxied_connections;
        }

        continue;
      }

      groups.set(
        key,
        {
          type: connection.type,
          clientIp:
          connection.client_ip,
          service:
          connection.service,
          protocol:
          connection.protocol,

          connectionCount: 1,

          serverPorts: [
            connection.server_port,
          ],

          clientPorts: [
            connection.client_port,
          ],

          sshUser:
          connection.ssh_user,

          elapsedSeconds:
          connection.elapsed_seconds,

          proxiedConnections:
          connection.proxied_connections,
        },
      );
    }

    const priority:
      Record<
        ServerConnection['type'],
        number
      > = {
      ssh_vpn: 1,
      outline: 2,
      ssh_admin: 3,
      web: 4,
      ssh_preauth: 5,
      ssh_other: 6,
      other: 7,
    };

    return Array
      .from(groups.values())
      .map((group) => ({
        ...group,

        serverPorts: [
          ...group.serverPorts,
        ].sort(
          (a, b) => a - b,
        ),
      }))
      .sort(
        (a, b) =>
          priority[a.type] -
          priority[b.type]
          ||
          a.clientIp.localeCompare(
            b.clientIp,
          ),
      );
  }

  openDestinations(
    vpnUser: VpnUser,
  ): void {
    this.destinationsModalUser =
      vpnUser;

    this.isDestinationsModalOpen =
      true;

    if (
      this.destinationsByUserId[
        vpnUser.id
        ]
    ) {
      return;
    }

    this.loadDestinations(
      vpnUser.id,
    );
  }

  closeDestinations(): void {
    this.isDestinationsModalOpen =
      false;
  }

  onDestinationsModalDismissed(): void {
    this.isDestinationsModalOpen =
      false;

    this.destinationsModalUser =
      null;
  }
  loadDestinations(
    vpnUserId: number,
  ): void {
    this.destinationsLoadingUserId =
      vpnUserId;

    this.destinationsErrorByUserId[
      vpnUserId
      ] = '';

    this.vpnUserService
      .getDestinations(
        vpnUserId,
      )
      .pipe(
        finalize(() => {
          if (
            this.destinationsLoadingUserId ===
            vpnUserId
          ) {
            this.destinationsLoadingUserId =
              null;
          }
        }),
      )
      .subscribe({
        next: (destinations) => {
          this.destinationsByUserId = {
            ...this.destinationsByUserId,
            [vpnUserId]: destinations,
          };
        },

        error: () => {
          this.destinationsErrorByUserId = {
            ...this.destinationsErrorByUserId,
            [vpnUserId]:
              'Unable to load destinations.',
          };
        },
      });
  }
  refreshDestinations(
    vpnUserId: number,
  ): void {
    delete this.destinationsByUserId[
      vpnUserId
      ];

    this.loadDestinations(
      vpnUserId,
    );
  }
}
