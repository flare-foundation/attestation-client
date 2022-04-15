import { AttesterWebOptions } from "../attester/AttesterClientConfiguration";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";

export class SpammerCredentials implements IReflection<SpammerCredentials>{
    web = new AttesterWebOptions();
  
    instanciate(): SpammerCredentials {
      return new SpammerCredentials();
    }
    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
      return null;
    }
  }