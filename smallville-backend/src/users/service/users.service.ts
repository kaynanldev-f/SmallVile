import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { User, UserDocument } from '../schemas/users.schema';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserRole } from '../enums/user-roles.enum';
import { UpdateUserPasswordDto } from '../dtos/update-user-password.dto';
import { PasswordResetTokenDto } from '../dtos/password-reset-token.dto';
import { validarCPF } from 'src/common/utils/cpf-validation';
import { hash } from 'bcrypt';
import { createHash } from 'crypto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findUserByToken(token: string): Promise<UserDocument | null> {
    // Token vazio nunca consulta o banco: o campo tem `default: null` e uma
    // busca por string vazia (ou por null) poderia casar com um usuário que
    // não pediu redefinição nenhuma.
    if (typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }

    return this.userModel.findOne({ passwordResetToken: token.trim() }).exec();
  }

  async setPasswordResetToken(
    passwordResetTokenDto: PasswordResetTokenDto,
  ): Promise<void> {
    const result = await this.userModel
      .updateOne(
        {
          email: passwordResetTokenDto.email.toLowerCase(),
          role: { $ne: UserRole.ADMIN },
        },
        {
          $set: {
            passwordResetToken: passwordResetTokenDto.token,
            passwordResetExpires: passwordResetTokenDto.expires,
          },
        },
      )
      .exec();

    if (!result.matchedCount) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async updateUserPassword(
    id: string | Types.ObjectId,
    updateData: UpdateUserPasswordDto,
  ): Promise<void> {
    const result = await this.userModel
      .updateOne(
        { _id: id, role: { $ne: UserRole.ADMIN } },
        { $set: updateData },
      )
      .exec();

    if (!result.matchedCount) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async findAllUsers(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find({ role: { $ne: UserRole.ADMIN } })
        .select('-password -role')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments({ role: { $ne: UserRole.ADMIN } }).exec(),
    ]);

    return {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserById(id: string): Promise<UserDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.userModel
      .findOne({
        _id: id,
        role: { $ne: UserRole.ADMIN },
      })
      .select('-password -role')
      .exec();

    if (!user) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  async updateUser(
    id: string | Types.ObjectId,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.userModel.findOne({
      _id: id,
      role: { $ne: UserRole.ADMIN },
    });
    if (!user) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
    if (updateUserDto.email) {
      const emailExists = await this.userModel
        .findOne({
          email: updateUserDto.email.toLowerCase(),
          _id: { $ne: id },
        })
        .exec();

      if (emailExists) {
        throw new HttpException(
          { message: USER_MESSAGES.EMAIL_ALREADY_REGISTERED },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return this.userModel
      .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
      .select('-password -role')
      .exec();
  }

  async deleteUser(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_ID_INVALID },
        HttpStatus.BAD_REQUEST,
      );
    }
    const deletedUser = await this.userModel
      .findOneAndDelete({
        _id: id,
        role: { $ne: UserRole.ADMIN },
      })
      .exec();

    if (!deletedUser) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async createUser(
    createUserDto: CreateUserDto,
    role: UserRole = UserRole.USER,
  ): Promise<UserDocument> {
    if (!validarCPF(createUserDto.cpf)) {
      throw new HttpException(
        { message: 'O CPF fornecido não é válido.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedCpf = createHash('sha256')
      .update(createUserDto.cpf)
      .digest('hex');

    const cpfExists = await this.userModel.findOne({
      cpf: hashedCpf,
    });

    if (cpfExists) {
      throw new HttpException(
        { message: 'O CPF fornecido é inválido.' },
        HttpStatus.CONFLICT,
      );
    }

    const emailExists = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (emailExists) {
      throw new HttpException(
        { message: USER_MESSAGES.USER_ALREADY_REGISTERED },
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await hash(createUserDto.password, 10);

    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      cpf: hashedCpf,
      role: role,
    });

    return newUser.save();
  }
}
