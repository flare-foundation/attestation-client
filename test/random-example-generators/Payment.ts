import {
    Payment_Proof,
    Payment_RequestBody,
    Payment_RequestNoMic,
    Payment_Response,
    Payment_ResponseBody,
} from "../../src/servers/verifier-server/src/dtos/attestation-types/Payment.dto";
import { MIC_SALT, encodeAttestationName } from "../../src/external-libs/utils";
import { randSol } from "../../src/external-libs/random";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";

const ATTESTATION_TYPE_NAME = "Payment";

function randomProof(votingRound: number = 1234, sourceId?: string, fullRandom = false): Payment_Proof {
    const bodies = randomBodies(fullRandom);
    const response = {
        attestationType: encodeAttestationName(ATTESTATION_TYPE_NAME),
        sourceId: encodeAttestationName(sourceId ?? "BTC"),
        votingRound: votingRound.toString(),
        lowestUsedTimestamp: "1234",
        requestBody: bodies.requestBody,
        responseBody: bodies.responseBody,
    } as Payment_Response;

    const proof = {
        merkleProof: [] as string[],
        data: response,
    } as Payment_Proof;
    return proof;
}

function randomBodies(fullRandom = false) {
    const requestBody = {
        transactionId: randSol("bytes32", "Payment" + (fullRandom ? Math.random().toString() : "")),
        inUtxo: randSol("uint256", "Payment" + (fullRandom ? Math.random().toString() : "")),
        utxo: randSol("uint256", "Payment" + (fullRandom ? Math.random().toString() : "")),
    } as Payment_RequestBody;

    const responseBody = {
        blockNumber: randSol("uint64", "Payment" + (fullRandom ? Math.random().toString() : "")),
        blockTimestamp: randSol("uint64", "Payment" + (fullRandom ? Math.random().toString() : "")),
        sourceAddressHash: randSol("bytes32", "Payment" + (fullRandom ? Math.random().toString() : "")),
        receivingAddressHash: randSol("bytes32", "Payment" + (fullRandom ? Math.random().toString() : "")),
        intendedReceivingAddressHash: randSol("bytes32", "Payment" + (fullRandom ? Math.random().toString() : "")),
        spentAmount: randSol("int256", "Payment" + (fullRandom ? Math.random().toString() : "")),
        intendedSpentAmount: randSol("int256", "Payment" + (fullRandom ? Math.random().toString() : "")),
        receivedAmount: randSol("int256", "Payment" + (fullRandom ? Math.random().toString() : "")),
        intendedReceivedAmount: randSol("int256", "Payment" + (fullRandom ? Math.random().toString() : "")),
        standardPaymentReference: randSol("bytes32", "Payment" + (fullRandom ? Math.random().toString() : "")),
        oneToOne: randSol("bool", "Payment" + (fullRandom ? Math.random().toString() : "")),
        status: randSol("uint8", "Payment" + (fullRandom ? Math.random().toString() : "")),
    } as Payment_ResponseBody;
    return { requestBody, responseBody };
}

export function randomExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    const store = new AttestationDefinitionStore("configs/type-definitions");
    const proof = randomProof(votingRound, sourceId, fullRandom);
    const requestNoMic = {
        attestationType: proof.data.attestationType,
        sourceId: proof.data.sourceId,
        requestBody: proof.data.requestBody,
    } as Payment_RequestNoMic;
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

export function randomPaymentExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    return randomExample(votingRound, sourceId, fullRandom);
}
