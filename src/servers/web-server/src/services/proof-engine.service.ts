import { unPrefix0x } from "@flarenetwork/mcc";
import { Inject, Injectable } from "@nestjs/common";
import { InjectEntityManager } from "@nestjs/typeorm";
import { EntityManager } from "typeorm";
import { DBAttestationRequest } from "../../../../entity/attester/dbAttestationRequest";
import { DBVotingRoundResult } from "../../../../entity/attester/dbVotingRoundResult";
import { MerkleTree } from "../../../../external-libs/MerkleTree";
import { SystemStatus } from "../dtos/SystemStatus.dto";
import { VotingRoundRequest } from "../dtos/VotingRoundRequest.dto";
import { VotingRoundResult } from "../dtos/VotingRoundResult.dto";
import { ServerConfigurationService } from "./server-configuration.service";

@Injectable()
export class ProofEngineService {
  constructor(
    @Inject("SERVER_CONFIG") private configService: ServerConfigurationService,
    @InjectEntityManager("attesterDatabase") private manager: EntityManager
  ) {}

  // Once round data are finalized, they do not change.
  // Caches are cleared when their size reaches limit and another round is cached.
  private cache = new Map<Number, VotingRoundResult[]>();
  private requestCache = new Map<Number, VotingRoundRequest[]>();

  private CACHE_SIZE_LIMIT = 1000;

  /**
   * Returns all vote results for round, if they can be revealed.
   * The results are calculated and cached.
   * @param roundId
   * @returns
   */
  public async getVoteResultsForRound(roundId: number): Promise<VotingRoundResult[] | null> {
    if (this.cache[roundId]) {
      return this.cache[roundId];
    }

    if (!this.canReveal(roundId)) {
      throw new Error(`Votes for round ${roundId} can not be revealed.`);
    }

    const query = this.manager.createQueryBuilder(DBVotingRoundResult, "voting_round_result").andWhere("voting_round_result.roundId = :roundId", { roundId });
    const results = await query.getMany();

    const tree = new MerkleTree(results.map((result) => result.hash));
    const hashMap = new Map<string, string[]>();
    for (let j = 0; j < tree.hashCount; j++) {
      const proof = tree.getProof(j);
      const hash = tree.getHash(j);
      hashMap.set(hash, proof);
    }

    const finalResult: VotingRoundResult[] = [];
    for (const res of results) {
      const request = JSON.parse(res.request);
      const requestBytes = res.requestBytes;
      const response = JSON.parse(res.response);
      const hash = res.hash;
      const roundId = res.roundId;
      const merkleProof = hashMap.get(hash);
      finalResult.push({ roundId, hash, requestBytes, request, response, merkleProof } as VotingRoundResult);
    }

    //check if cache needs to be cleared
    this.checkCacheLimit(this.cache);
    // cache once finalized
    if (finalResult.length > 0) {
      this.cache[roundId] = finalResult;
    } else {
      const maxRound = await this.maxRoundId();
      if (maxRound > roundId) {
        this.cache[roundId] = [];
      }
    }

    return finalResult;
  }

  /**
   * Returns proof data for specific attestation request.
   * Attestation request is identified by the request data and round id in which it was submitted.
   * @param roundId
   * @param requestBytes
   * @returns
   */
  public async getSpecificProofForRound(roundId: number, requestBytes: string): Promise<VotingRoundResult | null> {
    const roundData = await this.getVoteResultsForRound(roundId);
    const lowRequestBytes = unPrefix0x(requestBytes).toLowerCase();
    for (const proof of roundData) {
      if (unPrefix0x(proof.requestBytes) === lowRequestBytes) {
        return proof;
      }
    }
    throw new Error("Proof not found in the round.");
  }

  /**
   * Returns all requests for a specific round if they can be revealed subject to timing
   * @param roundId
   * @returns
   */
  public async getRequestsForRound(roundId: number): Promise<VotingRoundRequest[] | null> {
    if (this.requestCache[roundId]) {
      return this.requestCache[roundId];
    }

    if (!this.canReveal(roundId)) {
      throw new Error(`Requests for round ${roundId} can not be revealed.`);
    }

    const query = this.manager
      .createQueryBuilder(DBAttestationRequest, "attestation_request")
      .andWhere("attestation_request.roundId = :roundId", { roundId })
      .select("attestation_request.requestBytes", "requestBytes")
      .addSelect("attestation_request.verificationStatus", "verificationStatus")
      .addSelect("attestation_request.attestationStatus", "attestationStatus")
      .addSelect("attestation_request.exceptionError", "exceptionError");

    const result = await query.getRawMany();

    result.forEach((item) => {
      item.roundId = roundId;
      if (item.exceptionError === "") {
        item.exceptionError = undefined;
      }
      if (!item.attestationStatus) {
        item.attestationStatus = undefined;
      }
    });

    let finalResult = result as any as VotingRoundRequest[];

    //check if cache needs to be cleared
    this.checkCacheLimit(this.requestCache);

    // cache once finalized
    if (finalResult.length > 0) {
      this.requestCache[roundId] = finalResult;
    } else {
      let maxRound = await this.maxRoundId();
      if (maxRound > roundId) {
        this.requestCache[roundId] = [];
      }
    }
    return finalResult;
  }

  /**
   * Returns true if the voting data for @param roundId can be revealed.
   * @param roundId
   * @returns
   */
  public canReveal(roundId: number) {
    let current = this.configService.epochSettings.getCurrentEpochId();
    return current >= roundId + 2; // we must be in the reveal phase or later for a given roundId
  }

  /**
   * Calculates maximum round id for submitted vote results in the database.
   * @returns
   */
  private async maxRoundId() {
    let maxQuery = this.manager.createQueryBuilder(DBVotingRoundResult, "voting_round_result").select("MAX(voting_round_result.roundId)", "max");
    let res = await maxQuery.getRawOne();
    return res?.max;
  }

  /**
   * Returns current buffer number and latest available round id (subject to revealing limitations)
   * @returns
   */
  public async systemStatus(): Promise<SystemStatus> {
    let currentBufferNumber = this.configService.epochSettings.getCurrentEpochId();
    let latestAvailableRoundId = await this.maxRoundId();
    // Do not disclose the latest available round, if it is too early
    if (latestAvailableRoundId + 1 === currentBufferNumber) {
      latestAvailableRoundId = currentBufferNumber - 2;
    }
    return {
      currentBufferNumber,
      latestAvailableRoundId,
    };
  }

  private checkCacheLimit<K, V>(_cache: Map<K, V>): void {
    if (_cache.size > this.CACHE_SIZE_LIMIT) _cache.clear();
  }
}
