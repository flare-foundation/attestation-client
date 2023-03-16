import { IInstantiate } from "./IInstantiate";

export class AdditionalTypeInfo {
  arrayMap = new Map<string, any>();
  additionalKeys = new Map<string, any>();

  getArrayType(name: string) {
    return this.arrayMap.get(name);
  }
}

export interface IReflection<T> extends IInstantiate<T> {
  instantiate(): T;
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo;
}
