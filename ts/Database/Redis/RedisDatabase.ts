import {
  InvalidArgumentError,
  InvalidExecutionError,
  Logger,
  LogLevel,
  NotReadyError,
  RequestError,
  ShouldNeverHappenError,
} from "@sergiocabral/helper";
import { createClient, RedisClient } from "redis";

import { Database } from "../Database";

import { HashValue } from "./HashValue";
import { RedisConfiguration } from "./RedisConfiguration";

/**
 * Conexão com um banco de dados Redis.
 */
export class RedisDatabase extends Database<RedisConfiguration> {
  /**
   * Evento: quando uma mensagem é recebida via inscrição.
   */
  public readonly onMessage: Set<(channel: string, message: string) => void> =
    new Set<(channel: string, message: string) => void>();

  /**
   * Conexão primária para comandos.
   */
  private primaryConnection?: RedisClient;

  /**
   * Descrição da conexão primária.
   * @private
   */
  private readonly primaryConnectionDescription =
    "primary connection for commands";

  /**
   * Conexão secundária para ouvir inscrições.
   */
  private secondaryConnection?: RedisClient;

  /**
   * Descrição da conexão primária.
   * @private
   */
  private readonly secondaryConnectionDescription =
    "secondary connection for subscriptions";

  /**
   * Sinaliza se a conexão foi iniciada.
   */
  public get opened(): boolean {
    return (
      this.primaryConnection?.connected === true &&
      this.secondaryConnection?.connected === true
    );
  }

  /**
   * Cliente de conexão com o Redis pronto para uso com comandos gerais.
   */
  private get redis(): RedisClient {
    if (this.primaryConnection === undefined) {
      throw new NotReadyError(
        "Redis client ({description}) is not ready.".querystring({
          description: this.primaryConnectionDescription,
        })
      );
    }

    return this.primaryConnection;
  }

  /**
   * Cliente de conexão com o Redis pronto para uso em inscrições.
   */
  private get subscriptions(): RedisClient {
    if (this.secondaryConnection === undefined) {
      throw new NotReadyError(
        "Redis client ({description}) is not ready.".querystring({
          description: this.secondaryConnectionDescription,
        })
      );
    }

    return this.secondaryConnection;
  }

