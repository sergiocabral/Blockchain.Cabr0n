import { Application } from "../../Core/Application";
import { WebSocketServer } from "../../Server/WebSocket/Server/WebSocketServer";

import { BusConfiguration } from "./BusConfiguration";

/**
 * Barramento de mensagens para comunicação entre as aplicações.
 */
export class BusApplication extends Application<BusConfiguration> {
  /**
   * Tipo da configuração;
   */
  protected readonly configurationType = BusConfiguration;

  /**
   * Servidor websocket.
   */
  private readonly webSocketServer: WebSocketServer;

  /**
   * Construtor.
   */
  public constructor() {
    super();
    this.webSocketServer = new WebSocketServer(
      this.configuration.webSocketServer
    );
  }

  /**
   * Executa a aplicação.
   */
  public run(): void {
    this.webSocketServer.start();
  }

  /**
   * Finaliza a aplicação.
   */
  public stop(): void {
    this.webSocketServer.stop();
  }
}
