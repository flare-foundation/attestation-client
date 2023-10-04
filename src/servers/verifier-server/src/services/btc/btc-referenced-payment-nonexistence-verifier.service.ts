import { BtcTransaction } from "@flarenetwork/mcc";
import { Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32 } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import {
    ReferencedPaymentNonexistence_Request,
    ReferencedPaymentNonexistence_RequestNoMic,
    ReferencedPaymentNonexistence_Response,
} from "../../dtos/attestation-types/ReferencedPaymentNonexistence.dto";
import { verifyReferencedPaymentNonExistence } from "../../verification/generic-chain-verifications";
import { BTCProcessorService } from "../verifier-processors/btc-processor.service";

@Injectable()
export class BTCReferencedPaymentNonexistenceVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<ReferencedPaymentNonexistence_RequestNoMic, ReferencedPaymentNonexistence_Request, ReferencedPaymentNonexistence_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: BTCProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    private async verifyRequest(
        request: ReferencedPaymentNonexistence_RequestNoMic | ReferencedPaymentNonexistence_Request,
    ): Promise<AttestationResponse<ReferencedPaymentNonexistence_Response>> {
        let fixedRequest = {
            ...request,
        } as ReferencedPaymentNonexistence_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        const result = await verifyReferencedPaymentNonExistence(BtcTransaction, fixedRequest, this.processor.indexedQueryManager);
        return {
            status: getAttestationStatus(result.status),
            response: result.response,
        } as AttestationResponse<ReferencedPaymentNonexistence_Response>;
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponse<ReferencedPaymentNonexistence_Response>> {
        const requestJSON = this.store.parseRequest<ReferencedPaymentNonexistence_Request>(abiEncodedRequest);

        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(requestJSON);

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        return response;
    }

    public async prepareResponse(request: ReferencedPaymentNonexistence_RequestNoMic): Promise<AttestationResponse<ReferencedPaymentNonexistence_Response>> {
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
