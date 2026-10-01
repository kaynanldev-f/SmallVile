import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsValidCardExpiry(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidCardExpiry',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
          if (!match) return false;

          const month = Number(match[1]);
          const year = 2000 + Number(match[2]);

          const expiryDate = new Date(year, month, 0, 23, 59, 59);
          return expiryDate.getTime() >= Date.now();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} inválido ou vencido`;
        },
      },
    });
  };
}
