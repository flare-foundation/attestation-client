import { optional } from "flare-mcc";
import { AdditionalTypeInfo, IReflection } from "../utils/typeReflection";

class AlertAttestationConfig {
    name = "";
    @optional() mode = "dev";
    @optional() path: "";
    restart = "";
}


export class AlertConfig implements IReflection<AlertConfig> {
    @optional() interval: number = 5000;

    @optional() timeLate: number = 5;
    @optional() timeDown: number = 10;
    @optional() timeRestart: number = 20;
    stateSaveFilename = "";
    indexerRestart = "";
    indexers = ["ALGO", "BTC", "DOGE", "LTC", "XRP"];
    attesters = [];

    instanciate() {
        return new AlertConfig();
    }

    getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {

        const res = new AdditionalTypeInfo();

        res.arrayMap.set( "indexers" , "string" );
        res.arrayMap.set( "attesters" , new AlertAttestationConfig() );

        return res;        
    }

}

