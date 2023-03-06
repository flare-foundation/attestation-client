import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import { ApiResponseWrapper } from "..";

function arrayResults<TModel extends Type<any>>(model: TModel) {
  return {
    properties: {
      data: {
        type: "array",
        items: { $ref: getSchemaPath(model) },
      },
    },
  };
}

function flatResults<TModel extends Type<any>>(model: TModel) {
  return {
    properties: {
      data: { $ref: getSchemaPath(model) },
    },
  };
}

export function ApiResponseWrapperDec<TModel extends Type<any>>(model: TModel, isArray: boolean = false) {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [{ $ref: getSchemaPath(ApiResponseWrapper) }, isArray ? arrayResults(model) : flatResults(model)],
      },
    }),
    ApiExtraModels(model),
    ApiExtraModels(ApiResponseWrapper)
  );
}
