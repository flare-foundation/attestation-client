
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

export class IVerificationProvider {

    initializeSettings: string;

    async initialize?() : Promise<boolean>;

    getName?() : string;

    getSupportedVerificationTypes?() : (VerificationType)[];

    async verifyRequest?(type: VerificationType, roundId: number, request: string) : Promise<boolean>;

    isSupported(att: VerificationType) : boolean {
        for(let pair of this.getSupportedVerificationTypes() ) {
            if( pair.sourceId===att.sourceId && pair.attestationType===att.attestationType) {
                return true;
            }            
        }

        return false;
    }
}