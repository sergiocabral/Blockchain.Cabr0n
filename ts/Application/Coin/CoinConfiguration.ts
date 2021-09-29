import { Configuration } from "@sergiocabral/helper";

import { WebSocketClientConfiguration } from "../../WebSocket/WebSocketClientConfiguration";

/**
 * Configurações do CoinApplication
 */
export class CoinConfiguration extends Configuration {
  /**
   * Configurações para conectar ao servidor websocket.
   */
  public messageBusWebSocketServer = new WebSocketClientConfiguration();
}
