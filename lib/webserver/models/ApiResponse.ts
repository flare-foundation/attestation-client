// import { ApiDefaultResponseStatusEnum } from "../af-coffee-app/apiDefaultResponse";
// import { ApiValidationErrorDetails } from "../af-coffee-app/apiValidationErrorDetails";
// import { DBDocument } from "./DBDocument";

/**
 * All possible values of status.
 */
export type ApiDefaultResponseStatusEnum =
    'OK'
    | 'ERROR'
    | 'REQUEST_BODY_ERROR'
    | 'VALIDATION_ERROR'
    | 'TOO_MANY_REQUESTS'
    | 'UNAUTHORIZED'
    | 'AUTH_ERROR'
    | 'UPSTREAM_HTTP_ERROR'
    | 'INVALID_REQUEST'
    | 'NOT_IMPLEMENTED'
    | 'PENDING'


export interface ApiValidationErrorDetails {
    className?: string;
    fieldErrors?: { [key: string]: string; };
}

function removeKey(obj: any, key: string ): any {
    return obj !== Object(obj)
        ? obj
        : Array.isArray(obj)
            ? obj.map(item => removeKey(item, key))
            : Object.keys(obj)
                .filter(k => k !== key)
                .reduce((acc, x) => Object.assign(acc, { [x]: removeKey(obj[x], key) }), {});
}

export class ApiResponse<T> {
    data?: T;
    /**
     * Optional details for unexpected error responses.
     */
    errorDetails?: string;
    /**
     * Simple message to explain client developers the reason for error.
     */
    errorMessage?: string;
    /**
     * Response status. OK for successful reponses.
     */
    status: ApiDefaultResponseStatusEnum;
    validationErrorDetails?: ApiValidationErrorDetails;

    // constructor(data: T, status?: ApiDefaultResponseStatusEnum, errorMessage?: string, errorDetails?: any) {
    //     this.status = status || 'OK'
    //     this.data = data
    //     this.errorMessage = errorMessage;
    //     this.errorDetails = errorDetails
    // }

    constructor(data: T, status?: ApiDefaultResponseStatusEnum, errorMessage?: string, errorDetails?: any) {
        this.status = status || 'OK'
        this.data = data
        this.errorMessage = errorMessage;
        this.errorDetails = errorDetails
    }

}

export function handleApiResponse<T>(action: Promise<T>): Promise<ApiResponse<T>> {
    return action.then(
        (resp: T) => new ApiResponse<T>(resp),
        (reason: any) => {
            throw new ApiResponse<T>(undefined as any, 'ERROR', '' + reason, reason)
        }
    )
}

// export function getResponseValue<T>(response: Promise<DBDocument<T>>): Promise<T> {
//     return response.then(
//         (doc: DBDocument<T>) => doc.value,
//         (reason: any) => Promise.reject(reason)
//     )
// }