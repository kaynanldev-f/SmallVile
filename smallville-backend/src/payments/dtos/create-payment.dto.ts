import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  AVAILABLE_PAYMENT_METHODS,
  CARD_PAYMENT_METHODS,
  isPaymentMethodAvailable,
  PaymentMethod,
} from '../enums/payment-method.enum';
import { IsValidCardExpiry } from './is-valid-card-expiry.validator';
import { PAYMENT_MESSAGE } from '../messages/payments.message';

// Os campos do cartão só são exigidos quando o método for de cartão E o
// cartão estiver habilitado.
const shouldValidateCardFields = (dto: CreatePaymentDto) =>
  CARD_PAYMENT_METHODS.includes(dto.method) &&
  isPaymentMethodAvailable(dto.method);

export class CreatePaymentDto {
  @ApiProperty({ description: 'Id do pedido/reserva temporária a ser pago' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({
    enum: PaymentMethod,
    description:
      'Forma de pagamento. Apenas as formas em AVAILABLE_PAYMENT_METHODS são aceitas: ' +
      'cartão de crédito/débito existem no contrato, mas ainda não podem concluir uma compra.',
  })
  @IsEnum(PaymentMethod, { message: PAYMENT_MESSAGE.PAYMENT_METHOD_REQUIRED })
  @IsIn(AVAILABLE_PAYMENT_METHODS, {
    message: PAYMENT_MESSAGE.PAYMENT_METHOD_UNAVAILABLE,
  })
  method: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty({ example: 'João Silva', required: false })
  @ValidateIf(shouldValidateCardFields)
  @IsString({ message: PAYMENT_MESSAGE.CARDHOLDER_NAME_REQUIRED })
  cardHolderName?: string;

  @ApiProperty({ example: '4111111111111111', required: false })
  @ValidateIf(shouldValidateCardFields)
  @Matches(/^\d{13,19}$/, { message: PAYMENT_MESSAGE.CARD_NUMBER_INVALID })
  cardNumber?: string;

  @ApiProperty({ example: '12/28', required: false })
  @ValidateIf(shouldValidateCardFields)
  @IsValidCardExpiry({ message: PAYMENT_MESSAGE.CARD_EXPIRY_INVALID })
  cardExpiry?: string;

  @ApiProperty({ example: '123', required: false })
  @ValidateIf(shouldValidateCardFields)
  @Matches(/^\d{3,4}$/, { message: PAYMENT_MESSAGE.CVV_INVALID })
  cvv?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 12 })
  @ValidateIf(
    (dto: CreatePaymentDto) =>
      dto.method === PaymentMethod.CREDIT_CARD &&
      isPaymentMethodAvailable(dto.method),
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  installments?: number;
}
