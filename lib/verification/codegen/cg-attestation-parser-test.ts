import fs from "fs";
import prettier from 'prettier';
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_REQ_PARSER_TEST_FILE, DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  GENERATED_TEST_ROOT,
  PRETTIER_SETTINGS,
  WEB3_HASH_PREFIX_FUNCTION
} from "./cg-constants";

function genItForAttestationParser(definition: AttestationTypeScheme) {
  const sourceIds = definition.supportedSources;
  return `
it("Should encode and decode for '${definition.name}'", async function () { 
	for(let sourceId of [${sourceIds}]) {
		let randomRequest = getRandomRequestForAttestationTypeAndSourceId(${
    definition.id
  } as AttestationType, sourceId as SourceId) as ${ATTESTATION_TYPE_PREFIX}${definition.name};

		let bytes = encodeRequest(randomRequest);
		let parsedRequest = parseRequest(bytes);
		assert(equalsRequest(randomRequest, parsedRequest));
	}
});`;
}

export function createAttestationParserTest(definitions: AttestationTypeScheme[]) {
  const arImports = definitions.map((definition) => `${ATTESTATION_TYPE_PREFIX}${definition.name}`).join(",\n");
  const dhImports = definitions.map((definition) => `${DATA_HASH_TYPE_PREFIX}${definition.name}`).join(",\n");
  const hashFunctionsImports = definitions.map((definition) => `${WEB3_HASH_PREFIX_FUNCTION}${definition.name}`).join(",\n");

  const itsForDefinitions = definitions.map((definition) => genItForAttestationParser(definition)).join("\n");
  const content = `${DEFAULT_GEN_FILE_HEADER}
import { 
${arImports} 
} from "../../lib/verification/generated/attestation-request-types";
import { AttestationType } from "../../lib/verification/generated/attestation-types-enum";
import { SourceId } from "../../lib/verification/sources/sources";
import { 
	getRandomRequestForAttestationTypeAndSourceId
} from "../../lib/verification/generated/attestation-random-utils";
import { encodeRequest } from "../../lib/verification/generated/attestation-request-encode";
import { parseRequest } from "../../lib/verification/generated/attestation-request-parse";
import { equalsRequest } from "../../lib/verification/generated/attestation-request-equals";

describe("Attestestation Request Parser", function () {

${itsForDefinitions}

});  
`;

  if (!fs.existsSync(GENERATED_TEST_ROOT)) {
    fs.mkdirSync(GENERATED_TEST_ROOT, { recursive: true });
  }
  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(`${GENERATED_TEST_ROOT}/${ATT_REQ_PARSER_TEST_FILE}`, prettyContent, "utf8");
}
