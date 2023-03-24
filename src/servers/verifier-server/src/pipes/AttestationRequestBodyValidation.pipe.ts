import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AttestationType } from "../../../../verification/generated/attestation-types-enum";
import { ARBalanceDecreasingTransaction, ARConfirmedBlockHeightExists, ARPayment, ARReferencedPaymentNonexistence } from "../dtos/v-request-types.dto";

/**
 * Validates the attestation request body. Supports 4 attestation types (Payment, BalanceDecreasingTransaction, ConfirmedBlockHeightExists, ReferencedPaymentNonexistence).
 */
@Injectable()
export class AttestationRequestValidationPipe implements PipeTransform {
  async transform(value: any, { metatype, type }: ArgumentMetadata): Promise<any> {
    if (this.isEmpty(value)) {
      throw new BadRequestException(`Validation failed: No body submitted`);
    }
    if (value.attestationType === undefined) {
      throw new BadRequestException(`Validation failed: 'attestationType' field is missing`);
    }
    if (type === "body") {
      let object;
      switch (value.attestationType) {
        case AttestationType.Payment:
          object = plainToInstance(ARPayment, value);
          break;
        case AttestationType.BalanceDecreasingTransaction:
          object = plainToInstance(ARBalanceDecreasingTransaction, value);
          break;
        case AttestationType.ConfirmedBlockHeightExists:
          object = plainToInstance(ARConfirmedBlockHeightExists, value);
          break;
        case AttestationType.ReferencedPaymentNonexistence:
          object = plainToInstance(ARReferencedPaymentNonexistence, value);
          break;
        default:
          throw new BadRequestException(`Validation failed: 'attestationType' field is invalid: ${value.attestationType}`);
      }
      const errors = await validate(object);

      if (errors.length > 0) {
        throw new BadRequestException(`Validation failed ${this.formatErrors(errors)}`);
      }
    }
    return value;
  }

  /**
   * Checks if the object is empty
   * @param obj
   * @returns
   */
  private isEmpty(obj: any) {
    return Object.keys(obj).length === 0;
  }

  /**
   * Formats the errors array into a string
   * @param errors
   * @returns
   */
  private formatErrors(errors: any[]) {
    return errors
      .map((err) => {
        for (let property in err.constraints) {
          return err.constraints[property];
        }
      })
      .join(", ");
  }
}
