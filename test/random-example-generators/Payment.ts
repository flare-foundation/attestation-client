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

function randomProof(votingRound: number = 1234, sourceId?: string): Payment_Proof {
    const bodies = randomBodies();
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

function randomBodies() {
    const requestBody = {
        transactionId: randSol("bytes32", "Payment"),
        inUtxo: randSol("uint256", "Payment"),
        utxo: randSol("uint16", "Payment"),
    } as Payment_RequestBody;

    const responseBody = {
        blockNumber: randSol("uint64", "Payment"),
        blockTimestamp: randSol("uint64", "Payment"),
        sourceAddressHash: randSol("bytes32", "Payment"),
        receivingAddressHash: randSol("bytes32", "Payment"),
        intendedReceivingAddressHash: randSol("bytes32", "Payment"),
        spentAmount: randSol("int256", "Payment"),
        intendedSpentAmount: randSol("int256", "Payment"),
        receivedAmount: randSol("int256", "Payment"),
        intendedReceivedAmount: randSol("int256", "Payment"),
        standardPaymentReference: randSol("bytes32", "Payment"),
        oneToOne: randSol("bool", "Payment"),
        status: randSol("uint8", "Payment"),
    } as Payment_ResponseBody;
    return { requestBody, responseBody };
}

export function randomExample(votingRound: number = 1234, sourceId?: string) {
    const store = new AttestationDefinitionStore();
    const proof = randomProof(votingRound, sourceId);
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

export function randomPaymentExample(votingRound: number = 1234, sourceId?: string) {
    return randomExample(votingRound, sourceId);
}
