import { Attestation } from "../../attester/Attestation";
import { readCredentials } from "../../utils/config";
import { AttestationRequest, AttestationRequestOptions } from "../attestation-types/attestation-types";
import { readAttestationTypeSchemes } from "../attestation-types/attestation-types-helpers";
import { getAttestationTypeAndSource } from "../generated/attestation-request-parse";
import { getAttestationTypeName } from "../generated/attestation-types-enum";
import { getSourceName } from "../sources/sources";
import { VerifierAttestationTypeRouteCredentials } from "./configs/VerifierAttestationTypeRouteCredentials";
import { VerifierRouteCredentials } from "./configs/VerifierRouteCredentials";

const axios = require("axios");

export class VerifierRoute {
   url?: string;
   apiKey?: string;
   constructor(url?: string, apiKey?: string) {
      this.url = url;
      this.apiKey = apiKey;
   }
}

/**
 * Representative of an empty VerifierRoute
 */
export const EMPTY_VERIFIER_ROUTE = new VerifierRoute();

/**
 * A routing class for attestation requests to be routed to verifier servers.
 * It gets configured through type definitions and routing configuration.
 * If supports passing attestation requests to verifier servers.
 */
export class VerifierRouter {
   credentials: VerifierRouteCredentials;
   // routing map: sourceName -> attestationTypeName -> VerifierRoute
   routeMap: Map<string, Map<string, VerifierRoute>>;
   _initialized = false;

   /**
    * Auxilliary function. Returns VerifierRoute for given @param sourceName and @param attestationTypeName
    * @param sourceName 
    * @param attestationTypeName 
    * @returns 
    */
   private getRouteEntry(sourceName: string, attestationTypeName: string): VerifierRoute | null {
      let sourceMap = this.routeMap.get(sourceName);
      if (!sourceMap) {
         return null;
      }
      let route = sourceMap.get(attestationTypeName);
      return route;
   }

   /**
    * Auxilliary function. Sets VerifierRoute for given @param sourceName and @param attestationTypeName
    * @param sourceName 
    * @param attestationTypeName 
    * @param value 
    */
   private setRouteEntry(sourceName: string, attestationTypeName: string, value: VerifierRoute) {
      let sourceMap = this.routeMap.get(sourceName);
      if (!sourceMap) {
         throw new Error(`Invalid sourceName '${sourceName}'`);
      }
      let route = sourceMap.get(attestationTypeName);
      if (!route) {
         throw new Error(`Invalid pair ('${sourceName}', '${attestationTypeName}')`);
      }
      sourceMap.set(attestationTypeName, value);
   }

   /**
    * Initializes the class by reading both type definitions and routing configurations, and
    * assembling routing map. While assembling the routing map it is checked that the correct
    * configurations are read and set and there are no double setting of a specific configuration for
    * a pair of (sourceName, attestationTypeName)
    */
   public async initialize() {
      if (this._initialized) {
         throw new Error("Already initialized");
      }
      this.credentials = readCredentials(new VerifierRouteCredentials(), "verifier-routes");
      const definitions = await readAttestationTypeSchemes();
      this.routeMap = new Map<string, Map<string, VerifierAttestationTypeRouteCredentials>>();
      // set up all possible routes
      for (let definition of definitions) {
         let attestationTypeName = definition.name;
         for (let source of definition.supportedSources) {
            let sourceName = getSourceName(source);
            let tmp = this.routeMap.get(sourceName);
            if (!tmp) {
               tmp = new Map<string, VerifierAttestationTypeRouteCredentials>();
            }
            this.routeMap.set(sourceName, tmp);
            if (tmp.get(attestationTypeName)) {
               throw new Error(`Duplicate configuration (${sourceName},${attestationTypeName})`);
            }
            tmp.set(attestationTypeName, EMPTY_VERIFIER_ROUTE);
         }
      }

      // Check credentials against all possible routes and setup routes form credentials
      for (let sourceCred of this.credentials.verifierRoutes) {
         let defaultRoute: VerifierRoute | null = null;
         if (sourceCred.defaultUrl && sourceCred.defaultUrl.length > 0) {
            defaultRoute = new VerifierRoute(sourceCred.defaultUrl, sourceCred.defaultApiKey);
         }
         let sourceName = sourceCred.sourceId;
         for (let attestationCred of sourceCred.routes) {
            let verifierRoute = null;
            if (attestationCred.url || attestationCred.url.length > 0) {
               verifierRoute = new VerifierRoute(attestationCred.url, attestationCred.apiKey);
            } else if (defaultRoute) {
               verifierRoute = defaultRoute;
            }
            for (let attestationTypeName of attestationCred.attestationTypes) {
               let route = this.getRouteEntry(sourceName, attestationTypeName);
               if (route !== EMPTY_VERIFIER_ROUTE) {
                  throw new Error(`Duplicate route entry for pair ('${sourceName}','${attestationTypeName}')`);
               }
               if (verifierRoute) {
                  this.setRouteEntry(sourceName, attestationTypeName, verifierRoute);
               }
            }
         }
      }
      this._initialized = true;
   }

   /**
    * Returns a route for given attestation request.
    * @param attestation - attestation object containing attestation request and all relevant metadata
    * @returns 
    */
   private getRoute(attestation: Attestation): VerifierRoute | null {
      let { attestationType, sourceId } = getAttestationTypeAndSource(attestation.data.request);
      let attestationTypeName = getAttestationTypeName(attestationType);
      let sourceName = getSourceName(sourceId);
      let route = this.getRouteEntry(sourceName, attestationTypeName)
      if (route === EMPTY_VERIFIER_ROUTE) {
         return null;
      }
      return route;
   }

   /**
    * Verifies attestation by sending the request to relevant verifier (including this.sourcerouter. one).
    * @param attestation 
    * @param recheck 
    * @returns 
    */
   public async verifyAttestation(attestation: Attestation, recheck = false) {
      let route = this.getRoute(attestation);
      if (route) {
         const attestationRequestOptions = {
            roundId: attestation.roundId,
            recheck,
            windowStartTime: attestation.windowStartTime,
            UBPCutoffTime: attestation.UBPCutoffTime,
         } as AttestationRequestOptions;
         const attestationRequest = {
            apiKey: route.apiKey,
            request: attestation.data.request,
            options: attestationRequestOptions
         } as AttestationRequest;
         const resp = await axios.post(
            route.url,
            attestationRequest
         );
         return resp.data;
      }
      throw new Error(`Invalid route.`);
   }
}