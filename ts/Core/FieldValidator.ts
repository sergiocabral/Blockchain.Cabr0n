import { BusMessage } from '../BusMessage/BusMessage';

/**
 * Valida o conteúdo de campos nas mensagens do Core.
 */
export class FieldValidator {
  /**
   * Campo: channels
   * @param instance Instância.
   */
  public static channels(instance: unknown): boolean {
    const fieldValue = FieldValidator.getField(instance, 'channels');

    return (
      Array.isArray(fieldValue) &&
      fieldValue.findIndex(channel => typeof channel !== 'string') < 0
    );
  }

  /**
   * Campo: clientId
   * @param instance Instância.
   */
  public static clientId(instance: unknown): boolean {
    const fieldValue = FieldValidator.getField(instance, 'clientId');

    return (
      typeof fieldValue === 'string' &&
      FieldValidator.regexSha1.test(fieldValue)
    );
  }

  /**
   * Campo: id
   * @param instance Instância.
   */
  public static id(instance: unknown): boolean {
    const fieldValue = FieldValidator.getField(instance, 'id');

    return (
      typeof fieldValue === 'string' &&
      FieldValidator.regexSha1.test(fieldValue)
    );
  }

  /**
   * Campo: type
   * @param instance Instância.
   * @param type Tipo
   */
  public static type<T extends BusMessage>(
    instance: unknown,
    type: new (...args: any[]) => T
  ): boolean {
    const fieldValue = FieldValidator.getField(instance, 'type');

    return typeof fieldValue === 'string' && fieldValue === type.name;
  }

  /**
   * Regex para validar um valor de hash SHA1.
   */
  private static readonly regexSha1 = /^[0-9a-f]{40}$/;

  /**
   * Retorna o valor de um atributo na instância, se existir.
   * @param instance Isntâncias.
   * @param field Nome do campo.
   */
  private static getField(
    instance: unknown,
    field: string
  ): undefined | unknown {
    if (typeof instance !== 'object' || instance === null) {
      return undefined;
    }

    const instanceAsRecord = instance as Record<string, unknown>;

    return instanceAsRecord[field];
  }
}
