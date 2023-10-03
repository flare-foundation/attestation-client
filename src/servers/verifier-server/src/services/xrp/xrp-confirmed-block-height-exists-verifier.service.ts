import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT } from "../../../../../external-libs/utils";
import {
    ConfirmedBlockHeightExists_Request,
    ConfirmedBlockHeightExists_RequestNoMic,
    ConfirmedBlockHeightExists_Response,
} from "../../dtos/attestation-types/ConfirmedBlockHeightExists.dto";

@Injectable()
export class XRPConfirmedBlockHeightExistsVerifierService {
    store!: AttestationDefinitionStore;
    exampleData!: ExampleData<ConfirmedBlockHeightExists_RequestNoMic, ConfirmedBlockHeightExists_Request, ConfirmedBlockHeightExists_Response>;

    //-$$$<start-constructor> Start of custom code section. Do not change this comment.

    constructor() {
        this.store = new AttestationDefinitionStore("configs/type-definitions");
        this.exampleData = JSON.parse(readFileSync("src/example-data/ConfirmedBlockHeightExists.json", "utf8"));
    }

    //-$$$<end-constructor> End of custom code section. Do not change this comment.

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponse<ConfirmedBlockHeightExists_Response>> {
        const requestJSON = this.store.parseRequest<ConfirmedBlockHeightExists_Request>(abiEncodedRequest);
        console.dir(requestJSON, { depth: null });

        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: AttestationResponse<ConfirmedBlockHeightExists_Response> = {
            status: AttestationStatus.VALID,
            response: this.exampleData.response,
        };

        return response;
    }

    public async prepareResponse(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<AttestationResponse<ConfirmedBlockHeightExists_Response>> {
        console.dir(request, { depth: null });

        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: AttestationResponse<ConfirmedBlockHeightExists_Response> = {
            status: AttestationStatus.VALID,
            response: {
                ...this.exampleData.response,
                ...request,
            } as ConfirmedBlockHeightExists_Response,
        };

        return response;
    }

    public async mic(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<string> {
        console.dir(request, { depth: null });

        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: ConfirmedBlockHeightExists_Response = {
            ...this.exampleData.response,
            ...request,
        };

        return this.store.attestationResponseHash<ConfirmedBlockHeightExists_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: ConfirmedBlockHeightExists_RequestNoMic): Promise<string> {
        console.dir(request, { depth: null });

        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: ConfirmedBlockHeightExists_Response = {
            ...this.exampleData.response,
            ...request,
        };

        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<ConfirmedBlockHeightExists_Response>(response, MIC_SALT)!,
        } as ConfirmedBlockHeightExists_Request;

        return this.store.encodeRequest(newRequest);
    }
}
