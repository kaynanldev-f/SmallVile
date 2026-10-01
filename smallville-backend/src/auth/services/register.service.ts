import { HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from '../../users/dtos/create-user.dto';
import { USER_MESSAGES } from '../../users/messages/users.message';
import { User } from '../../users/schemas/users.schema';
import { UserService } from 'src/users/service/users.service';

@Injectable()
export class RegisterService {
  constructor(private readonly userService: UserService) {}

  async register(createUserDto: CreateUserDto): Promise<User> {
    if (createUserDto.password !== createUserDto.confirmPassword) {
      throw new HttpException(
        { message: USER_MESSAGES.CONFIRM_PASSWORD_MUST_MATCH },
        400,
      );
    }

    const created = await this.userService.createUser(createUserDto);

    const obj = created.toObject<Partial<User>>();
    delete obj.password;
    delete obj.role;
    delete obj.cpf;

    return obj as User;
  }
}
