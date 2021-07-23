import {ChatListener} from "../../../Twitch/ChatListener/ChatListener";
import {ChatMessageModel} from "../../../Twitch/Model/ChatMessageModel";
import {ChatCommandConfiguration} from "./ChatCommandConfiguration";

/**
 * Classe base para comandos da blockchain.
 */
export abstract class BaseChatCommand extends ChatListener {

    /**
     * Construtor.
     * @param configuration Configurações gerais.
     */
    public constructor(protected configuration: ChatCommandConfiguration) {
        super();
    }

    /**
     * Comando para o funcionamento da blockchain.
     * @private
     */
    private possibleCommands: string[] = [ "cabr0n", "cabron" ];

    /**
     * Nome do comando.
     */
    protected abstract subCommands: (string | RegExp) | (string | RegExp)[];

    /**
     * Execução do comando.
     * @param args Argumentos.
     * @param message Mensagem original.
     * @protected
     */
    protected abstract run(args: string[], message: ChatMessageModel): string | string[];

    /**
     * Valida se uma mensagem deve ser capturada.
     */
    public isMatch(message: ChatMessageModel): boolean {
        if (!message.isCommand) return false;

        const args = message.getCommandArguments();

        if (args.length < 1 || !this.possibleCommands.includes(args[0].toLowerCase())) return false;

        const subCommands = Array.isArray(this.subCommands) ? this.subCommands : [this.subCommands];
        const argsOnlyWithSubCommands = args.slice(1);

        if (argsOnlyWithSubCommands.length > subCommands.length) return false;

        const complementaryEmptyArray = new Array(subCommands.length - argsOnlyWithSubCommands.length).fill('');
        argsOnlyWithSubCommands.push(...complementaryEmptyArray);

        for (let i = 0; i < argsOnlyWithSubCommands.length && i < subCommands.length; i++) {
            const expression = subCommands[i];
            const argument = argsOnlyWithSubCommands[i];
            if (expression instanceof RegExp) {
                if (!new RegExp(expression, 'i').test(argument)) return false;
            } else {
                if (expression.toLowerCase() !== argument.toLowerCase()) return false;
            }
        }

        return true;
    }

    /**
     * Responde uma mensagem.
     * @param message
     * @return Texto de resposta.
     */
    public response(message: ChatMessageModel): string[] | string {
        return this.run(message.getCommandArguments(), message);
    };
}
