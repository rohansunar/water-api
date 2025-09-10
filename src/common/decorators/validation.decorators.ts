import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidUUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return typeof value === 'string' && uuidRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUID`;
        },
      },
    });
  };
}

export function IsValidPincode(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPincode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const pincodeRegex = /^[1-9][0-9]{5}$/;
          return typeof value === 'string' && pincodeRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid 6-digit Indian pincode`;
        },
      },
    });
  };
}

export function IsValidLatitude(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidLatitude',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'number' && value >= -90 && value <= 90;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid latitude between -90 and 90`;
        },
      },
    });
  };
}

export function IsValidLongitude(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidLongitude',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'number' && value >= -180 && value <= 180;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid longitude between -180 and 180`;
        },
      },
    });
  };
}

export function IsPositiveNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'number' && value > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive number`;
        },
      },
    });
  };
}

export function IsValidAmount(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidAmount',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            typeof value === 'number' && value >= 0 && Number.isFinite(value)
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid amount (non-negative number)`;
        },
      },
    });
  };
}

export function IsValidQuantity(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidQuantity',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            value > 0 &&
            value <= 100
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a positive integer between 1 and 100`;
        },
      },
    });
  };
}
