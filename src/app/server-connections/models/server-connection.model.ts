export type ServerConnectionType =
  | 'ssh_vpn'
  | 'ssh_admin'
  | 'ssh_other'
  | 'ssh_preauth'
  | 'outline'
  | 'web'
  | 'other';

export interface ServerConnectionSummary {
  inbound_tcp_connections: number;
  unique_client_ips: number;

  ssh_vpn_sessions: number;
  ssh_admin_sessions: number;
  ssh_other_connections: number;
  ssh_preauth_connections: number;

  outline_tcp_client_ips: number;
  outline_tcp_connections: number;
  outline_udp_associations: number;
  outline_keys: number;
  outline_ports: number;

  web_client_ips: number;
  web_connections: number;

  other_connections: number;
}

export interface VpnSession {
  pid: number;
  ssh_user: string;
  client_ip: string;
  client_port: number;
  elapsed_seconds: number;
  active_connections: number;
}

export interface ServerConnection {
  type: ServerConnectionType;

  protocol: 'tcp';

  service: string;

  client_ip: string;
  client_port: number;

  server_port: number;

  pid: number;

  ssh_user?: string;
  elapsed_seconds?: number;
  proxied_connections?: number;
}

export interface ServerConnectionsData {
  total: number;

  summary: ServerConnectionSummary;

  sessions: VpnSession[];

  connections: ServerConnection[];
}

export interface ServerConnectionsResponse {
  data: ServerConnectionsData;
}
