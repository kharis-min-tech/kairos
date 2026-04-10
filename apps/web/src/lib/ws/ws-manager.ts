/**
 * WebSocket connection manager with auto-reconnect and exponential backoff.
 * Connects to the API Gateway WebSocket API with auth token as query param.
 */

export interface WSMessage {
  type: string;
  data: unknown;
}

export type MessageHandler = (message: WSMessage) => void;
export type ConnectionHandler = () => void;

interface WSManagerOptions {
  /** Base WebSocket URL (from NEXT_PUBLIC_WS_URL) */
  url: string;
  /** Function that returns a JWT token for auth */
  getToken: () => Promise<string | null>;
  /** Max reconnect attempts before giving up (default: 10) */
  maxReconnectAttempts?: number;
  /** Initial backoff delay in ms (default: 1000) */
  initialBackoffMs?: number;
  /** Max backoff delay in ms (default: 30000) */
  maxBackoffMs?: number;
}

export class WSManager {
  private ws: WebSocket | null = null;
  private url: string;
  private getToken: () => Promise<string | null>;
  private maxReconnectAttempts: number;
  private initialBackoffMs: number;
  private maxBackoffMs: number;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private connectHandlers = new Set<ConnectionHandler>();
  private disconnectHandlers = new Set<ConnectionHandler>();
  private _isConnected = false;
  private intentionallyClosed = false;

  constructor(options: WSManagerOptions) {
    this.url = options.url;
    this.getToken = options.getToken;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.initialBackoffMs = options.initialBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 30_000;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionallyClosed = false;
    const token = await this.getToken();
    if (!token) return;

    const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this._isConnected = true;
      this.reconnectAttempts = 0;
      this.connectHandlers.forEach((h) => h());
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data as string);
        this.messageHandlers.forEach((h) => h(message));
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._isConnected = false;
      this.disconnectHandlers.forEach((h) => h());
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    };
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(
      this.initialBackoffMs * Math.pow(2, this.reconnectAttempts),
      this.maxBackoffMs,
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
