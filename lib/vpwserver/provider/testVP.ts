import { sleepms } from "../../utils/utils";
import { IVerificationProvider, VerificationType } from "./verificationProvider";

export class TestVP extends IVerificationProvider {

    public async initialize(): Promise<boolean> {
        return true;
    }

    public getName(): string {
        return "Test VP";
    }

    public getSupportedVerificationTypes(): (VerificationType)[] {
        return [new VerificationType(0, 0)];
    }

    public async verifyRequest(type: VerificationType, roundId: number, request: string): Promise<boolean> {
        await sleepms(1000);
        return true;
    }

}