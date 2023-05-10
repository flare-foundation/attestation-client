import fs from "fs";
import prettier from "prettier";
import { AttestationTypeScheme } from "../attestation-types/attestation-types";
import {
  ATTESTATION_TYPE_PREFIX,
  ATT_REQ_PARSER_TEST_FILE,
  DATA_HASH_TYPE_PREFIX,
  DEFAULT_GEN_FILE_HEADER,
  GENERATED_TEST_ROOT,
  PRETTIER_SETTINGS,
  WEB3_HASH_PREFIX_FUNCTION,
} from "./cg-constants";

function genItForAttestationParser(definition: AttestationTypeScheme) {
  const sourceIds = definition.supportedSources;
  return `
it("Should encode and decode for '${definition.name}'", async function () { 
	for(const sourceId of [${sourceIds}]) {
		const randomRequest = getRandomRequestForAttestationTypeAndSourceId(${definition.id} as AttestationType, sourceId as SourceId) as ${ATTESTATION_TYPE_PREFIX}${definition.name};

    const bytes = defStore.encodeRequest(randomRequest);
    const parsedRequest = defStore.parseRequest(bytes);
		assert(defStore.equalsRequest(randomRequest, parsedRequest));
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
} from "../../src/verification/generated/attestation-request-types";
import { AttestationType } from "../../src/verification/generated/attestation-types-enum";
import { SourceId } from "../../src/verification/sources/sources";
import { 
	getRandomRequestForAttestationTypeAndSourceId
} from "../../src/verification/generated/attestation-random-utils";
import { getTestFile } from "../test-utils/test-utils";
import { AttestationDefinitionStore } from "../../src/verification/attestation-types/AttestationDefinitionManager";

describe(\`Attestestation Request Parser (\$\{getTestFile(__filename)\})\`, function () {

const defStore = new AttestationDefinitionStore();
before(async function () {
  await defStore.initialize();
});

${itsForDefinitions}

});  
`;

  if (!fs.existsSync(GENERATED_TEST_ROOT)) {
    fs.mkdirSync(GENERATED_TEST_ROOT, { recursive: true });
  }
  const prettyContent = prettier.format(content, PRETTIER_SETTINGS);
  fs.writeFileSync(`${GENERATED_TEST_ROOT}/${ATT_REQ_PARSER_TEST_FILE}`, prettyContent, "utf8");
}
