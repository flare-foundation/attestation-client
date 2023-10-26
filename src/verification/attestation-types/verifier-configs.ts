// deprecated
// /**
//  * Helper type to configure which verifier types should be generated for
//  * which source and attestation types.
//  */
// export interface VerifierTypeGenerationConfig {
//   sourceId: string;
//   attestationTypes: string[];
// }

// /**
//  * Configuration of the verifier types for which specific code should be generated to
//  * support verifier server implementations.
//  */
// export const VERIFIER_TYPES_GENERATION_CONFIG: VerifierTypeGenerationConfig[] = [
//   {
//     sourceId: "BTC",
//     attestationTypes: [
//       "Payment",
//       "BalanceDecreasingTransaction",
//       "ConfirmedBlockHeightExists",
//       "ReferencedPaymentNonexistence",
//     ],
//   },
//   {
//     sourceId: "DOGE",
//     attestationTypes: [
//       "Payment",
//       "BalanceDecreasingTransaction",
//       "ConfirmedBlockHeightExists",
//       "ReferencedPaymentNonexistence",
//     ],
//   },
//   {
//     sourceId: "XRP",
//     attestationTypes: [
//       "Payment",
//       "BalanceDecreasingTransaction",
//       "ConfirmedBlockHeightExists",
//       "ReferencedPaymentNonexistence",
//     ],
//   },
//   {
//     sourceId: "ALGO",
//     attestationTypes: [
//       "Payment",
//       "BalanceDecreasingTransaction",
//       "ConfirmedBlockHeightExists",
//       "ReferencedPaymentNonexistence",
//     ],
//   },
//   {
//     sourceId: "LTC",
//     attestationTypes: [
//       "Payment",
//       "BalanceDecreasingTransaction",
//       "ConfirmedBlockHeightExists",
//       "ReferencedPaymentNonexistence",
//     ],
//   },
// ];

// /**
//  * Helper class to check if the verifier type generation config contains a source or attestation type.
//  * Also checks if a given source has an attestation type for it and vice versa.
//  * This is used to determine if the code generation should be performed for a given source and attestation type.
//  * @see VERIFIER_TYPES_GENERATION_CONFIG
//  */
// export class VerifierTypeConfigGenerationChecker {
//   sourceToTypes = new Map<string, Set<string>>();
//   typesToSources = new Map<string, Set<string>>();

//   constructor() {
//     for (const config of VERIFIER_TYPES_GENERATION_CONFIG) {
//       for (const type of config.attestationTypes) {
//         if (!this.typesToSources.has(type)) {
//           this.typesToSources.set(type, new Set());
//         }
//         this.typesToSources.get(type)!.add(config.sourceId);
//       }
//       this.sourceToTypes.set(config.sourceId, new Set(config.attestationTypes));
//     }
//   }

//   /**
//    * Determine if the verifier type generation config contains a source.
//    * @param sourceId
//    * @returns
//    */
//   hasSource(sourceId: string): boolean {
//     return this.sourceToTypes.has(sourceId);
//   }

//   /**
//    * Determine if the verifier type generation config contains an attestation type.
//    * @param type
//    * @returns
//    */
//   hasAttestationType(type: string): boolean {
//     return this.typesToSources.has(type);
//   }

//   /**
//    * For a given source, does the verifier type generation config contain an attestation type for it?
//    * @param sourceId
//    * @param type
//    * @returns
//    */
//   givenSourceHasAttestationTypeForSource(sourceId: string, type: string): boolean {
//     return this.hasSource(sourceId) && this.sourceToTypes.get(sourceId)!.has(type);
//   }

//   /**
//    * For a given attestation type, does the verifier type generation config contain a source for it?
//    * @param type
//    * @param sourceId
//    * @returns
//    */
//   givenAttestationTypeHasSourceForAttestationType(type: string, sourceId: string): boolean {
//     return this.hasAttestationType(type) && this.typesToSources.get(type)!.has(sourceId);
//   }
// }
