import { ApplicationWrapper } from '../Wrapper/ApplicationWrapper';
import { InvalidExecutionError } from '@sergiocabral/helper';

/**
 * ProcessExecution para executar o Git.
 */
export class GitWrapper extends ApplicationWrapper {
  /**
   * Caminho da aplicação.
   */
  public override readonly path = 'git';

  /**
   * Obter versão do Git.
   */
  public async getVersion(): Promise<string> {
    const output = await super.run('--version');

    if (output.exitCode !== 0) {
      throw new InvalidExecutionError(
        'Git exit code expected as zero but: ' + String(output.exitCode)
      );
    }

    const regexExtractVersion = /\d[\w.-]+\w/;
    const version = output.all.match(regexExtractVersion);
    if (version?.length !== 1) {
      throw new InvalidExecutionError(
        'Git output was different than expected and unable to extract version value: ' +
          output.all
      );
    }

    return version[0];
  }

  /**
   * Determina se é um repositório válido.
   */
  public async isValidRepository(): Promise<boolean> {
    const output = await super.run('status');
    return (
      output.exitCode === 0 &&
      output.errorLines.length === 0 &&
      !output.all.startsWith('fatal:')
    );
  }
}
