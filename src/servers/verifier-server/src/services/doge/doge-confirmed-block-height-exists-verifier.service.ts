import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import {
    AttestationResponseDTO_ConfirmedBlockHeightExists_Response,
    ConfirmedBlockHeightExists_Request,
    ConfirmedBlockHeightExists_RequestNoMic,
    ConfirmedBlockHeightExists_Response,
} from "../../dtos/attestation-types/ConfirmedBlockHeightExists.dto";
import { EncodedRequestResponse, MicResponse } from "../../dtos/generic/generic.dto";
import { verifyConfirmedBlockHeightExists } from "../../verification/generic-chain-verifications";
import { DOGEProcessorService } from "../verifier-processors/doge-processor.service";

@Injectable()
export class DOGEConfirmedBlockHeightExistsVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<ConfirmedBlockHeightExists_RequestNoMic, ConfirmedBlockHeightExists_Request, ConfirmedBlockHeightExists_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: DOGEProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    async verifyRequestInternal(
        request: ConfirmedBlockHeightExists_Request | ConfirmedBlockHeightExists_RequestNoMic,
    ): Promise<AttestationResponseDTO_ConfirmedBlockHeightExists_Response> {
        if (
            request.attestationType !== encodeAttestationName("ConfirmedBlockHeightExists") ||
            request.sourceId !== encodeAttestationName((process.env.TESTNET ? "test" : "") + "DOGE")
        ) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${
                        request.sourceId
                    }). This source supports attestation type 'ConfirmedBlockHeightExists' (${encodeAttestationName(
                        "ConfirmedBlockHeightExists",
                    )}) and source id 'DOGE' (${encodeAttestationName((process.env.TESTNET ? "test" : "") + "DOGE")}).`,
                },
                HttpStatus.BAD_REQUEST,
            );
        }

        const fixedRequest = {
            ...request,
        } as ConfirmedBlockHeightExists_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }

        return this.verifyRequest(fixedRequest);
    }

    async verifyRequest(fixedRequest: ConfirmedBlockHeightExists_Request): Promise<AttestationResponseDTO_ConfirmedBlockHeightExists_Response> {
        //-$$$<start-verifyRequest> Start of custom code section. Do not change this comment.

        const result = await verifyConfirmedBlockHeightExists(fixedRequest, this.processor.indexedQueryManager);
        return serializeBigInts({
            status: getAttestationStatus(result.status),
            response: result.response,
        }) as AttestationResponse<ConfirmedBlockHeightExists_Response>;

        //-$$$<end-verifyRequest> End of custom code section. Do not change this comment.
    }

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO_ConfirmedBlockHeightExists_Response> {
        const requestJSON = this.store.parseRequest<ConfirmedBlockHeightExists_Request>(abiEncodedRequest);
        const response = await this.verifyRequestInternal(requestJSON);
        return response;
    }

    public async prepareResponse(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<AttestationResponseDTO_ConfirmedBlockHeightExists_Response> {
        const response = await this.verifyRequestInternal(request);
        return response;
    }

    public async mic(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<MicResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new MicResponse({ status: result.status });
        }
        const response = result.response;
        if (!response) return new MicResponse({ status: result.status });
        return new MicResponse({
            status: AttestationResponseStatus.VALID,
            messageIntegrityCode: this.store.attestationResponseHash<ConfirmedBlockHeightExists_Response>(response, MIC_SALT),
        });
    }

    public async prepareRequest(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<EncodedRequestResponse> {
        const result = await this.verifyRequestInternal(request);
        if (result.status !== AttestationResponseStatus.VALID) {
            return new EncodedRequestResponse({ status: result.status });
        }
        const response = result.response;

        if (!response) return new EncodedRequestResponse({ status: result.status });
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<ConfirmedBlockHeightExists_Response>(response, MIC_SALT)!,
        } as ConfirmedBlockHeightExists_Request;

        return new EncodedRequestResponse({
            status: AttestationResponseStatus.VALID,
            abiEncodedRequest: this.store.encodeRequest(newRequest),
        });
    }
}
