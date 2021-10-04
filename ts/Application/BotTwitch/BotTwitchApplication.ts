import { HelperObject, Logger } from "@sergiocabral/helper";
import { clearInterval } from "timers";

import { BusClient } from "../../Bus/BusClient";
import { BusMessageText } from "../../Bus/BusMessage/BusMessageText";
import { IBusMessage } from "../../Bus/BusMessage/IBusMessage";
import { Application } from "../../Core/Application";
import { WebSocketClient } from "../../WebSocket/WebSocketClient";

import { BotTwitchConfiguration } from "./BotTwitchConfiguration";

/**
 * Bot que ouve comandos no chat da Twitch.
 */
export class BotTwitchApplication extends Application<BotTwitchConfiguration> {
  /**
   * Tipo da configuração;
   */
  protected readonly configurationType = BotTwitchConfiguration;

  /**
   * Cliente de acesso ao Bus.
   */
  private readonly busClient: BusClient;

  /**
   * Timer.
   */
  private timeout: NodeJS.Timer = 0 as unknown as NodeJS.Timer;

  /**
   * Cliente WebSocket.
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
    this.busClient = new BusClient(this.webSocketClient);
    this.busClient.onMessage.add(this.handleBusClientMessage.bind(this));
    this.busClient.setChannels("user-bot");
  }

  /**
   * Executa a aplicação.
   */
  public run(): void {
    this.webSocketClient.start();

    const interval = 10000;
    this.timeout = setInterval(() => {
      this.busClient.send(
        new BusMessageText("Hello Coin", [
          "CoinApplication",
          "MinerApplication",
          "Nothing",
        ])
      );
      this.busClient.send(new BusMessageText("Hello World"));
    }, interval);
  }

  /**
   * Finaliza a aplicação.
   */
  public stop(): void {
    if (this.webSocketClient.started) {
      this.webSocketClient.stop();
    }
    clearInterval(this.timeout);
  }

  /**
   * Handle: mensagem recebida pelo cliente do Bus
   */
  private handleBusClientMessage(message: IBusMessage): void {
    Logger.post(HelperObject.toText(message));
  }
}
