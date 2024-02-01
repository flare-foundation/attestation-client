import {
    AddressValidity_Proof,
    AddressValidity_RequestBody,
    AddressValidity_RequestNoMic,
    AddressValidity_Response,
    AddressValidity_ResponseBody,
} from "../../src/servers/verifier-server/src/dtos/attestation-types/AddressValidity.dto";
import { MIC_SALT, encodeAttestationName } from "../../src/external-libs/utils";
import { randSol } from "../../src/external-libs/random";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";

const ATTESTATION_TYPE_NAME = "AddressValidity";

function randomProof(votingRound: number = 1234, sourceId?: string, fullRandom = false): AddressValidity_Proof {
    const bodies = randomBodies(fullRandom);
    const response = {
        attestationType: encodeAttestationName(ATTESTATION_TYPE_NAME),
        sourceId: encodeAttestationName(sourceId ?? "BTC"),
        votingRound: votingRound.toString(),
        lowestUsedTimestamp: "1234",
        requestBody: bodies.requestBody,
        responseBody: bodies.responseBody,
    } as AddressValidity_Response;

    const proof = {
        merkleProof: [] as string[],
        data: response,
    } as AddressValidity_Proof;
    return proof;
}

function randomBodies(fullRandom = false) {
    const requestBody = {
        addressStr: randSol("string", "AddressValidity" + (fullRandom ? Math.random().toString() : "")),
    } as AddressValidity_RequestBody;

    const responseBody = {
        isValid: randSol("bool", "AddressValidity" + (fullRandom ? Math.random().toString() : "")),
        standardAddress: randSol("string", "AddressValidity" + (fullRandom ? Math.random().toString() : "")),
        standardAddressHash: randSol("bytes32", "AddressValidity" + (fullRandom ? Math.random().toString() : "")),
    } as AddressValidity_ResponseBody;
    return { requestBody, responseBody };
}

export function randomExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    const store = new AttestationDefinitionStore("configs/type-definitions");
    const proof = randomProof(votingRound, sourceId, fullRandom);
    const requestNoMic = {
        attestationType: proof.data.attestationType,
        sourceId: proof.data.sourceId,
        requestBody: proof.data.requestBody,
    } as AddressValidity_RequestNoMic;
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

export function randomAddressValidityExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    return randomExample(votingRound, sourceId, fullRandom);
}
