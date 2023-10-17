import { DogeTransaction } from "@flarenetwork/mcc";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import {
    ReferencedPaymentNonexistence_Request,
    ReferencedPaymentNonexistence_RequestNoMic,
    ReferencedPaymentNonexistence_Response,
} from "../../dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import { AttestationResponseDTO } from "../../dtos/generic/generic.dto";
import { verifyReferencedPaymentNonExistence } from "../../verification/generic-chain-verifications";
import { DOGEProcessorService } from "../verifier-processors/doge-processor.service";

@Injectable()
export class DOGEReferencedPaymentNonexistenceVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<ReferencedPaymentNonexistence_RequestNoMic, ReferencedPaymentNonexistence_Request, ReferencedPaymentNonexistence_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: DOGEProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    private async verifyRequest(
        request: ReferencedPaymentNonexistence_RequestNoMic | ReferencedPaymentNonexistence_Request,
    ): Promise<AttestationResponse<ReferencedPaymentNonexistence_Response>> {
        if (request.attestationType !== encodeAttestationName("ReferencedPaymentNonexistence") || request.sourceId !== encodeAttestationName("DOGE")) {
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: `Attestation type and source id combination not supported: (${request.attestationType}, ${request.sourceId}). This source supports attestation type 'ReferencedPaymentNonexistence' (0x5265666572656e6365645061796d656e744e6f6e6578697374656e6365000000) and source id 'DOGE' (0x444f474500000000000000000000000000000000000000000000000000000000).`,
                },
                HttpStatus.BAD_REQUEST
            );
        }

        let fixedRequest = {
            ...request,
        } as ReferencedPaymentNonexistence_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        const result = await verifyReferencedPaymentNonExistence(DogeTransaction, fixedRequest, this.processor.indexedQueryManager);
        return serializeBigInts({
            status: getAttestationStatus(result.status),
            response: result.response,
        }) as AttestationResponse<ReferencedPaymentNonexistence_Response>;
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO<ReferencedPaymentNonexistence_Response>> {
        const requestJSON = this.store.parseRequest<ReferencedPaymentNonexistence_Request>(abiEncodedRequest);
        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(requestJSON);

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        return response;
    }

    public async prepareResponse(request: ReferencedPaymentNonexistence_RequestNoMic): Promise<AttestationResponseDTO<ReferencedPaymentNonexistence_Response>> {
        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(request);

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        return response;
    }

    public async mic(request: ReferencedPaymentNonexistence_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        return this.store.attestationResponseHash<ReferencedPaymentNonexistence_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: ReferencedPaymentNonexistence_RequestNoMic): Promise<string | undefined> {
        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        if (!response) return undefined;
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<ReferencedPaymentNonexistence_Response>(response, MIC_SALT)!,
        } as ReferencedPaymentNonexistence_Request;

        return this.store.encodeRequest(newRequest);
    }
}
