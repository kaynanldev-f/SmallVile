import { Injectable } from '@nestjs/common';
import { UserService } from '../users/service/users.service';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { User } from 'src/users/schemas/users.schema';
import { BrazilState } from '../common/enums/brazil-states.enum';

@Injectable()
export class SeedService {
  constructor(private readonly userService: UserService) {}

  async run(): Promise<User | void> {
    return await this.createAdminUser();
  }

  private async createAdminUser(): Promise<User | void> {
    const adminExists = await this.userService.findUserByEmail(
      process.env.EMAIL_ADMIN,
    );

    if (adminExists) return;

    const created = await this.userService.createUser(
      {
        name: 'Admin',
        surname: 'System',
        email: process.env.EMAIL_ADMIN,
        password: process.env.PASSWORD_ADMIN,
        confirmPassword: process.env.PASSWORD_ADMIN,
        cpf: process.env.CPF_ADMIN,
        birthDate: '01/01/2000',
        phone: '(00)00000-0000',
        cep: '00000-000',
        address: 'System',
        number: '0',
        neighborhood: 'System',
        city: 'System',
        state: BrazilState.PR,
        termsAccepted: true,
        privacyAccepted: true,
      },
      UserRole.ADMIN,
    );
    const obj = created.toObject<Partial<User>>();
    delete obj.password;
    delete obj.role;
    delete obj.cpf;

    return obj as User;
  }
}
