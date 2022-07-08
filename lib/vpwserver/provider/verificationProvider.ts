export class VerificationPair {
    source: number = 0;
    type: number = 0;
}

export interface IVerificationProvider {
    getSupportedVerificationPairs() : [];
    verifyRequest(request: string) : boolean;
}