import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const validationExceptionFactory = (errors: ValidationError[]) => {
  const messages = errors.flatMap((error) =>
    Object.values(error.constraints || {}),
  );
  return new BadRequestException({
    message: messages,
  });
};
