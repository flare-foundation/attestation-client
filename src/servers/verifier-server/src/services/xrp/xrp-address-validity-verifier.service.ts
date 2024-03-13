import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import {
    AddressValidity_Request,
    AddressValidity_RequestNoMic,
    AddressValidity_Response,
    AttestationResponseDTO_AddressValidity_Response,
} from "../../dtos/attestation-types/AddressValidity.dto";
import { EncodedRequestResponse, MicResponse } from "../../dtos/generic/generic.dto";
import { verifyAddressXRP } from "../../verification/address-validity/address-validity-xrp";

@Injectable()
export class XRPAddressValidityVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<AddressValidity_RequestNoMic, AddressValidity_Request, AddressValidity_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor() {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
        this.exampleData = JSON.parse(readFileSync("src/servers/verifier-server/src/example-data/AddressValidity.json", "utf8"));
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    async verifyRequestInternal(request: AddressValidity_Request | AddressValidity_RequestNoMic): Promise<AttestationResponseDTO_AddressValidity_Response> {
        if (
            request.attestationType !== encodeAttestationName("AddressValidity") ||
            request.sourceId !== encodeAttestationName((process.env.TESTNET == "true" ? "test" : "") + "XRP")
        ) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${
                        request.sourceId
                    }). This source supports attestation type 'AddressValidity' (${encodeAttestationName("AddressValidity")}) and source id '${
                        (process.env.TESTNET == "true" ? "test" : "") + "XRP"
                    }' (${encodeAttestationName((process.env.TESTNET == "true" ? "test" : "") + "XRP")}).`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const fixedRequest = {
            ...request,
        } as AddressValidity_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }

        return this.verifyRequest(fixedRequest);
    }

    async verifyRequest(fixedRequest: AddressValidity_Request): Promise<AttestationResponseDTO_AddressValidity_Response> {
        //-$$$<start-verifyRequest> Start of custom code section. Do not change this comment.

        const result = verifyAddressXRP(fixedRequest.requestBody.addressStr);

        const status = getAttestationStatus(result.status);
        if (status != AttestationResponseStatus.VALID) return { status };

        const response: AddressValidity_Response = serializeBigInts({
            attestationType: fixedRequest.attestationType,
            sourceId: fixedRequest.sourceId,
            votingRound: "0",
            lowestUsedTimestamp: "0xffffffffffffffff",
            requestBody: fixedRequest.requestBody,
            responseBody: result.response,
        });

        return { status, response } as AttestationResponse<AddressValidity_Response>;

        //-$$$<end-verifyRequest> End of custom code section. Do not change this comment.
    }

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO_AddressValidity_Response> {
        const requestJSON = this.store.parseRequest<AddressValidity_Request>(abiEncodedRequest);
        const response = await this.verifyRequestInternal(requestJSON);
        return response;
    }

    public async prepareResponse(request: AddressValidity_RequestNoMic): Promise<AttestationResponseDTO_AddressValidity_Response> {
        const response = await this.verifyRequestInternal(request);
        return response;
    }

    public async mic(request: AddressValidity_RequestNoMic): Promise<MicResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new MicResponse({ status: result.status });
        }
        const response = result.response;
        if (!response) return new MicResponse({ status: result.status });
        return new MicResponse({
            status: AttestationResponseStatus.VALID,
            messageIntegrityCode: this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT),
        });
    }

    public async prepareRequest(request: AddressValidity_RequestNoMic): Promise<EncodedRequestResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new EncodedRequestResponse({ status: result.status });
        }
        const response = result.response;

        if (!response) return new EncodedRequestResponse({ status: result.status });
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT)!,
        } as AddressValidity_Request;

        return new EncodedRequestResponse({
            status: AttestationResponseStatus.VALID,
            abiEncodedRequest: this.store.encodeRequest(newRequest),
        });
    }
}
