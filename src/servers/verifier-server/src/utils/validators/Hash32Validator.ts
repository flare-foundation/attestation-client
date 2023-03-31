import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

/**
 * Validator constraint if the given value is a 0x-prefixed hexadecimal string representing 32 bytes.
 */
@ValidatorConstraint({ name: "hash-32", async: false })
export class IsHash32 implements ValidatorConstraintInterface {
  /**
   * Validates if the given value is a 0x-prefixed hexadecimal string representing 32 bytes.
   * @param text
   * @param args
   * @returns
   */
  validate(text: any, args: ValidationArguments) {
    return typeof text === "string" && /^0x[0-9a-f]{64}$/i.test(text);
  }

  /**
   * Returns the default error message template.
   * @param args
   * @returns
   */
  defaultMessage(args: ValidationArguments) {
    return "($property) value ($value) is not 0x-prefixed hexadecimal string representing 32 bytes";
  }
}
