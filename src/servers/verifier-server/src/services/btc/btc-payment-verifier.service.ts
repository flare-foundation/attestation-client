import { BtcTransaction } from "@flarenetwork/mcc";
import { Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32 } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import { Payment_Request, Payment_RequestNoMic, Payment_Response } from "../../dtos/attestation-types/Payment.dto";
import { verifyPayment } from "../../verification/generic-chain-verifications";
import { BTCProcessorService } from "../verifier-processors/btc-processor.service";

@Injectable()
export class BTCPaymentVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<Payment_RequestNoMic, Payment_Request, Payment_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: BTCProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    private async verifyRequest(request: Payment_RequestNoMic | Payment_Request): Promise<AttestationResponse<Payment_Response>> {
        let fixedRequest = {
            ...request,
        } as Payment_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        const result = await verifyPayment(BtcTransaction, fixedRequest, this.processor.indexedQueryManager, this.processor.client);
        return {
            status: getAttestationStatus(result.status),
            response: result.response,
        } as AttestationResponse<Payment_Response>;
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponse<Payment_Response>> {
        const requestJSON = this.store.parseRequest<Payment_Request>(abiEncodedRequest);

        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(requestJSON);

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        return response;
    }

    public async prepareResponse(request: Payment_RequestNoMic): Promise<AttestationResponse<Payment_Response>> {
        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(request);

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        return response;
    }

    public async mic(request: Payment_RequestNoMic): Promise<string> {
        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        return this.store.attestationResponseHash<Payment_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: Payment_RequestNoMic): Promise<string> {
        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<Payment_Response>(response, MIC_SALT)!,
        } as Payment_Request;

        return this.store.encodeRequest(newRequest);
    }
}
