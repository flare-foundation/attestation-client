import { Inject, Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT, ZERO_BYTES_32 } from "../../../../../external-libs/utils";
import { getAttestationStatus } from "../../../../../verification/attestation-types/attestation-types";
import {
    ConfirmedBlockHeightExists_Request,
    ConfirmedBlockHeightExists_RequestNoMic,
    ConfirmedBlockHeightExists_Response,
} from "../../dtos/attestation-types/ConfirmedBlockHeightExists.dto";
import { verifyConfirmedBlockHeightExists } from "../../verification/generic-chain-verifications";
import { BTCProcessorService } from "../verifier-processors/btc-processor.service";

@Injectable()
export class BTCConfirmedBlockHeightExistsVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<ConfirmedBlockHeightExists_RequestNoMic, ConfirmedBlockHeightExists_Request, ConfirmedBlockHeightExists_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor(@Inject("VERIFIER_PROCESSOR") private processor: BTCProcessorService) {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
    }

    private async verifyRequest(
        request: ConfirmedBlockHeightExists_RequestNoMic | ConfirmedBlockHeightExists_Request,
    ): Promise<AttestationResponse<ConfirmedBlockHeightExists_Response>> {
        let fixedRequest = {
            ...request,
        } as ConfirmedBlockHeightExists_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        const result = await verifyConfirmedBlockHeightExists(fixedRequest, this.processor.indexedQueryManager);
        return {
            status: getAttestationStatus(result.status),
            response: result.response,
        } as AttestationResponse<ConfirmedBlockHeightExists_Response>;
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponse<ConfirmedBlockHeightExists_Response>> {
        const requestJSON = this.store.parseRequest<ConfirmedBlockHeightExists_Request>(abiEncodedRequest);

        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(requestJSON);

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        return response;
    }

    public async prepareResponse(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<AttestationResponse<ConfirmedBlockHeightExists_Response>> {
        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        const response = await this.verifyRequest(request);

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        return response;
    }

    public async mic(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<string> {
        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        return this.store.attestationResponseHash<ConfirmedBlockHeightExists_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<string> {
        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        const result = await this.verifyRequest(request);
        const response = result.response;

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<ConfirmedBlockHeightExists_Response>(response, MIC_SALT)!,
        } as ConfirmedBlockHeightExists_Request;

        return this.store.encodeRequest(newRequest);
    }
}
