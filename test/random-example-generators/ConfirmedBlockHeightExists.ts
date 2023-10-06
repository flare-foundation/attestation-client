import {
    ConfirmedBlockHeightExists_Proof,
    ConfirmedBlockHeightExists_RequestBody,
    ConfirmedBlockHeightExists_RequestNoMic,
    ConfirmedBlockHeightExists_Response,
    ConfirmedBlockHeightExists_ResponseBody,
} from "../../src/servers/verifier-server/src/dtos/attestation-types/ConfirmedBlockHeightExists.dto";
import { MIC_SALT, encodeAttestationName } from "../../src/external-libs/utils";
import { randSol } from "../../src/external-libs/random";
import { AttestationDefinitionStore } from "../../src/external-libs/AttestationDefinitionStore";

const ATTESTATION_TYPE_NAME = "ConfirmedBlockHeightExists";

function randomProof(votingRound: number = 1234, sourceId?: string, fullRandom = false): ConfirmedBlockHeightExists_Proof {
    const bodies = randomBodies(fullRandom);
    const response = {
        attestationType: encodeAttestationName(ATTESTATION_TYPE_NAME),
        sourceId: encodeAttestationName(sourceId ?? "BTC"),
        votingRound: votingRound.toString(),
        lowestUsedTimestamp: "1234",
        requestBody: bodies.requestBody,
        responseBody: bodies.responseBody,
    } as ConfirmedBlockHeightExists_Response;

    const proof = {
        merkleProof: [] as string[],
        data: response,
    } as ConfirmedBlockHeightExists_Proof;
    return proof;
}

function randomBodies(fullRandom = false) {
    const requestBody = {
        blockNumber: randSol("uint64", "ConfirmedBlockHeightExists" + (fullRandom ? Math.random().toString() : "")),
        queryWindow: randSol("uint64", "ConfirmedBlockHeightExists" + (fullRandom ? Math.random().toString() : "")),
    } as ConfirmedBlockHeightExists_RequestBody;

    const responseBody = {
        blockTimestamp: randSol("uint64", "ConfirmedBlockHeightExists" + (fullRandom ? Math.random().toString() : "")),
        numberOfConfirmations: randSol("uint64", "ConfirmedBlockHeightExists" + (fullRandom ? Math.random().toString() : "")),
        lowestQueryWindowBlockNumber: randSol("uint64", "ConfirmedBlockHeightExists" + (fullRandom ? Math.random().toString() : "")),
        lowestQueryWindowBlockTimestamp: randSol("uint64", "ConfirmedBlockHeightExists" + (fullRandom ? Math.random().toString() : "")),
    } as ConfirmedBlockHeightExists_ResponseBody;
    return { requestBody, responseBody };
}

export function randomExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    const store = new AttestationDefinitionStore("configs/type-definitions");
    const proof = randomProof(votingRound, sourceId, fullRandom);
    const requestNoMic = {
        attestationType: proof.data.attestationType,
        sourceId: proof.data.sourceId,
        requestBody: proof.data.requestBody,
    } as ConfirmedBlockHeightExists_RequestNoMic;
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

export function randomConfirmedBlockHeightExistsExample(votingRound: number = 1234, sourceId?: string, fullRandom = false) {
    return randomExample(votingRound, sourceId, fullRandom);
}
