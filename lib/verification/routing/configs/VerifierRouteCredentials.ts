import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection";
import { VerifierSourceRouteCredentials } from "./VerifierSourceRouteCredentials";

export class VerifierRouteCredentials implements IReflection<VerifierRouteCredentials> {
  public verifierRoutes: VerifierSourceRouteCredentials[] = [];

  instanciate(): VerifierRouteCredentials {
    return new VerifierRouteCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("verifierRoutes", new VerifierSourceRouteCredentials());
    return info;
  }
}


// {
//    verifierRoutes: [
//       {
//          sourceId: "XRP",
//          defaultUrl: "https://sdfsdfsd",
//          defaultApiKey: "asdfasdf",
//          routes: [
//             {
//                attestationTypes: ["Payment", "BalanceDecreasingTransaction"],
//                url: "https://sdfasdfa",
//                apiKey: "asdfasdf"
//             }
//             ...
//          ]
//       }
//       ...
//   ]
// }