import { ApiProperty } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { USER_MESSAGES } from '../messages/users.message';
import { capitalizeName } from 'src/common/utils/name-validation';
import { Transform } from 'class-transformer';
import { UserGender } from '../enums/user-gender.enum';
import { BrazilState } from '../../common/enums/brazil-states.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'João' })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Nome') })
  @Length(2, 50, { message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Nome', 2, 50) })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: USER_MESSAGES.FIELD_ONLY_LETTERS_SPACES('Nome'),
  })
  @Transform(({ value }: { value: string }) => capitalizeName(value))
  name: string;

  @ApiProperty({ example: 'Silva' })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Sobrenome') })
  @Length(2, 50, {
    message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Sobrenome', 2, 50),
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, {
    message: USER_MESSAGES.FIELD_ONLY_LETTERS_SPACES('Sobrenome'),
  })
  @Transform(({ value }: { value: string }) => capitalizeName(value))
  surname: string;

  @ApiProperty({ example: '123.456.789-09' })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('CPF') })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'CPF',
      'o formato 000.000.000-00',
    ),
  })
  cpf: string;

  @ApiProperty({
    example: '01/01/2000',
    description: 'Data de nascimento no formato brasileiro DD/MM/AAAA',
  })
  @IsString({ message: 'A data de nascimento deve ser uma string.' })
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'A data de nascimento deve estar no formato DD/MM/AAAA.',
  })
  @Transform(({ value }: { value: string }) => {
    return value ? value.trim() : value;
  })
  birthDate: string;

  @ApiProperty({ example: 'email@dominio.com' })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Email') })
  @IsEmail({}, { message: USER_MESSAGES.EMAIL_INVALID_FORMAT })
  @MaxLength(50, { message: USER_MESSAGES.EMAIL_MAX_LENGTH })
  email: string;

  @ApiProperty({ example: 'Teste123@' })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Senha') })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Senha') })
  @Length(6, 20, {
    message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Senha', 6, 20),
  })
  @Matches(/^\S+$/, { message: USER_MESSAGES.PASSWORD_NO_SPACES })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/,
    { message: USER_MESSAGES.PASSWORD_RULES },
  )
  password: string;

  @ApiProperty({ example: 'Teste123@' })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Confirmação de Senha') })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Confirmação de Senha') })
  confirmPassword: string;

  @ApiProperty({ example: '(41)99999-9999' })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Telefone') })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Telefone') })
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-\d{4}$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Telefone',
      'o formato (XX) 99999-9999',
    ),
  })
  phone: string;

  @ApiProperty({ example: '80010-000' })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('CEP') })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('CEP') })
  @Matches(/^\d{5}-\d{3}$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY('CEP', 'o formato 00000-000'),
  })
  cep: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Endereço') })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/,.]+$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Endereço',
      'letras, números, espaços, hífen (-), barra (/), ponto (.) e vírgula (,)',
    ),
  })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Endereço') })
  @Length(2, 50, {
    message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Endereço', 2, 50),
  })
  @Transform(({ value }: { value: string }) => capitalizeName(value))
  address: string;

  @ApiProperty({ example: '123' })
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Número') })
  @IsOptional()
  @Length(1, 10, {
    message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Número', 1, 10),
  })
  @Matches(/^\d+$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY('Número', 'números'),
  })
  number?: string;

  @ApiProperty({ example: 'Apto 101', required: false })
  @Length(2, 50, {
    message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Complemento', 2, 50),
  })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/,.]+$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Complemento',
      'letras, números, espaços, hífen (-), barra (/), ponto (.) e vírgula (,)',
    ),
  })
  @IsOptional()
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Complemento') })
  @Transform(({ value }: { value: string }) => capitalizeName(value))
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Bairro') })
  @Length(2, 50, {
    message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Bairro', 2, 50),
  })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/,.]+$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Bairro',
      'letras, números, espaços, hífen (-), barra (/), ponto (.) e vírgula (,)',
    ),
  })
  @Transform(({ value }: { value: string }) => capitalizeName(value))
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Bairro') })
  neighborhood: string;

  @ApiProperty({ example: 'Curitiba' })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Cidade') })
  @Length(2, 50, {
    message: USER_MESSAGES.FIELD_LENGTH_BETWEEN('Cidade', 2, 50),
  })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-/.]+$/, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Cidade',
      'letras, números, espaços, hífen (-), barra (/) e ponto (.)',
    ),
  })
  @Transform(({ value }: { value: string }) => capitalizeName(value))
  @IsString({ message: USER_MESSAGES.FIELD_IS_STRING('Cidade') })
  city: string;

  @ApiProperty({ example: BrazilState.PR })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Estado') })
  @Transform(({ value }: { value: string }) =>
    value ? value.trim().toUpperCase() : value,
  )
  @IsEnum(BrazilState, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Estado',
      'a sigla do estado em maiúsculas (ex: SP)',
    ),
  })
  state: BrazilState;

  @ApiProperty({ example: UserGender.MALE, required: false })
  @IsOptional()
  @IsEnum(UserGender, {
    message: USER_MESSAGES.FIELD_ACCEPTS_ONLY(
      'Gênero',
      'um dos valores válidos (Masculino, Feminino, Outro)',
    ),
  })
  gender?: UserGender;

  @ApiProperty({ example: true })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Termos aceitos') })
  @IsBoolean({
    message: USER_MESSAGES.FIELD_IS_STRING('Termos aceitos').replace(
      'uma string',
      'um booleano',
    ),
  })
  @Equals(true, { message: USER_MESSAGES.TERMS_NOT_ACCEPTED })
  termsAccepted: boolean;

  @ApiProperty({ example: true })
  @IsNotEmpty({ message: USER_MESSAGES.FIELD_REQUIRED('Privacidade aceita') })
  @IsBoolean({
    message: USER_MESSAGES.FIELD_IS_STRING('Privacidade aceita').replace(
      'uma string',
      'um booleano',
    ),
  })
  @Equals(true, {
    message: 'Você precisa aceitar as políticas de privacidade.',
  })
  privacyAccepted: boolean;
}
