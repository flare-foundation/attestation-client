import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { AddressValidity_Request, AddressValidity_RequestNoMic, AddressValidity_Response } from "../../dtos/attestation-types/AddressValidity.dto";
import { AttestationResponseDTO } from "../../dtos/generic/generic.dto";
import { verifyAddressBTC } from "../../verification/address-validity/address-validity-btc";

@Injectable()
export class BTCAddressValidityVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<AddressValidity_RequestNoMic, AddressValidity_Request, AddressValidity_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor() {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
        this.exampleData = JSON.parse(readFileSync("src/servers/verifier-server/src/example-data/AddressValidity.json", "utf8"));
    }

    private verifyRequest(request: AddressValidity_RequestNoMic | AddressValidity_Request): AttestationResponse<AddressValidity_Response> {
        if (request.attestationType !== encodeAttestationName("AddressValidity") || request.sourceId !== encodeAttestationName("BTC")) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${request.sourceId}). This source supports attestation type 'AddressValidity' (0x4164647265737356616c69646974790000000000000000000000000000000000) and source id 'BTC' (0x4254430000000000000000000000000000000000000000000000000000000000).`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        let fixedRequest = {
            ...request,
        } as AddressValidity_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        const result = verifyAddressBTC(request.requestBody.addressStr);

        const status = getAttestationStatus(result.status);
        if (status != AttestationResponseStatus.VALID) return { status };

        const response: AddressValidity_Response = serializeBigInts({
            attestationType: request.attestationType,
            sourceId: request.sourceId,
            votingRound: "0",
            lowestUsedTimestamp: "0xffffffffffffffff",
            requestBody: request.requestBody,
            responseBody: result.response,
        });
        return { status, response } as AttestationResponse<AddressValidity_Response>;
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO<AddressValidity_Response>> {
        const requestJSON = this.store.parseRequest<AddressValidity_Request>(abiEncodedRequest);
        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        const response = await this.verifyRequest(requestJSON);

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        return response;
    }

    public async prepareResponse(request: AddressValidity_RequestNoMic): Promise<AttestationResponseDTO<AddressValidity_Response>> {
        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        const response = await this.verifyRequest(request);

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        return response;
    }

    public async mic(request: AddressValidity_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        return this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: AddressValidity_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT)!,
        } as AddressValidity_Request;

        return this.store.encodeRequest(newRequest);
    }
}
