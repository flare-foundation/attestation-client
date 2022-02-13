import { ChainType, prefix0x, toBN, unPrefix0x } from "flare-mcc";
import { toHex } from "../../utils/utils";
import { AttestationType } from "../generated/attestation-types-enum";
import { AttestationRequestScheme, AttestationTypeScheme, ATT_BYTES, CHAIN_ID_BYTES } from "./attestation-types";

export function attestationTypeSchemeIndex(schemes: AttestationTypeScheme[]): Map<AttestationType, AttestationTypeScheme> {
   let index = new Map<AttestationType, AttestationTypeScheme>();
   for (let scheme of schemes) {
     let type = scheme.id as AttestationType;
     assert(index.get(type) == null, "Duplicate AttestationTypeScheme");
     index.set(type, scheme);
   }
   return index;
 }
 
 // Assumes bytes are not 0x prefixed
 function fromUnprefixedBuytes(bytes: string, scheme: AttestationRequestScheme) {
   assert(bytes.length % 2 === 0, "Bytes length must be even");
   assert(bytes.length === scheme.size * 2, "Bytes length does not match the scheme");
   switch (scheme.type) {
     case "AttestationType":
       return toBN(prefix0x(bytes)).toNumber() as AttestationType;
     case "NumberLike":
       return toBN(prefix0x(bytes));
     case "ChainType":
       return toBN(prefix0x(bytes)).toNumber() as ChainType;
     case "BytesLike":
       return toHex(prefix0x(bytes), scheme.size);
     default:
       // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
       ((_: never): void => { })(scheme.type);
   }
 }
 
 function toUnprefixedBytes(value: any, scheme: AttestationRequestScheme) {
   switch (scheme.type) {
     case "AttestationType":
       return unPrefix0x(toHex(value as number, scheme.size*2));
     case "NumberLike":
       return unPrefix0x(toHex(value, scheme.size*2));
     case "ChainType":
       return unPrefix0x(toHex(value as number, scheme.size*2));
     case "BytesLike":
       return unPrefix0x(toHex(value, scheme.size*2));
     default:
       // exhaustive switch guard: if a compile time error appears here, you have forgotten one of the cases
       ((_: never): void => { })(scheme.type);
   }
 }
 
 
 export function getAttestationTypeAndSource(bytes: string) {
   let input = unPrefix0x(bytes);
   return {
     attestationType: toBN(prefix0x(input.slice(0, ATT_BYTES * 2))).toNumber() as AttestationType,
     source: toBN(prefix0x(input).slice(ATT_BYTES * 2, ATT_BYTES * 2 + CHAIN_ID_BYTES * 2)).toNumber() as ChainType
   }
 }
 
 export function getAttestationTypeScheme(
   bytes: string,
   definitions: Map<AttestationType, AttestationTypeScheme>,
   check = true
 ): AttestationTypeScheme | undefined {
   let input = unPrefix0x(bytes)
   let attType = toBN(prefix0x(input.slice(0, ATT_BYTES * 2))).toNumber() as AttestationType;
   let definition = definitions.get(attType);
   if (!definition) return undefined;  // scheme does not exist for the type
   if (check) {
     let len = definition.request.map(item => item.size).reduce((x, y) => x + y);
     if (bytes.length !== len * 2) return undefined;  // not the correct number of bytes
   }
   return definition;
 }
 
 // Assumes bytes length matches scheme
 export function parseRequestBytes(bytes: string, scheme: AttestationTypeScheme): any {
   let result = {} as any;
   let input = unPrefix0x(bytes);
   let start = 0;
   for (let item of scheme.request) {
     let end = start + item.size*2;
     result[item.key] = fromUnprefixedBuytes(input.slice(start, end), item)
   }
   return result;
 }
 
 export function encodeRequestBytes(request: any, scheme: AttestationTypeScheme, verify=true) {
   if(verify) {
     let schemeKeys = new Set<string>(scheme.request.map(item => item.key))
     let requestKeys = new Set<string>(Object.keys(request));
     if(schemeKeys.size != requestKeys.size) {
       throw new Error("Number of keys does not match")
     }
     for(let key in request) {
       if(!schemeKeys.has(key)) {
         throw new Error(`Non-matching key '${key}'`)
       }
     }
   }
   
   let bytes = "0x"
   scheme.request.forEach(item => {
     bytes += toUnprefixedBytes(request[item.key], item);
   })
   return bytes;
 }
 