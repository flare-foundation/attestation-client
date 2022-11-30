import { Controller, Get, Path, Route, Tags, Request } from "tsoa";
import { Factory, Inject, Singleton } from "typescript-ioc";
import { DBVotingRoundResult } from "../../entity/attester/dbVotingRoundResult";
import { ServiceStatus } from "../dto/ServiceStatus";
import { SystemStatus } from "../dto/SystemStatus";
import { VotingRoundResult } from "../dto/VotingRoundResult";
import { ProofEngine } from "../engines/proofEngine";
import { ApiResponse, handleApiResponse } from "../models/ApiResponse";
import * as express from "express";

@Tags("Status")
@Route("api/status")
@Singleton
@Factory(() => new StatusController())
export class StatusController extends Controller {
  @Inject
  private proofEngine: ProofEngine;

  constructor() {
    super();
  }

  @Get("services")
  public async serviceStatus(): Promise<ApiResponse<ServiceStatus>> {
    return handleApiResponse(this.proofEngine.serviceStatus());
  }

  @Get("services-html")
  public async serviceStatusHtml(@Request() request: express.Request): Promise<string> {
    const result = await this.proofEngine.serviceStatusHtml();
    const response = (<any>request).res as express.Response;
    this.setStatus(200);
    response.contentType("text/html");
    response.send(result).end();
    return null; // Found via #44
  }
}
