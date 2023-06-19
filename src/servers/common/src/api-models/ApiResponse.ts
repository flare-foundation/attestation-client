import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AttLogger } from "../../../../utils/logging/logger";

/**
 * All possible values of status.
 */
// export type ApiDefaultResponseStatusEnum =
//   | "OK"
//   | "ERROR"
//   | "REQUEST_BODY_ERROR"
//   | "VALIDATION_ERROR"
//   | "TOO_MANY_REQUESTS"
//   | "UNAUTHORIZED"
//   | "AUTH_ERROR"
//   | "UPSTREAM_HTTP_ERROR"
//   | "INVALID_REQUEST"
//   | "NOT_IMPLEMENTED"
//   | "PENDING";

export enum ApiResStatusEnum {
  OK = "OK",
  ERROR = "ERROR",
  REQUEST_BODY_ERROR = "REQUEST_BODY_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  UNAUTHORIZED = "UNAUTHORIZED",
  AUTH_ERROR = "AUTH_ERROR",
  UPSTREAM_HTTP_ERROR = "UPSTREAM_HTTP_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  PENDING = "PENDING",
}

export class ApiValidationErrorDetails {
  @ApiPropertyOptional()
  className?: string;

  @ApiPropertyOptional()
  fieldErrors?: { [key: string]: string };
}

export class ApiResponseWrapper<T> {
  data?: T;

  // /**
  //  * Optional details for unexpected error responses.
  //  */
  // @ApiPropertyOptional()
  // errorDetails?: string;

  /**
   * Simple message to explain client developers the reason for error.
   */
  @ApiPropertyOptional()
  errorMessage?: string;

  /**
   * Response status. OK for successful responses.
   */
  @ApiProperty({ enum: ApiResStatusEnum })
  status: ApiResStatusEnum;

  @ApiPropertyOptional()
  validationErrorDetails?: ApiValidationErrorDetails;

  constructor(data: T, status?: ApiResStatusEnum, errorMessage?: string, errorDetails?: any) {
    this.status = status || ApiResStatusEnum.OK;
    this.data = data;
    this.errorMessage = errorMessage;
    // this.errorDetails = errorDetails;
  }
}

/**
 * Intercepts response and wraps it in ApiResponseWrapper. If exception is thrown it is logged and
 * ApiResponseWrapper with status ERROR is returned.
 * If sanitize is true, the error message is sanitized.
 * @param action
 * @param logger
 * @returns
 */
export async function handleApiResponse<T>(action: Promise<T>, logger?: AttLogger, sanitize = true): Promise<ApiResponseWrapper<T>> {
  try {
    const resp = await action;
    return new ApiResponseWrapper<T>(resp);
  } catch (reason) {
    if (logger) {
      logger.error(`Intercepted response error: ${reason}`);
    }
    if (sanitize) {
      const message = reason.message ?? "Error while processing request";
      return new ApiResponseWrapper<T>(undefined as any, ApiResStatusEnum.ERROR, message, message);
    }
    return new ApiResponseWrapper<T>(undefined as any, ApiResStatusEnum.ERROR, "" + reason, reason);
  }
}
