import { sleepms } from "../../../utils/utils";
import { VerificationStatus } from "../../../verification/attestation-types/attestation-types";
import { Factory } from "../classFactory";
import { IVerificationProvider, VerificationResult, VerificationType } from "../verificationProvider";

/**
 * Verification Provider Factory test
 */
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

    public async verifyRequest(verificationId: number, type: VerificationType, roundId: number, request: string, recheck: boolean): Promise<VerificationResult> {
        await sleepms(1000);
        return new VerificationResult(VerificationStatus.OK,"test response");
    }

}