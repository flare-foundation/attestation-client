import { IInstanciate } from "../../utils/instanciate";
import { VerificationStatus } from "../../verification/attestation-types/attestation-types";


export class VerificationType {
    sourceId: number;
    attestationType: number;

    constructor(attestationType: number = 0, sourceId: number = 0) {
        this.sourceId = sourceId;
        this.attestationType = attestationType;
    }

    toString(): string {
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

    /**
     * Instanciate factory class
     * @returns 
     */
    public instanciate(): T {
        return null;
    }

    /**
     * Initialize Verification Provider
     */
    public async initialize?(): Promise<boolean>;

    /**
     * Get name
     */
    public getName?(): string;

    /**
     * Returns supported Verification types.
     */
    public getSupportedVerificationTypes?(): (VerificationType)[];

    /**
     * Verify Verification Request.
     * @param verificationId 
     * @param type 
     * @param roundId 
     * @param request 
     * @param recheck 
     */
    public async verifyRequest?(verificationId: number, type: VerificationType, roundId: number, request: string, recheck: boolean): Promise<VerificationResult>;

    /**
     * Check if verification type is supported.
     * @param att 
     * @returns 
     */
    public isSupported(att: VerificationType): boolean {
        for (let pair of this.getSupportedVerificationTypes()) {
            if (pair.sourceId === att.sourceId && pair.attestationType === att.attestationType) {
                return true;
            }
        }

        return false;
    }
}