  /**
   * Adiciona um valor numa tabela de dados.
   * @param table Nome da tabela.
   * @param key Chave.
   * @param value Valor.
   */
  public async addValue(
    table: string,
    key: string,
    value: unknown
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const hashValue = HashValue.format(value);
      this.redis.hset(
        this.formatKey(table, key),
        hashValue.id,
        hashValue.content,
        (error) => {
          if (!error) {
            resolve(hashValue.id);
          } else {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Adiciona um valor numa tabela de dados.
   * @param table Nome da tabela.
   * @param key Chave.
   * @param values Valores.
   */
  public async addValues(
    table: string,
    key: string,
    values: unknown[]
  ): Promise<string[]> {
    const ids = Array<string>();
    for (const value of values) {
      ids.push(await this.addValue(table, key, value));
    }

    return ids;
  }

  /**
   * Fechar conexão.
   */
  public async close(): Promise<void> {
    this.primaryConnection = await this.closeConnection(
      this.primaryConnection,
      this.primaryConnectionDescription
    );
    this.secondaryConnection = await this.closeConnection(
      this.secondaryConnection,
      this.secondaryConnectionDescription
    );
  }

  /**
   * Retorna a lista de chaves presentes em uma tabela de dados.
   * @param table Nome da tabela.
   */
  public async getKeys(table: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      const keyPrefix = this.formatKey(table);
      this.redis.keys(`${keyPrefix}*`, (error, keys) => {
        if (!error) {
          keys = keys.map((key) => key.substr(keyPrefix.length + 1));
          resolve(keys);
        } else {
          reject();
        }
      });
    });
  }

  /**
   * Retorna os valores presentes em uma tabela de dados.
   * @param table Nome da tabela.
   * @param keys Chave. Não informado aplica-se a todos.
   */
  public async getValues(table: string, keys?: string[]): Promise<string[]> {
    const values = Array<string>();
    keys = keys ?? (await this.getKeys(table));
    for (const key of keys) {
      values.push(...(await this.getValuesFromKey(table, key)));
    }

    return values;
  }

  /**
   * Retorna o total de valores presentes em uma tabela de dados.
   * @param table Nome da tabela.
   * @param key Chave.
   */
  public async getValuesCount(table: string, key: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.redis.hlen(this.formatKey(table, key), (error, count) => {
        if (!error) {
          resolve(count);
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Retorna os valores presentes em uma tabela de dados.
   * @param table Nome da tabela.
   * @param key Chave.
   */
  public async getValuesFromKey(table: string, key: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.redis.hvals(this.formatKey(table, key), (error, values) => {
        if (!error) {
          values = values.map((value) => HashValue.decode(value));
          resolve(values);
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Retorna informações sobre o servidor.
   * @param section Seções
   */
  public async info(...section: string[]): Promise<Record<string, string>> {
    return new Promise<Record<string, string>>((resolve, reject) => {
      this.redis.info(section, (error, serverInfo) => {
        if (!error) {
          const info = String(serverInfo)
            .split("\n")
            .map((entry) => entry.split(":"))
            .reduce<Record<string, string>>((result, entry) => {
              if (entry.length === 1) {
                result.lastSection = entry[0].replace(/\W/g, "");
                if (result.lastSection.length === 0) {
                  delete result.lastSection;
                }
              } else {
                result[`${result.lastSection}.${entry[0].trim()}`] =
                  entry[1]?.trim() ?? "";
              }

              return result;
            }, {});

          resolve(info);
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Envia uma notificação
   * @param channel Canal.
   * @param message Mensagem.
   */
  public async notify(channel: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.redis.publish(channel, message, (error) => {
        if (!error) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Abrir conexão.
   */
  public async open(): Promise<void> {
    this.primaryConnection = await this.openConnection(
      this.primaryConnection,
      this.primaryConnectionDescription,
      (instance) => (this.primaryConnection = instance)
    );
    this.secondaryConnection = await this.openConnection(
      this.secondaryConnection,
      this.secondaryConnectionDescription,
      (instance) => (this.secondaryConnection = instance)
    );

    this.secondaryConnection.on("message", this.handleMessage.bind(this));
  }

  /**
   * Remove uma chave presente em uma tabela de dados.
   * @param table Nome da tabela.
   * @param key Chave.
   */
  public async removeKey(table: string, key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.redis.del(this.formatKey(table, key), (error) => {
        if (!error) {
          resolve();
        } else {
          reject();
        }
      });
    });
  }

  /**
   * Remove um valor presente em uma tabela de dados.
   * @param table Nome da tabela.
   * @param key Chave.
   * @param value Valor.
   */
  public async removeValue(
    table: string,
    key: string,
    value: unknown
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const hashValue = HashValue.format(value);
      this.redis.hdel(this.formatKey(table, key), hashValue.id, (error) => {
        if (!error) {
          resolve();
        } else {
          reject();
        }
      });
    });
  }

  /**
   * Remove um valor presente em uma tabela de dados.
   * @param table Nome da tabela.
   * @param keys Chave. Não informado aplica-se a todos.
   * @param values Valor. Não informado aplica-se a todos.
   */
  public async removeValues(
    table: string,
    keys?: string[],
    values?: unknown[]
  ): Promise<void> {
    keys = keys ?? (await this.getKeys(table));
    for (const key of keys) {
      if (values === undefined) {
        await this.removeKey(table, key);
      } else {
        for (const value of values) {
          await this.removeValue(table, key, value);
        }
      }
    }
  }

  /**
   * Se inscreve para receber notificações em um canal.
   * @param channel Canal.
   */
  public async subscribe(channel: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.subscriptions.subscribe(channel, (error) => {
        if (!error) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Cancela a inscrição para receber notificações em um canal.
   * @param channel Canal.
   */
  public async unsubscribe(channel: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.subscriptions.unsubscribe(channel, (error) => {
        if (!error) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Finaliza uma conexão com o redis.
   * @param connection Conexão.
   * @param description Descrição da conexão.
   */
  private async closeConnection(
    connection: RedisClient | undefined,
    description: string
  ): Promise<undefined> {
    return new Promise<undefined>((resolve, reject) => {
      if (connection !== undefined) {
        connection.quit((error: Error | null) => {
          if (!error) {
            Logger.post(
              "The connection to Redis ({description}) was successfully terminated.",
              { description },
              LogLevel.Debug,
              RedisDatabase.name
            );
            resolve(undefined);
          } else {
            reject(
              new RequestError(
                `Connection to Redis ({description}) was not terminated successfully: ${error.message}`.querystring(
                  { description }
                )
              )
            );
          }
        });
      } else {
        reject(
          new InvalidExecutionError(
            "Redis client ({description}) is not opened.".querystring({
              description,
            })
          )
        );
      }
    });
  }

  /**
   * Formata a chave para o Redis.
   * @param parts Partes que compõe a chave.¹
   */
  private formatKey(...parts: string[]): string {
    if (parts.length === 0) {
      throw new InvalidArgumentError("Expected part of key");
    }

    if (this.configuration.namespace) {
      parts.unshift(this.configuration.namespace);
    }

    return parts.join(":");
  }

  /**
   * Quando recebe uma mensagem via inscrição.
   * @param channel Canal.
   * @param message Mensagem recebida.
   */
  private handleMessage(channel: string, message: string): void {
    this.onMessage.forEach((onMessage) => onMessage(channel, message));
  }

  /**
   * Abre uma conexão com o Redis.
   * @param connection Conexão.
   * @param description Descrição da conexão.
   * @param setInstance Chamada para definir a instância.
   */
  private async openConnection(
    connection: RedisClient | undefined,
    description: string,
    setInstance: (instance: RedisClient) => void
  ): Promise<RedisClient> {
    return new Promise<RedisClient>((resolve, reject) => {
      let finalized = false;
      const finalize = (result: string | Error) => {
        finalized = true;
        if (typeof result === "string") {
          Logger.post(
            "Success in Redis ({description}) to {server}:{port} server in database index {db}. {result}",
            {
              db: this.configuration.databaseIndex,
              description,
              port: this.configuration.port,
              result,
              server: this.configuration.server,
            },
            LogLevel.Debug,
            RedisDatabase.name
          );

          if (!connection) {
            throw new ShouldNeverHappenError();
          }

          resolve(connection);
        } else {
          reject(new RequestError(result.message));
          connection?.end(false);
        }
      };

      if (connection === undefined) {
        const client = createClient(
          this.configuration.port,
          this.configuration.server,
          {
            db: this.configuration.databaseIndex,
          }
        );
        setInstance((connection = client));

        if (typeof this.configuration.password === "string") {
          client.auth(this.configuration.password);
        }

        client.on("ready", async () => {
          if (finalized) {
            return;
          }

          try {
            finalize(
              `Server Version: {Server.redis_version}, Build Id: {Server.redis_build_id}, Mode: {Server.redis_mode}, Operational System: {Server.os} {Server.arch_bits} bits, TCP port: {Server.tcp_port}.`.querystring(
                await this.info("server")
              )
            );
          } catch (error: unknown) {
            finalize(
              new Error(
                `Redis ({description}) connected but failed fetch server info: ${
                  error instanceof Error ? error.message : String(error)
                }`.querystring({ description })
              )
            );
          }
        });

        client.on("error", (error: Error) => {
          if (finalized) {
            return;
          }

          finalize(
            new Error(
              `Connection to Redis ({description}) failed: ${error?.message}`.querystring(
                { description }
              )
            )
          );
        });
      } else {
        finalize(
          new Error(
            "Redis client ({description}) already opened.".querystring({
              description,
            })
          )
        );
      }
    });
  }
}
