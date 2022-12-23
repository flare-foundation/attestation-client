import { IInstanciate } from "./instanciate";

export class AdditionalTypeInfo {
  arrayMap = new Map<string, any>();
  additionalKeys = new Map<string, any>();

  getArrayType(name: string) {
    return this.arrayMap.get(name);
  }
}

export interface IReflection<T> extends IInstanciate<T> {
  instanciate(): T;
  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo;
}
