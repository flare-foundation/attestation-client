import {
    ReferencedPaymentNonexistence_Proof,
    ReferencedPaymentNonexistence_RequestBody,
    ReferencedPaymentNonexistence_RequestNoMic,
    ReferencedPaymentNonexistence_Response,
    ReferencedPaymentNonexistence_ResponseBody,
} from "../../src/servers/verifier-server/src/dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import { MIC_SALT, encodeAttestationName } from "../../src/external-libs/utils";
import { randSol } from "../../src/external-libs/random";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";

const ATTESTATION_TYPE_NAME = "ReferencedPaymentNonexistence";

function randomProof(votingRound: number = 1234, sourceId?: string, fullRandom = false): ReferencedPaymentNonexistence_Proof {
    const bodies = randomBodies(fullRandom);
    const response = {
        attestationType: encodeAttestationName(ATTESTATION_TYPE_NAME),
        sourceId: encodeAttestationName(sourceId ?? "BTC"),
        votingRound: votingRound.toString(),
        lowestUsedTimestamp: "1234",
        requestBody: bodies.requestBody,
        responseBody: bodies.responseBody,
    } as ReferencedPaymentNonexistence_Response;

    const proof = {
        merkleProof: [] as string[],
        data: response,
    } as ReferencedPaymentNonexistence_Proof;
    return proof;
}

function randomBodies(fullRandom = false) {
    const requestBody = {
        minimalBlockNumber: randSol("uint64", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
        deadlineBlockNumber: randSol("uint64", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
        deadlineTimestamp: randSol("uint64", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
        destinationAddressHash: randSol("bytes32", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
        amount: randSol("uint256", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
        standardPaymentReference: randSol("bytes32", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
    } as ReferencedPaymentNonexistence_RequestBody;

    const responseBody = {
        minimalBlockTimestamp: randSol("uint64", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
        firstOverflowBlockNumber: randSol("uint64", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
        firstOverflowBlockTimestamp: randSol("uint64", "ReferencedPaymentNonexistence" + (fullRandom ? Math.random().toString() : "")),
    } as ReferencedPaymentNonexistence_ResponseBody;
    return { requestBody, responseBody };
}

export function randomExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    const store = new AttestationDefinitionStore("configs/type-definitions");
    const proof = randomProof(votingRound, sourceId, fullRandom);
    const requestNoMic = {
        attestationType: proof.data.attestationType,
        sourceId: proof.data.sourceId,
        requestBody: proof.data.requestBody,
    } as ReferencedPaymentNonexistence_RequestNoMic;
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

export function randomReferencedPaymentNonexistenceExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    return randomExample(votingRound, sourceId, fullRandom);
}
