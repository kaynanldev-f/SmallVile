import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { StorageService } from './storage.service';
import { imageMulterOptions } from './multer-image.config';

@ApiTags('Image Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', imageMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Faz upload de uma imagem para o Firebase Storage' })
  @ApiResponse({ status: 201, description: 'Arquivo enviado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  async upload(@UploadedFile() file: Express.Multer.File) {
    const result = await this.storageService.uploadFile(file);

    return {
      message: 'Arquivo enviado com sucesso.',
      data: result,
    };
  }
}
