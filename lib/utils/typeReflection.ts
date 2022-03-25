import { getGlobalLogger } from "./logger";

const reflect = (target: any, memberName: string) => {
};


function getType(object: any) {
  let type = typeof (object);

  if (type === "object") {
    type = object.constructor.name;
  }

  return type;
}

function isEqualTypeUni(parent: string, A: any, B: any, issue: string, checkType: boolean): boolean {
  let valid = true;

  for (let keyA of Object.keys(A)) {
    let found = false;

    const typeA = typeof (A[keyA]);
    const realTypeA = getType(A[keyA]);

    for (let keyB of Object.keys(B)) {

      if (keyA === keyB) {
        found = true;

        if (checkType) {

          const typeB = typeof (B[keyA]);
          const realTypeB = getType(B[keyA]);

          if (typeA === typeB) {
            // check if this is class
            if (typeA == "object") {

              // handle array
              if (realTypeA as any === "Array" && realTypeB as any === "Array") {
                const lenA = A[keyA].length;

                if (lenA === 0) {
                  // what now? we do not have a base to compare with

                }

                const lenB = B[keyA].length;
                for (let i = 0; i < lenB; i++) {
                  if (!isEqualType(A[keyA][0], B[keyA][i], `${keyA}[${i}].`)) {
                    valid = false;
                  }
                }

              }
              else {
                // handle object
                if (!isEqualType(A[keyA], B[keyA], `${keyA}.`)) {
                  valid = false;
                }
              }
            }
          }
          else {
            valid = false;
            getGlobalLogger().error2(`member "${parent}${keyA}": type ^Y${realTypeB}^^ is not assignable to ^Y${realTypeA}^^`);
          }
        }
        break;
      }
    }

    if (!found) {
      valid = false;
      getGlobalLogger().error2(`${issue} "${parent}${keyA}:${realTypeA}"`);
    }
  }

  return valid;
}


export function isEqualType(A: any, B: any, parent: string = ""): boolean {
  const testAB = isEqualTypeUni(parent, A, B, "missing propery", true);
  const testBA = isEqualTypeUni(parent, B, A, "unknown propery", false);

  return testAB && testBA;
}


import "reflect-metadata";
const formatMetadataKey = Symbol("format");
function reflection(formatString: string) {
  return Reflect.metadata(formatMetadataKey, formatString);
}
function getReflection(target: any, propertyKey: string) {
  return Reflect.getMetadata(formatMetadataKey, target, propertyKey);
}

class A {
    @reflection("number")
    a: number;
}