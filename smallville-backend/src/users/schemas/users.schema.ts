import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../enums/user-roles.enum';

export type UserDocument = User &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, maxLength: 50 })
  name: string;

  @Prop({ required: true, maxLength: 50 })
  surname: string;

  @Prop({ required: true, unique: true })
  cpf: string;

  @Prop({ required: true })
  birthDate: string;

  @Prop({
    required: true,
    unique: true,
    maxLength: 100,
    lowercase: true,
    trim: true,
    match: /^([^\s@]+)@((?:[^\s@]+\.)+[^\s@]+)$/,
  })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, match: /^\(?\d{2}\)?\s?\d{4,5}-\d{4}$/ })
  phone: string;

  @Prop({ required: true, match: /^\d{5}-\d{3}$/ })
  cep: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: false, default: null, match: /^\d+$/ })
  number?: string;

  @Prop({ required: false, default: null })
  complement?: string;

  @Prop({ required: true })
  neighborhood: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true, match: /^[A-Z]{2}$/ })
  state: string;

  @Prop({ required: false, default: null })
  gender?: string;

  @Prop({ required: true })
  termsAccepted: boolean;

  @Prop({ required: true })
  privacyAccepted: boolean;

  // Campos de Recuperação de senha
  @Prop({ default: null })
  passwordResetToken: string;

  @Prop({ default: null })
  passwordResetExpires: Date;

  // Campo de controle de acesso
  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  })
  role: UserRole;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
