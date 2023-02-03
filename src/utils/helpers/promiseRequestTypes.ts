
export enum PromiseRequestStatus {
   initialized,
   pending,
   rejected,
   resolved
}

export interface IIdentifiable {
   id?: string;
}

export type WsResponseStatus = "OK" | "ERROR";

export interface IIdentifiableResponse<S extends IIdentifiable> {
   data: S;
   status: WsResponseStatus;
   errorMessage?: string;
}
