import { ChainType, MCC, MccClient } from "@flarenetwork/mcc";
import { AttesterCredentials } from "../../../attester/AttesterClientConfiguration";
import { ChainConfiguration, ChainsConfiguration } from "../../../chain/ChainConfiguration";
import { IndexedQueryManagerOptions } from "../../../indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../../indexed-query-manager/IndexedQueryManager";
import { createTestAttestationFromRequest } from "../../../indexed-query-manager/random-attestation-requests/random-ar";
import { readConfig, readCredentials } from "../../../utils/config";
import { DatabaseService } from "../../../utils/databaseService";
import { getGlobalLogger } from "../../../utils/logger";
import { getUnixEpochTimestamp, getWeb3, getWeb3Contract } from "../../../utils/utils";
import { VerificationStatus } from "../../../verification/attestation-types/attestation-types";
import { parseRequest } from "../../../verification/generated/attestation-request-parse";
import { AttestationType } from "../../../verification/generated/attestation-types-enum";
import { SourceId } from "../../../verification/sources/sources";
import { verifyAttestation } from "../../../verification/verifiers/verifier_routing";
import { Factory } from "../classFactory";
import { IVerificationProvider, VerificationResult, VerificationType } from "../verificationProvider";

/**
 * NodeIndexer Verification Provider
 * Supports: 
 *    AttestationType.Payment
 *    AttestationType.BalanceDecreasingTransaction
 *    AttestationType.ConfirmedBlockHeightExists
 *    AttestationType.ReferencedPaymentNonexistence
 *    AttestationType.TrustlineIssuance
 */
@Factory("VerificationProvider")
export class NodeIndexerVP extends IVerificationProvider<NodeIndexerVP> {

    private logger = getGlobalLogger();

    private sourceId = SourceId.BTC;
    private chainName: string;

    private indexedQueryManager: IndexedQueryManager;
    private chainIndexerConfig: ChainConfiguration;

    private currentBufferNumber = 0;
    private client: MccClient;

    instanciate(): NodeIndexerVP {
        return new NodeIndexerVP();
    }


    /**
     * Initialize VP
     * @returns 
     */
    public async initialize(): Promise<boolean> {
        // todo: get sourceId from settings
        this.chainName = SourceId[this.sourceId];

        // todo: put all this strings into config
        const url = "https://coston-api.flare.network/ext/bc/C/rpc?auth=42f0db1b-58e3-4f76-a5b9-59740f4e88df";
        const web3 = getWeb3(url, this.logger);

        const stateConnector = await getWeb3Contract(web3, "0x947c76694491d3fD67a73688003c4d36C8780A97", "StateConnector");
        const BUFFER_TIMESTAMP_OFFSET = parseInt(await stateConnector.methods.BUFFER_TIMESTAMP_OFFSET().call(), 10);
        const BUFFER_WINDOW = parseInt(await stateConnector.methods.BUFFER_WINDOW().call(), 10);
        const TOTAL_STORED_PROOFS = parseInt(await stateConnector.methods.TOTAL_STORED_PROOFS().call(), 10);

        const now = getUnixEpochTimestamp();
        this.currentBufferNumber = Math.floor((now - BUFFER_TIMESTAMP_OFFSET) / BUFFER_WINDOW);
        console.log(`Current buffer number ${this.currentBufferNumber}, mod: ${this.currentBufferNumber % TOTAL_STORED_PROOFS}`);
        const configIndexer = readConfig(new ChainsConfiguration(), "chains");
        this.chainIndexerConfig = configIndexer.chains.find((item) => item.name === this.chainName);
        const attesterCredentials = readCredentials(new AttesterCredentials(), "attester");

        this.client = MCC.Client(this.sourceId, {
            ...this.chainIndexerConfig.mccCreate,
            rateLimitOptions: this.chainIndexerConfig.rateLimitOptions,
        });

        const options: IndexedQueryManagerOptions = {
            chainType: this.sourceId as number as ChainType,
            numberOfConfirmations: () => {
                return this.chainIndexerConfig.numberOfConfirmations;
            },
            maxValidIndexerDelaySec: 10,
            dbService: new DatabaseService(getGlobalLogger(), attesterCredentials.indexerDatabase, "indexer", `NodeIndexer_${this.sourceId}`),
            windowStartTime: (roundId: number) => {
                const queryWindowInSec = 86400;
                return BUFFER_TIMESTAMP_OFFSET + roundId * BUFFER_WINDOW - queryWindowInSec;
            },
        } as IndexedQueryManagerOptions;

        this.indexedQueryManager = new IndexedQueryManager(options);
        await this.indexedQueryManager.dbService.waitForDBConnection();

        return true;
    }

    /**
     * Return VP name
     * @returns 
     */
    public getName(): string {
        return "Node Indexer VP";
    }

    /**
     * Return supported verification types
     * @returns 
     */
    public getSupportedVerificationTypes(): (VerificationType)[] {
        return [
            new VerificationType(AttestationType.Payment, this.sourceId),
            new VerificationType(AttestationType.BalanceDecreasingTransaction, this.sourceId),
            new VerificationType(AttestationType.ConfirmedBlockHeightExists, this.sourceId),
            new VerificationType(AttestationType.ReferencedPaymentNonexistence, this.sourceId),
            new VerificationType(AttestationType.TrustlineIssuance, this.sourceId),
        ];
    }

    /**
     * Verify request
     * @param verificationId 
     * @param type 
     * @param roundId 
     * @param request 
     * @param recheck 
     * @returns 
     */
    public async verifyRequest(verificationId: number, type: VerificationType, roundId: number, request: string, recheck: boolean): Promise<VerificationResult> {
        let parsed = parseRequest(request);

        let att = createTestAttestationFromRequest(parsed, roundId, this.chainIndexerConfig.numberOfConfirmations);
        let result = await verifyAttestation(this.client, att, this.indexedQueryManager, recheck);

        let lastConfirmedBlock = await this.indexedQueryManager.getLastConfirmedBlockNumber();
        this.logger.debug2(`ver[${verificationId}] status ${VerificationStatus[result.status]} block number: ${result.response?.blockNumber?.toString()} last confirmed block: ${lastConfirmedBlock}`);

        return new VerificationResult(result.status, JSON.stringify( result ) );
    }

}