import axios from "axios";
import { Attestation } from "../../attester/Attestation";
import { AttestationDefinitionStore } from "../../external-libs/AttestationDefinitionStore";
import { AttestationResponse } from "../../external-libs/AttestationResponse";
import { retry } from "../../utils/helpers/promiseTimeout";
import { AttLogger, getGlobalLogger } from "../../utils/logging/logger";
import { VerifierAttestationTypeRouteConfig } from "./configs/VerifierAttestationTypeRouteConfig";
import { VerifierRouteConfig } from "./configs/VerifierRouteConfig";
import { EncodedRequestBody } from "../../servers/verifier-server/src/dtos/generic/generic.dto";
const VERIFIER_TIMEOUT = 10000;
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
   * Auxiliary function. Returns VerifierRoute for given @param sourceName and @param attestationTypeName
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

  /**
   * Checks if the VerifierRouter supports attestation @param attestationType for chain with @param sourceId
   */
  public isSupported(sourceId: string, attestationType: string): boolean {
    const routeEntry = this.getRouteEntry(sourceId, attestationType);
    if (!routeEntry || routeEntry === EMPTY_VERIFIER_ROUTE) return false;
    return true;
  }

  /**
   * Auxiliary function. Sets VerifierRoute for given @param sourceName and @param attestationTypeName
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
  public async initialize(config: VerifierRouteConfig, dataStore: AttestationDefinitionStore, logger?: AttLogger) {
    if (this._initialized) {
      throw new Error("Already initialized");
    }
    this.logger = logger ?? getGlobalLogger();
    this.config = config;
    if (!this.config) {
      throw new Error(`Missing configuration`);
    }

    this.routeMap = new Map<string, Map<string, VerifierAttestationTypeRouteConfig>>(); //different type as promised

    // set up all possible routes
    for (let definition of dataStore.definitions.values()) {
      let attestationTypeName = definition.name;
      for (let sourceName of definition.supported.split(",").map(x => x.trim())) {
        let tmp = this.routeMap.get(sourceName);
        if (!tmp) {
          tmp = new Map<string, VerifierAttestationTypeRouteConfig>();
        }
        this.routeMap.set(sourceName, tmp);
        this.logger.debug(`initialize.router[${config.startRoundId}](${sourceName},${attestationTypeName})`);
        if (tmp.get(attestationTypeName)) {
          throw new Error(`Duplicate configuration (${sourceName},${attestationTypeName})`);
        }
        tmp.set(attestationTypeName, EMPTY_VERIFIER_ROUTE);
      }
    }
    // Check credentials against all possible routes and setup routes from credentials
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
      for (let definition of dataStore.definitions.values()) {
        let attestationTypeName = definition.name;
        for (let sourceName of definition.supported.split(",").map(x => x.trim())) {
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
    let route = this.getRouteEntry(attestation.data.sourceId, attestation.data.type);
    if (route === EMPTY_VERIFIER_ROUTE) {
      return null;
    }
    return route;
  }

  private transformRoute(route: string) {
    if (this.forcePrepareRoute) {
      if (route.endsWith("/")) return `${route}prepare`;
      return `${route}/prepare`;
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
        abiEncodedRequest: attestation.data.request,
      } as EncodedRequestBody;

      // Can throw exception
      const resp = await retry(
        `VerifierRouter::verifyAttestation`,
        async () =>
          axios.post(this.transformRoute(route.url), attestationRequest, {
            headers: {
              "x-api-key": route.apiKey,
            },
          }),
        VERIFIER_TIMEOUT
      );

      return resp.data as AttestationResponse<any>;
    }
    throw new InvalidRouteError(`Invalid route.`);
  }
}
