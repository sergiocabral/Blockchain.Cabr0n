import {Git} from "../../Process/Git";
import {CoinModel} from "./Model/CoinModel";
import {InvalidArgumentError} from "../../Errors/InvalidArgumentError";
import {IO} from "../../Helper/IO";
import path from "path";
import fs from "fs";
import {InvalidExecutionError} from "../../Errors/InvalidExecutionError";
import {Logger} from "../../Log/Logger";
import {LogLevel} from "../../Log/LogLevel";
import {LogContext} from "../../Log/LogContext";
import {Message} from "../../Bus/Message";
import {PutHumanProblemIntoBlockchainAction} from "./MessageAction/PutHumanProblemIntoBlockchainAction";
import {GetHumanProblemFromBlockchainAction} from "./MessageAction/GetHumanProblemFromBlockchainAction";
import {HumanProblem} from "./Model/HumanProblem";
import {PutPendingTransactionIntoBlockchainAction} from "./MessageAction/PutPendingTransactionIntoBlockchainAction";
import {BlockchainBranch} from "./Model/BlockchainBranch";

/**
 * Operações da blockchain.
 */
export class Blockchain {
    /**
     * Construtor.
     * @param coin Moeda.
     */
    public constructor(private coin: CoinModel) {
        if (!IO.createDirectory(coin.directory))
            throw new InvalidArgumentError('Blockchain initial directory canot be created.');

        Logger.post('Initializing Blockchain for coin "{0}" at: {1}', [coin.id, coin.directory], LogLevel.Information, LogContext.Blockchain);
        this.branchHumanMiner.git = this.initializeBranch(this.branchHumanMiner);
        this.branchPendingTransaction.git = this.initializeBranch(this.branchPendingTransaction);

        Message.capture(PutHumanProblemIntoBlockchainAction, this, this.handlerPutHumanProblemIntoBlockchainAction);
        Message.capture(GetHumanProblemFromBlockchainAction, this, this.handlerGetHumanProblemFromBlockchainAction);
        Message.capture(PutPendingTransactionIntoBlockchainAction, this, this.handlerPutPendingTransactionIntoBlockchainAction);
    }

    /**
     * Branch para o mineração humana.
     * @private
     */
    private readonly branchHumanMiner: BlockchainBranch = new BlockchainBranch(this.coin, 'human-miner');

    /**
     * Branch para o transações penentes.
     * @private
     */
    private readonly branchPendingTransaction: BlockchainBranch = new BlockchainBranch(this.coin, 'pending-transaction');

    /**
     * Sinaliza execução em andamento.
     * @private
     */
    private static workingInProgressState: boolean = false;

    /**
     * Sinaliza execução em andamento.
     * @param inProgress Sim ou não para execução em andamento.
     * @private
     */
    private static workingInProgress(inProgress: boolean = true): void {
        if (inProgress && Blockchain.workingInProgressState) {
            throw new InvalidExecutionError('Blockchain: Working in progress');
        }
        Blockchain.workingInProgressState = inProgress;
    }

    /**
     * Inicializa um branch da blockchain.
     * @param branch
     */
    public initializeBranch(branch: BlockchainBranch): Git {
        const repositoryDirectory = path.resolve(this.coin.directory, branch.branchName);
        const repositoryExists = fs.existsSync(repositoryDirectory);
        const git = new Git(
            repositoryExists
                ? repositoryDirectory
                : this.coin.directory);

        const throwError = (message: string) => {
            Logger.post(message, git.lastOutput, LogLevel.Error, LogContext.Blockchain);
            throw new InvalidExecutionError(message.querystring(git.lastOutput));
        }

        if (!repositoryExists) {
            if (!git.clone(this.coin.repository, branch.branchName, BlockchainBranch.emptyBranchName)) {
                throwError('Error when clone repository: {0}');
            }
        } else {
            if (!git.reset() || !git.clean()) {
                throwError('Error when reset and clean repository: {0}');
            }
        }

        if (!git.branchExists(branch.branchName)) {
            if (!git.checkout(branch.branchName)) {
                throwError('Error on checkout branch: {0}');
            }
            if (!git.push()) {
                throwError('Error on update remote repository: {0}');
            }
        } else if (!git.checkout(branch.branchName, 'FETCH_HEAD')) {
            throwError('Error on checkout branch: {0}');
        }

        if (!git.emptyDirectory([branch.mainFileName]) || !git.push()) {
            throwError('Error on clean repository directory: {0}');
        }

        if (!git.pull()) {
            throwError('Error on update local repository: {0}');
        }

        return git;
    }

