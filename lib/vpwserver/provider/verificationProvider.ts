import { IInstanciate } from "../../utils/instanciate";
import { VerificationStatus } from "../../verification/attestation-types/attestation-types";


export class VerificationType {
    sourceId: number;
    attestationType: number;

    constructor(attestationType: number=0, sourceId: number=0) {
        this.sourceId=sourceId;
        this.attestationType=attestationType;
    }

    toString() : string {
       return `${this.attestationType}:${this.sourceId}`; 
    }
}

export class VerificationResult {
    status: VerificationStatus;
    response: string;

    constructor(status: VerificationStatus, response: string = "") {
        this.status = status;
        this.response = response;
    }
}

export class IVerificationProvider<T> implements IInstanciate<T> {

    initializeSettings: string;

    instanciate(): T {
        return null;
    }

    async initialize?() : Promise<boolean>;

    getName?() : string;

    getSupportedVerificationTypes?() : (VerificationType)[];

    async verifyRequest?(verificationId: number, type: VerificationType, roundId: number, request: string) : Promise<VerificationResult>;

    isSupported(att: VerificationType) : boolean {
        for(let pair of this.getSupportedVerificationTypes() ) {
            if( pair.sourceId===att.sourceId && pair.attestationType===att.attestationType) {
                return true;
            }            
        }

        return false;
    }
}