import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../../../utils/reflection";

export class WSServerCredentials implements IReflection<WSServerCredentials> {
  @optional() apiKey: string = "key";

  instanciate(): WSServerCredentials {
    return new WSServerCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }

}