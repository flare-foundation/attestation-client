import { optional } from "@flarenetwork/mcc";
import { getGlobalLogger } from "../utils/logger";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";
import { ServerClient } from "./serverClient";

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

export class VPWSSettings implements IReflection<VPWSCredentials> {
  serverClients = new Array<ServerClient>();

  findClientByAuth(auth: string, ip: string): ServerClient {
    const client = this.serverClients.find( x=>x.auth===auth);

    if( !client ) {
      getGlobalLogger().error2( `client with auth '${auth}' not found` );
      return null;
    }

    if( client.ip!=="" && client.ip!==ip ) {
      getGlobalLogger().error2( `client '${client.name}' with auth '${auth}' connected from wrong ip ${ip} (locked on ${client.ip})` );
      return null;
    }

    return client;
  }


  instanciate(): VPWSSettings {
    return new VPWSSettings();
  }
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();

    info.arrayMap.set("serverClients", new ServerClient());

    return info;
  }  

}

export const globalSettings = new VPWSSettings();