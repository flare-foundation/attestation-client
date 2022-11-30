import { getOptionalKeys } from "@flarenetwork/mcc";
import { getGlobalLogger } from "./logger";

function getType(object: any) {
  let type = typeof object;

  if (type === "object") {
    type = object.constructor.name;
  }

  return type;
}

function isEqualTypeUni(parent: string, A: any, B: any, notFound: string, optionalNotFound: string, checkType: boolean): boolean {
  let valid = true;

  // for array: string[] has keys for every character and is treated as array
  if (typeof A === "string" && typeof B === "string") {
    return true;
  }

  const typeInfoA = A.getAdditionalTypeInfo ? A.getAdditionalTypeInfo(B) : null;

  const keysA = Object.keys(A);
  typeInfoA?.additionalKeys?.forEach((value: any, key: string) => {
    keysA.push(key);
  });

  const optionalAkeys = getOptionalKeys(A);
  const optionalA = optionalAkeys ? Object.keys(optionalAkeys) : [];

  for (const keyA of keysA) {
    let found = false;

    let typeA = typeof A[keyA];
    let realTypeA = getType(A[keyA]);
    let objA = A[keyA];

    const userObjA = typeInfoA?.additionalKeys ? typeInfoA.additionalKeys.get(keyA) : undefined;

    if (userObjA) {
      objA = userObjA;
      typeA = typeof objA;
      realTypeA = getType(objA);
    }

    const typeInfoB = B.getAdditionalTypeInfo ? B.getAdditionalTypeInfo(A) : null;

    const keysB = Object.keys(B);

    typeInfoB?.additionalKeys?.forEach((value: any, key: string) => {
      keysB.push(key);
    });

    for (const keyB of keysB) {
      if (keyA === keyB) {
        found = true;

        if (checkType) {
          const userObjB = typeInfoB?.additionalKeys ? typeInfoB.additionalKeys.get(keyA) : undefined;

          let objB = B[keyA];
          let typeB = typeof objB;
          let realTypeB = getType(objB);

          if (userObjB) {
            objB = userObjB;
            typeB = typeof objB;
            realTypeB = getType(objB);
          }

          if (typeA === typeB) {
            // check if this is class
            if (typeA == "object") {
              // handle array
              if ((realTypeA as any) === "Array" && (realTypeB as any) === "Array") {
                const arrayType = typeInfoA.getArrayType(keyA);

                if (!arrayType) {
                  getGlobalLogger().error(`'${parent}${keyA}' array item type is not provided`);
                  continue;
                }

                const lenB = objB.length;
                for (let i = 0; i < lenB; i++) {
                  if (!isEqualType(arrayType, objB[i], parent + `${keyA}[${i}].`)) {
                    valid = false;
                  }
                }
              } else {
                // handle object
                if (!isEqualType(objA, objB, parent + `${keyA}.`)) {
                  valid = false;
                }
              }
            }
          } else {
            valid = false;
            getGlobalLogger().error2(`member "${parent}${keyA}": type ^Y${realTypeB}^^ is not assignable to ^Y${realTypeA}^^`);
          }
        }
        break;
      }
    }

    if (!found) {
      if (checkType) {
        const isOptional = optionalA.find((x) => x == keyA);

        if (isOptional) {
          getGlobalLogger().info(`${optionalNotFound} "${parent}${keyA}:${realTypeA}" (using default "${A[keyA]}")`);
        } else {
          valid = false;
          getGlobalLogger().error2(`${notFound} "${parent}${keyA}:${realTypeA}" (using default "${A[keyA]}")`);
        }

        // unify
        B[keyA] = A[keyA];
      } else {
        // todo: this should be warning
        getGlobalLogger().warning(`${notFound} "${parent}${keyA}:${realTypeA}"`);
      }
    }
  }

  return valid;
}

export function isEqualType(A: any, B: any, parent = ""): boolean {
  const testAB = isEqualTypeUni(parent, A, B, "missing propery", "property using default value", true);
  const testBA = isEqualTypeUni(parent, B, A, "unknown propery", "", false);

  return testAB && testBA;
}
