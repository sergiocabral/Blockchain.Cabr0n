import {ChatCommand} from "./ChatCommand";

/**
 * Comando Hello Word.
 */
export class HelloWorldChatCommand extends ChatCommand {
    /**
     * Comando a ser tratado.
     */
    public get command(): string {
        return 'hello';
    };

    /**
     * Execução do comando.
     * @param args Argumentos recebidos.
     * @return Texto a ser enviado para o chat.
     */
    public run(args: string[]): string {
        return 'world';
    }
}
