import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../utils/reflection";
import { ServerUser } from "./serverUser";

export class VPWSConfig implements IReflection<VPWSConfig> {
  @optional() serverPort: number = 8088;
  @optional() serverKeyPath: string = "./data/vpwserver/key.pem";
  @optional() serverCertificatePath: string = "./data/vpwserver/cert.pem";

  @optional() checkAliveIntervalMs: number = 5000;

  instanciate(): VPWSConfig {
    return new VPWSConfig();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }

}

export class VPWSCredentials implements IReflection<VPWSCredentials> {

  instanciate(): VPWSCredentials {
    return new VPWSCredentials();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }

}

export class VerificationProviderConfig {
  name: string = "";
  @optional() settings: string = "";
}

export class VPWSUsers implements IReflection<VPWSUsers> {

  serverUsers = new Array<ServerUser>();

  instanciate(): VPWSUsers {
    return new VPWSUsers();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();

    info.arrayMap.set("serverUsers", new ServerUser());

    return info;
  }

}

export class VPWSProviders implements IReflection<VPWSProviders> {

  verificationProviders = new Array<VerificationProviderConfig>();

  instanciate(): VPWSProviders {
    return new VPWSProviders();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();

    info.arrayMap.set("verificationProviders", new VerificationProviderConfig());

    return info;
  }

}