    /**
     * Processador de mensagem.
     * @param message PutHumanProblemIntoBlockchainAction
     * @private
     */
    private handlerPutHumanProblemIntoBlockchainAction(message: PutHumanProblemIntoBlockchainAction): void {
        Blockchain.workingInProgress();

        const content = message.problem.asText();
        const filePath = path.resolve(this.branchHumanMiner.git.directory, this.branchHumanMiner.mainFileName);

        const download =
            this.branchHumanMiner.git.reset() &&
            this.branchHumanMiner.git.clean() &&
            this.branchHumanMiner.git.pull();

        if (!download) throw new InvalidExecutionError('Fail when download data from blockchain.');

        fs.writeFileSync(filePath, Buffer.from(content));

        const hash =
            this.branchHumanMiner.git.add(this.branchHumanMiner.mainFileName) &&
            this.branchHumanMiner.git.commit('Human problem created by miner: {0}'.querystring(this.coin.instanceName)) &&
            this.branchHumanMiner.git.push() &&
            this.branchHumanMiner.git.currentCommit();

        if (!hash) throw new InvalidExecutionError('Fail when commit human problem.');

        message.hash = hash;
        message.url = `${this.coin.repositoryUrl}/commit/${hash}`;

        Blockchain.workingInProgress(false);
    }

    /**
     * Processador de mensagem.
     * @param message GetHumanProblemFromBlockchainAction
     * @private
     */
    private handlerGetHumanProblemFromBlockchainAction(message: GetHumanProblemFromBlockchainAction): void {
        Blockchain.workingInProgress();

        const hash =
            this.branchHumanMiner.git.reset() &&
            this.branchHumanMiner.git.pull() &&
            this.branchHumanMiner.git.currentCommit();

        if (!hash) throw new InvalidExecutionError('Cannot clean the repository.');

        const filePath = path.resolve(this.branchHumanMiner.git.directory, this.branchHumanMiner.mainFileName);
        if (!fs.existsSync(filePath)) {
            message.problem = null;
            return;
        }

        const content = fs.readFileSync(filePath).toString();
        message.problem = HumanProblem.factory(content);
        message.hash = hash;
        message.url = `${this.coin.repositoryUrl}/commit/${hash}`;

        Blockchain.workingInProgress(false);
    }

    /**
     * Processamento de mensagem
     * @param message PutPendingTransactionIntoBlockchainAction
     * @private
     */
    private handlerPutPendingTransactionIntoBlockchainAction(message: PutPendingTransactionIntoBlockchainAction): void {
        Blockchain.workingInProgress();

        const filePath = path.resolve(this.branchPendingTransaction.git.directory, this.branchPendingTransaction.mainFileName);

        const isNewPendingTransaction = !fs.existsSync(filePath);
        let content = !isNewPendingTransaction
            ? fs.readFileSync(filePath).toString()
            : '';
        content += message.pendingTransaction.asText();

        const download =
            this.branchPendingTransaction.git.reset() &&
            this.branchPendingTransaction.git.clean() &&
            this.branchPendingTransaction.git.pull();

        if (!download) throw new InvalidExecutionError('Fail when download data from blockchain.');

        fs.writeFileSync(filePath, Buffer.from(content));

        const hash =
            this.branchPendingTransaction.git.add(this.branchPendingTransaction.mainFileName) &&
            this.branchPendingTransaction.git.commit('Pending transaction {1} by miner: {0}'.querystring([this.coin.instanceName, isNewPendingTransaction ? 'entered' : 'updated'])) &&
            this.branchPendingTransaction.git.push() &&
            this.branchPendingTransaction.git.currentCommit();

        if (!hash) throw new InvalidExecutionError('Fail when commit pending transaction.');

        message.hash = hash;
        message.url = `${this.coin.repositoryUrl}/commit/${hash}`;

        Blockchain.workingInProgress(false);
    }
}
