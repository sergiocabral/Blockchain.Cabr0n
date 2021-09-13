import { Configuration } from "@sergiocabral/helper";

/**
 * Configurações do CoinApplication
 */
export class CoinConfiguration extends Configuration {
  /**
   * Construtor.
   * @param json Dados de configuração.
   */
  public constructor(json?: unknown) {
    super(json);
    this.initialize();
  }
}
