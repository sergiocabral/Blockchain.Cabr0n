import { LoggerToStreamConfiguration } from '@gohorse/npm-log';
import { JsonLoader } from '@sergiocabral/helper';

/**
 * Configurações do logger.
 */
export class LogToDatabaseConfiguration extends LoggerToStreamConfiguration {
  /**
   * Espera em milissegundos em caso de erro antes da próxima tentativa de envio dos dados.
   */
  public waitInMillisecondsOnError = 10000; // TODO: Ao conectar sempre espera esse tempo, deveria ser apenas em caso de falha

  /**
   * Lista de erros presentes na configuração atual
   */
  public override errors(): string[] {
    const errors = Array<string>();

    const oneSecond = 1000;
    errors.push(
      ...JsonLoader.mustBeNumberGreaterThanOrEqual<LogToDatabaseConfiguration>(
        this,
        'waitInMillisecondsOnError',
        oneSecond
      )
    );

    errors.push(...super.errors());

    return errors;
  }
}
