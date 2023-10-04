import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { AttestationDefinitionStore } from "../../../../../external-libs/AttestationDefinitionStore";
import { AttestationResponse, AttestationResponseStatus } from "../../../../../external-libs/AttestationResponse";
import { ExampleData } from "../../../../../external-libs/interfaces";
import { MIC_SALT } from "../../../../../external-libs/utils";
import { AddressValidity_Request, AddressValidity_RequestNoMic, AddressValidity_Response } from "../../dtos/attestation-types/AddressValidity.dto";

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

    public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponse<AddressValidity_Response>> {
        const requestJSON = this.store.parseRequest<AddressValidity_Request>(abiEncodedRequest);
        console.dir(requestJSON, { depth: null });

        //-$$$<start-verifyEncodedRequest> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-verifyEncodedRequest> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: AttestationResponse<AddressValidity_Response> = {
            status: AttestationResponseStatus.VALID,
            response: this.exampleData.response,
        };

        return response;
    }

    public async prepareResponse(request: AddressValidity_RequestNoMic): Promise<AttestationResponse<AddressValidity_Response>> {
        console.dir(request, { depth: null });

        //-$$$<start-prepareResponse> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-prepareResponse> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: AttestationResponse<AddressValidity_Response> = {
            status: AttestationResponseStatus.VALID,
            response: {
                ...this.exampleData.response,
                ...request,
            } as AddressValidity_Response,
        };

        return response;
    }

    public async mic(request: AddressValidity_RequestNoMic): Promise<string | undefined> {
        console.dir(request, { depth: null });

        //-$$$<start-mic> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-mic> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: AddressValidity_Response = {
            ...this.exampleData.response,
            ...request,
        };

        if (!response) return undefined;
        return this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT)!;
    }

    public async prepareRequest(request: AddressValidity_RequestNoMic): Promise<string | undefined> {
        console.dir(request, { depth: null });

        //-$$$<start-prepareRequest> Start of custom code section. Do not change this comment.

        // PUT YOUR CUSTOM CODE HERE

        //-$$$<end-prepareRequest> End of custom code section. Do not change this comment.

        // Example of response body. Delete this example and provide value for variable 'response' in the custom code section above.
        const response: AddressValidity_Response = {
            ...this.exampleData.response,
            ...request,
        };

        if (!response) return undefined;
        const newRequest = {
            ...request,
            messageIntegrityCode: this.store.attestationResponseHash<AddressValidity_Response>(response, MIC_SALT)!,
        } as AddressValidity_Request;

        return this.store.encodeRequest(newRequest);
    }
}
