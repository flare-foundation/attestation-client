import { optional } from "@flarenetwork/mcc";

export class ServerUser {
    name: string = "";
    apiKey: string = "";
    @optional() ip: string = "";
}