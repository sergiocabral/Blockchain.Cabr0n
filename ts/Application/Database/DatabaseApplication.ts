import { Logger, Message } from "@sergiocabral/helper";

import { BusClient } from "../../Bus/BusClient";
import { BusMessageText } from "../../Bus/BusMessage/Communication/BusMessageText";
import { Application } from "../../Core/Application";
import { WebSocketClient } from "../../WebSocket/WebSocketClient";

import { DatabaseConfiguration } from "./DatabaseConfiguration";

/**
 * Manipulador do banco de dados.
 */
export class DatabaseApplication extends Application<DatabaseConfiguration> {
  /**
   * Evento quando a aplicação for finalizada.
   */
  public readonly onStop: Set<() => void> = new Set<() => void>();

  /**
   * Tipo da configuração;
   */
  protected readonly configurationType = DatabaseConfiguration;

  /**
   * Enviador de mensagem via websocket.
   */
  private readonly busClient: BusClient;

  /**
   * Cliente websocket.
   */
  private readonly webSocketClient: WebSocketClient;

  /**
   * Construtor.
   */
  public constructor() {
    super();
    this.webSocketClient = new WebSocketClient(
      this.configuration.messageBusWebSocketServer
    );
    this.webSocketClient.onClose.add(this.stop.bind(this));
    this.busClient = new BusClient(this.webSocketClient, this.constructor.name);
    Message.subscribe(BusMessageText, (message) => Logger.post(message.text));
  }

  /**
   * Executa a aplicação.
   */
  public async run(): Promise<void> {
    await this.webSocketClient.open();
  }

  /**
   * Finaliza a aplicação.
   */
  public async stop(): Promise<void> {
    if (this.webSocketClient.opened) {
      await this.webSocketClient.close();
    }

    this.onStop.forEach((onStop) => onStop());
  }
}
