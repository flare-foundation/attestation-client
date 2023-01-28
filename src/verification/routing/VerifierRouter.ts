import axios from "axios";
import { Attestation } from "../../attester/Attestation";
import { ApiResponse } from "../../servers/common/src";
import { readSecureConfig } from "../../utils/configSecure";
import { AttLogger, getGlobalLogger } from "../../utils/logger";
import { retry } from "../../utils/PromiseTimeout";
import { AttestationRequest, Verification } from "../attestation-types/attestation-types";
import { readAttestationTypeSchemes } from "../attestation-types/attestation-types-helpers";
import { getAttestationTypeAndSource } from "../generated/attestation-request-parse";
import { AttestationType, getAttestationTypeName } from "../generated/attestation-types-enum";
import { getSourceName, SourceId } from "../sources/sources";
import { VerifierAttestationTypeRouteConfig } from "./configs/VerifierAttestationTypeRouteConfig";
import { VerifierRouteConfig } from "./configs/VerifierRouteConfig";

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

export class InvalidRouteError extends Error {
   constructor(message: any) {
      super(message);
      this.name = "InvalidRouteError";
   }
}

export class ApiResponseError extends Error {
   constructor(message: any) {
      super(message);
      this.name = "ApiResponseError";
   }
}

/**
 * A routing class for attestation requests to be routed to verifier servers.
 * It gets configured through type definitions and routing configuration.
 * If supports passing attestation requests to verifier servers.
 */
export class VerifierRouter {
   config: VerifierRouteConfig;
   // routing map: sourceName -> attestationTypeName -> VerifierRoute
   routeMap: Map<string, Map<string, VerifierRoute>>;
   _initialized = false;
   logger: AttLogger;
   forcePrepareRoute = false;

   constructor(forcePrepareRoute?: boolean) {
      this.forcePrepareRoute = forcePrepareRoute;
   }

   /**
    * Auxilliary function. Returns VerifierRoute for given @param sourceName and @param attestationTypeName
    * @param sourceName 
    * @param attestationTypeName 
    * @returns 
    */
   private getRouteEntry(sourceName: string, attestationTypeName: string): VerifierRoute | null {
      const sourceMap = this.routeMap.get(sourceName);
      if (!sourceMap) {
         return null;
      }
      const route = sourceMap.get(attestationTypeName);
      return route;
   }

   public isSupported(sourceId: SourceId, type: AttestationType): boolean {
      const routeEntry = this.getRouteEntry(getSourceName(sourceId), getAttestationTypeName(type));
      if (!routeEntry || routeEntry === EMPTY_VERIFIER_ROUTE) return false;
      return true;
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
   public async initialize(startRoundId: number, logger?: AttLogger, configPathOverride?: string) {
      if (this._initialized) {
         throw new Error("Already initialized");
      }
      this.logger = logger ?? getGlobalLogger();
      // initialize by DAC start number      
      this.config = await readSecureConfig(new VerifierRouteConfig(), configPathOverride ?? `verifier-client/verifier-routes-${startRoundId}`);
      if (!this.config) {
         throw new Error(`Missing configuration for roundId ${startRoundId}. Verifier routes configuration start round ids should match the ones from DAC`)
      }
      const definitions = await readAttestationTypeSchemes();
      this.routeMap = new Map<string, Map<string, VerifierAttestationTypeRouteConfig>>();

      // set up all possible routes
      for (let definition of definitions) {
         let attestationTypeName = definition.name;
         for (let source of definition.supportedSources) {
            let sourceName = getSourceName(source);
            let tmp = this.routeMap.get(sourceName);
            if (!tmp) {
               tmp = new Map<string, VerifierAttestationTypeRouteConfig>();
            }
            this.routeMap.set(sourceName, tmp);
            this.logger.debug(`initialize.router[${startRoundId}](${sourceName},${attestationTypeName})`);
            if (tmp.get(attestationTypeName)) {
               throw new Error(`Duplicate configuration (${sourceName},${attestationTypeName})`);
            }
            tmp.set(attestationTypeName, EMPTY_VERIFIER_ROUTE);
         }
      }
      // Check credentials against all possible routes and setup routes form credentials
      for (let sourceCred of this.config.verifierRoutes) {
         let defaultRoute: VerifierRoute | null = null;
         if (sourceCred.defaultUrl && sourceCred.defaultUrl.length > 0) {
            defaultRoute = new VerifierRoute(sourceCred.defaultUrl, sourceCred.defaultApiKey);
         }
         let sourceName = sourceCred.sourceId;
         for (let attestationCred of sourceCred.routes) {
            let verifierRoute = null;
            if (attestationCred.url && attestationCred.url.length > 0) {
               verifierRoute = new VerifierRoute(attestationCred.url, attestationCred.apiKey);
            } else if (defaultRoute) {
               verifierRoute = defaultRoute;
            }
            if (!verifierRoute) {
               throw new Error(`Empty configuration for source ${sourceName}`);
            }
            for (let attestationTypeName of attestationCred.attestationTypes) {
               let route = this.getRouteEntry(sourceName, attestationTypeName);
               if (!route) {
                  throw new Error(`Non-existent route entry for pair ('${sourceName}','${attestationTypeName}')`);
               }
               if (route !== EMPTY_VERIFIER_ROUTE) {
                  throw new Error(`Duplicate route entry for pair ('${sourceName}','${attestationTypeName}')`);
               }
               this.setRouteEntry(sourceName, attestationTypeName, verifierRoute);
            }
         }
      }

      // Check if everything is configured
      if (process.env.REQUIRE_ALL_ROUTES_CONFIGURED) {
         for (let definition of definitions) {
            let attestationTypeName = definition.name;
            for (let source of definition.supportedSources) {
               let sourceName = getSourceName(source);
               let sourceMap = this.routeMap.get(sourceName);
               if (sourceMap.get(definition.name) === EMPTY_VERIFIER_ROUTE) {
                  throw new Error(`The route is not set for pair ('${sourceName}','${attestationTypeName}')`);
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

   private transformRoute(route: string) {
      if(this.forcePrepareRoute) {
         if(route.endsWith("/")) return `${route}prepare`;
         return `${route}/prepare`
      }
      return route;
   }
   /**
    * Verifies attestation by sending the request to relevant verifier (including this.sourcerouter. one).
    * @param attestation 
    * @param recheck 
    * @returns 
    */
   public async verifyAttestation(attestation: Attestation) {
      let route = this.getRoute(attestation);
      if (route) {
         const attestationRequest = {
            request: attestation.data.request
         } as AttestationRequest;
         
         const resp = await retry(
            `VerifierRouter::verifyAttestation`,
            async () => axios.post(
               this.transformRoute(route.url),
               attestationRequest,
               {
                  headers: {
                     "x-api-key": route.apiKey
                  }
               }
            )
         );

         let apiResponse = resp.data as ApiResponse<Verification<any, any>>;
         if (apiResponse.status === 'OK') {
            return apiResponse.data;
         }
         throw new ApiResponseError(apiResponse.errorMessage);
      }
      throw new InvalidRouteError(`Invalid route.`);
   }
}