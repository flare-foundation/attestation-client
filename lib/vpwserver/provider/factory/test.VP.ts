import { sleepms } from "../../../utils/utils";
import { Factory } from "../classFactory";
import { IVerificationProvider, VerificationType } from "../verificationProvider";

@Factory("VerificationProvider")
export class TestVP extends IVerificationProvider<TestVP> {


    instanciate() : TestVP {
        return new TestVP();
    }

    public async initialize(): Promise<boolean> {
        return true;
    }

    public getName(): string {
        return "Test VP";
    }

    public getSupportedVerificationTypes(): (VerificationType)[] {
        return [new VerificationType(0, 0)];
    }

    public async verifyRequest(verificationId: number, type: VerificationType, roundId: number, request: string): Promise<boolean> {
        await sleepms(1000);
        return true;
    }

}