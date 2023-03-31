import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

/**
 * Validator constraint if the given value is a number or 0x-prefixed hexadecimal string.
 */
@ValidatorConstraint({ name: "string-or-number", async: false })
export class IsNumberLike implements ValidatorConstraintInterface {
  /**
   * Validates if the given value is a number or 0x-prefixed hexadecimal string.
   * @param text
   * @param args
   * @returns
   */
  validate(text: any, args: ValidationArguments) {
    return typeof text === "number" || (typeof text === "string" && /^0x[0-9a-f]+$/i.test(text));
  }

  /**
   * Returns the default error message template.
   * @param args
   * @returns
   */
  defaultMessage(args: ValidationArguments) {
    return "($property) value ($value) is not number or 0x-prefixed hexadecimal string";
  }
}
