import { Configuration } from "../../Core/Configuration";

/**
 * Configurações do webserver.
 */
export class DatabaseConfiguration extends Configuration<DatabaseConfiguration> {
  /**
   * Construtor.
   * @param json Dados de configuração.
   */
  public constructor(json?: unknown) {
    super(json);
    this.load();
  }

  /**
   * Lista de erros presentes na configuração atual
   */
  public errors(): string[] {
    return [];
  }
}
