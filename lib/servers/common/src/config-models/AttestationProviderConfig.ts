import { AdditionalTypeInfo } from "../../../../utils/reflection";

export class AttestationProviderConfig {
    sourceId: string = "";
    attestationTypes: string[] = [];
    
    instanciate(): AttestationProviderConfig {
        return new AttestationProviderConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
        const info = new AdditionalTypeInfo();
        info.arrayMap.set("attestationTypes", "string");
        return info;
    }

}