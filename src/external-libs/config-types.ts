/**
 * ABI definition fields for request, response and proof of an attestation type.
 */
export interface ABIDefinitions {
    /**
     * JSON ABI definition for attestation type request
     */
    requestAbi: any;
    /**
     * JSON ABI definition for attestation type response
     */
    responseAbi: any;
    /**
     * JSON ABI definition for attestation type proof
     */
    proofAbi: any;
}

/**
 * Metadata for basic and ABI configs for an attestation type.
 */
export interface TypeRecord extends ABIDefinitions {
    /**
     * Attestation type name. Must be unique and in PascalCase (also known as UpperCamelCase, hence CamelCase with the first letter capitalized).
     */
    name: string;
    /**
     * Full comment for the attestation type as provided in the Solidity definition.
     */
    fullComment: string;
    /**
     * Description of the attestation type. Used also in the generated documentation.
     */
    description: string;
    /**
     * Comma separated list of supported sources for the attestation type. The strings defining types are community defined.
     * Currently, the following are supported: BTC, DOGE, XRP, ETH
     */
    supported: string;
    /**
     * Text describing the attestation type verification rules. In Markdown format.
     */
    verification: string;
    /**
     * The description of how lowest used timestamp is obtained from the attestation response.
     * Usually a field name.
     */
    lut: string;
    /**
     * Metadata about the struct describing attestation request.
     */
    request: StructRecord;
    /**
     * Metadata about the struct describing attestation response.
     */
    response: StructRecord;
    /**
     * Metadata about the struct describing attestation proof.
     */
    proof: StructRecord;
    /**
     * Metadata about the struct describing attestation request body.
     */
    requestBody: StructRecord;
    /**
     * Metadata about the struct describing attestation response body.
     */
    responseBody: StructRecord;
    /**
     * List of metadata objects describing structs used in attestation request.
     */
    requestStructs: StructRecord[];
    /**
     * List of metadata objects describing structs used in attestation response.
     */
    responseStructs: StructRecord[];
}

/**
 * Metadata for a struct parameter from a Solidity definition of attestation types.
 */
export interface ParamRecord {
    /**
     * Field name.
     */
    name: string;
    /**
     * Field type as defined in Solidity.
     */
    type: string;
    /**
     * Short field type (omitting position prefixes for structs)
     */
    typeSimple?: string;
    /**
     * Field description. Possibly multiline.
     */
    comment: string;
}

/**
 * Metadata for a struct from a Solidity definition of attestation types.
 */
export interface StructRecord {
    /**
     * Struct name.
     */
    name: string;
    /**
     * Full comment for the struct as provided in the Solidity definition.
     */
    fullComment: string;
    /**
     * Struct description. Possibly multiline, can use Markdown.
     */
    description: string;
    /**
     * Additional markdown text to be used above the struct fields description in documentation.
     */
    above?: string;
    /**
     * Additional markdown text to be used below the struct fields description in documentation.
     */
    below?: string;
    /**
     * List of metadata objects describing struct fields.
     */
    params: ParamRecord[];
}
