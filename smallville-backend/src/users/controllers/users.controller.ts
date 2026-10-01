import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, type AuthRequest } from 'src/auth/guards/auth.guard';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { USER_MESSAGES } from 'src/users/messages/users.message';
import { UserService } from '../service/users.service';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from '../enums/user-roles.enum';
import { Roles } from 'src/common/decorator/roles.decorator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Busca todos os usuários',
    description: 'Endpoint para buscar todos os usuário do sistema, paginado.',
  })
  @ApiResponse({ status: 200, description: USER_MESSAGES.USERS_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getAll(@Query() paginationQuery: PaginationQueryDto) {
    const { users, meta } = await this.userService.findAllUsers(
      paginationQuery.page,
      paginationQuery.limit,
    );

    return {
      message: USER_MESSAGES.USERS_FOUND,
      data: users,
      meta,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Busca usuário por ID',
    description: 'Endpoint para buscar um usuário salvo pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário a ser buscado',
    type: String,
    example: '696a775b7369b60210df7b26',
  })
  @ApiResponse({ status: 200, description: USER_MESSAGES.USER_FOUND })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: AUTH_MESSAGES.FORBIDDEN,
  })
  @ApiResponse({ status: 404, description: USER_MESSAGES.USER_NOT_FOUND })
  async findById(@Param('id') id: string, @Req() req: AuthRequest) {
    const isOwner = req.user.sub === id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    const user = await this.userService.findUserById(id);
    return { message: USER_MESSAGES.USER_FOUND, data: user };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza usuário por ID',
    description: 'Endpoint para atualizar um usuário salvo pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário a ser atualizado',
    type: String,
    example: '696a775b7369b60210df7b26',
  })
  @ApiResponse({ status: 200, description: USER_MESSAGES.USER_UPDATED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: AUTH_MESSAGES.FORBIDDEN,
  })
  @ApiResponse({ status: 404, description: USER_MESSAGES.USER_NOT_FOUND })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthRequest,
  ) {
    const isOwner = req.user.sub === id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    const user = await this.userService.updateUser(id, updateUserDto);
    return { message: USER_MESSAGES.USER_UPDATED, data: user };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deleta usuário por ID',
    description: 'Endpoint para deletar um usuário salvo pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário a ser deletado.',
    type: String,
    example: '696a775b7369b60210df7b26',
  })
  @ApiResponse({ status: 204, description: USER_MESSAGES.USER_DELETED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({
    status: 403,
    description: AUTH_MESSAGES.FORBIDDEN,
  })
  @ApiResponse({ status: 404, description: USER_MESSAGES.USER_NOT_FOUND })
  async delete(@Param('id') id: string, @Req() req: AuthRequest) {
    const isOwner = req.user.sub === id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(AUTH_MESSAGES.FORBIDDEN);
    }

    await this.userService.deleteUser(id);
    return { message: USER_MESSAGES.USER_DELETED };
  }
}
