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

function randomProof(votingRound: number = 1234, sourceId?: string): ConfirmedBlockHeightExists_Proof {
    const bodies = randomBodies();
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

function randomBodies() {
    const requestBody = {
        blockNumber: randSol("uint64", "ConfirmedBlockHeightExists"),
        queryWindow: randSol("uint64", "ConfirmedBlockHeightExists"),
    } as ConfirmedBlockHeightExists_RequestBody;

    const responseBody = {
        blockTimestamp: randSol("uint64", "ConfirmedBlockHeightExists"),
        numberOfConfirmations: randSol("uint64", "ConfirmedBlockHeightExists"),
        lowestQueryWindowBlockNumber: randSol("uint64", "ConfirmedBlockHeightExists"),
        lowestQueryWindowBlockTimestamp: randSol("uint64", "ConfirmedBlockHeightExists"),
    } as ConfirmedBlockHeightExists_ResponseBody;
    return { requestBody, responseBody };
}

export function randomExample(votingRound: number = 1234, sourceId?: string) {
    const store = new AttestationDefinitionStore();
    const proof = randomProof(votingRound, sourceId);
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

export function randomConfirmedBlockHeightExistsExample(votingRound: number = 1234, sourceId?: string) {
    return randomExample(votingRound, sourceId);
}
