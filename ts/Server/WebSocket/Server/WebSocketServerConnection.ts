import { IncomingMessage } from "http";
import { WebSocket } from "ws";

import { WebSocketServer } from "./WebSocketServer";

/**
 * Conexão com o servidor websocket.
 */
export class WebSocketServerConnection {
  /**
   * Construtor.
   * @param server Servidor websocket.
   * @param webSocket Conexão.
   * @param incomingMessage Mensagem de entrada.
   */
  public constructor(
    public readonly server: WebSocketServer,
    private readonly webSocket: WebSocket,
    private readonly incomingMessage: IncomingMessage
  ) {}

  /**
   * Finaliza a conexão.
   */
  public close() {
    this.webSocket.close();
  }

  /**
   * Envia uma mensagem.
   * @param message Texto.
   */
  public send(message: string): void {
    this.webSocket.send(message);
  }
}
