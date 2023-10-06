import {
    BalanceDecreasingTransaction_Proof,
    BalanceDecreasingTransaction_RequestBody,
    BalanceDecreasingTransaction_RequestNoMic,
    BalanceDecreasingTransaction_Response,
    BalanceDecreasingTransaction_ResponseBody,
} from "../../src/servers/verifier-server/src/dtos/attestation-types/BalanceDecreasingTransaction.dto";
import { MIC_SALT, encodeAttestationName } from "../../src/external-libs/utils";
import { randSol } from "../../src/external-libs/random";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";

const ATTESTATION_TYPE_NAME = "BalanceDecreasingTransaction";

function randomProof(votingRound: number = 1234, sourceId?: string, fullRandom = false): BalanceDecreasingTransaction_Proof {
    const bodies = randomBodies(fullRandom);
    const response = {
        attestationType: encodeAttestationName(ATTESTATION_TYPE_NAME),
        sourceId: encodeAttestationName(sourceId ?? "BTC"),
        votingRound: votingRound.toString(),
        lowestUsedTimestamp: "1234",
        requestBody: bodies.requestBody,
        responseBody: bodies.responseBody,
    } as BalanceDecreasingTransaction_Response;

    const proof = {
        merkleProof: [] as string[],
        data: response,
    } as BalanceDecreasingTransaction_Proof;
    return proof;
}

function randomBodies(fullRandom = false) {
    const requestBody = {
        transactionId: randSol("bytes32", "BalanceDecreasingTransaction" + (fullRandom ? Math.random().toString() : "")),
        sourceAddressIndicator: randSol("bytes32", "BalanceDecreasingTransaction" + (fullRandom ? Math.random().toString() : "")),
    } as BalanceDecreasingTransaction_RequestBody;

    const responseBody = {
        blockNumber: randSol("uint64", "BalanceDecreasingTransaction" + (fullRandom ? Math.random().toString() : "")),
        blockTimestamp: randSol("uint64", "BalanceDecreasingTransaction" + (fullRandom ? Math.random().toString() : "")),
        sourceAddressHash: randSol("bytes32", "BalanceDecreasingTransaction" + (fullRandom ? Math.random().toString() : "")),
        spentAmount: randSol("int256", "BalanceDecreasingTransaction" + (fullRandom ? Math.random().toString() : "")),
        standardPaymentReference: randSol("bytes32", "BalanceDecreasingTransaction" + (fullRandom ? Math.random().toString() : "")),
    } as BalanceDecreasingTransaction_ResponseBody;
    return { requestBody, responseBody };
}

export function randomExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    const store = new AttestationDefinitionStore("configs/type-definitions");
    const proof = randomProof(votingRound, sourceId, fullRandom);
    const requestNoMic = {
        attestationType: proof.data.attestationType,
        sourceId: proof.data.sourceId,
        requestBody: proof.data.requestBody,
    } as BalanceDecreasingTransaction_RequestNoMic;
    const encodedRequestZeroMic = store.encodeRequest(requestNoMic as any);
    const response = proof.data;
    const messageIntegrityCode = store.attestationResponseHash(response, MIC_SALT);
    const request = {
        ...requestNoMic,
        messageIntegrityCode,
    };
    const encodedRequest = store.encodeRequest(request as any);
    return { requestNoMic, response, request, messageIntegrityCode, encodedRequestZeroMic, encodedRequest, proof };
}

export function randomBalanceDecreasingTransactionExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    return randomExample(votingRound, sourceId, fullRandom);
}
