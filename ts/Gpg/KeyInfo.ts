import { GpgExtractField } from './GpgExtractField';

/**
 * Informaçõesa sobre uma chave GPG
 */
export class KeyInfo {
  /**
   * Faz um parse da saída do comando `gpg --list-keys`
   * @param output Output bruto do comando gpg
   */
  public static parse(output: string): KeyInfo[] {
    const result: KeyInfo[] = [];

    const regexEmptyLine = /(\r\n|\n\r|\r|\n)\s*\1/;
    const blocks = output.split(regexEmptyLine);
    for (const block of blocks) {
      if (!block.trim()) {
        continue;
      }

      const keyInfo = new KeyInfo();

      keyInfo.issued = GpgExtractField.issued(block);
      keyInfo.thumbprint = GpgExtractField.thumbprint(block);
      keyInfo.mainKeyId = GpgExtractField.mainKeyId(block);
      keyInfo.mainKeyAlgorithm = GpgExtractField.mainKeyAlgorithm(block);
      keyInfo.mainKeyLength = GpgExtractField.mainKeyLength(block);
      keyInfo.mainKeyExpires = GpgExtractField.mainKeyExpires(block);
      keyInfo.subKeyId = GpgExtractField.subKeyId(block);
      keyInfo.subKeyAlgorithm = GpgExtractField.subKeyAlgorithm(block);
      keyInfo.subKeyLength = GpgExtractField.subKeyLength(block);
      keyInfo.subKeyExpires = GpgExtractField.subKeyExpires(block);
      keyInfo.nameReal = GpgExtractField.nameReal(block);
      keyInfo.nameEmail = GpgExtractField.nameEmail(block);

      result.push(keyInfo);
    }

    return result;
  }

  /**
   * Data de emissão.
   */
  public issued?: Date;

  /**
   * Thumbprint da chave.
   */
  public thumbprint?: string;

  /**
   * Id da chave principal
   */
  public mainKeyId?: string;

  /**
   * Algoritmo da chave principal.
   */
  public mainKeyAlgorithm?: string;

  /**
   * Tamanho da chave principal.
   */
  public mainKeyLength?: number;

  /**
   * Data de expiração da chave principal.
   */
  public mainKeyExpires?: Date;

  /**
   * Id da sub chave
   */
  public subKeyId?: string;

  /**
   * Algoritmo da sub chave.
   */
  public subKeyAlgorithm?: string;

  /**
   * Tamanho da sub chave.
   */
  public subKeyLength?: number;

  /**
   * Data de expiração da sub chave.
   */
  public subKeyExpires?: Date;

  /**
   * Nome da pessoa.
   */
  public nameReal?: string;

  /**
   * Email da pessoa.
   */
  public nameEmail?: string;
}
