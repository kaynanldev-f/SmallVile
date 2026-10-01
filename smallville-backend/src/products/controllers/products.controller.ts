import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AUTH_MESSAGES } from 'src/auth/messages/auth.message';
import { ProductsService } from '../service/products.service';
import { PRODUCT_MESSAGES } from '../messages/products.message';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { CreateProductWithImageDto } from '../dtos/create-product-with-image.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from 'src/storage/storage.service';
import { imageMulterOptions } from 'src/storage/multer-image.config';
import { UpdateProductWithImageDto } from '../dtos/update-product-with-image.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista todos os produtos',
    description: 'Endpoint para buscar todos os produtos.',
  })
  @ApiResponse({ status: 200, description: PRODUCT_MESSAGES.PRODUCTS_FOUND })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  async getAll() {
    const products = await this.productsService.findAll();
    return { message: PRODUCT_MESSAGES.PRODUCTS_FOUND, data: products };
  }

  @Get('availables')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista produtos disponíveis agrupados (caso envie true na query)',
    description:
      'Endpoint para buscar produtos ativos. Pode passar ?grouped=true para agrupar por categoria.',
  })
  @ApiResponse({ status: 200, description: PRODUCT_MESSAGES.PRODUCTS_FOUND })
  async getAllAvailable(@Query('grouped') grouped?: string) {
    if (grouped === 'true') {
      const groupedProducts = await this.productsService.findAllGrouped();
      return {
        message: PRODUCT_MESSAGES.PRODUCTS_FOUND,
        data: groupedProducts,
      };
    }
    const products = await this.productsService.findAllAvailable();
    return { message: PRODUCT_MESSAGES.PRODUCTS_FOUND, data: products };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Busca produto por ID',
    description: 'Endpoint para buscar um produto cadastrado pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do produto a ser buscado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: PRODUCT_MESSAGES.PRODUCT_FOUND })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 404, description: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND })
  async findById(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return { message: PRODUCT_MESSAGES.PRODUCT_FOUND, data: product };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreateProductWithImageDto,
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria um novo produto',
    description:
      'Endpoint para cadastrar um novo produto com seus limites e categoria.',
  })
  @ApiResponse({ status: 201, description: PRODUCT_MESSAGES.PRODUCT_CREATED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({
    status: 413,
    description: PRODUCT_MESSAGES.PRODUCT_PAYLOAD_TOO_LARGE,
  })
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    if (!image) {
      throw new HttpException(
        { message: 'A imagem do produto é obrigatória.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { url } = await this.storageService.uploadFile(image);
    createProductDto.imageUrl = url;

    const product = await this.productsService.create(createProductDto);
    return { message: PRODUCT_MESSAGES.PRODUCT_CREATED, data: product };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UpdateProductWithImageDto,
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualiza produto por ID',
    description: 'Endpoint para atualizar dados de um produto existente.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do produto a ser atualizado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 200, description: PRODUCT_MESSAGES.PRODUCT_UPDATED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND })
  @ApiResponse({
    status: 413,
    description: PRODUCT_MESSAGES.PRODUCT_PAYLOAD_TOO_LARGE,
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    if (image) {
      const { url } = await this.storageService.uploadFile(image);
      updateProductDto.imageUrl = url;
    }

    const product = await this.productsService.update(id, updateProductDto);
    return { message: PRODUCT_MESSAGES.PRODUCT_UPDATED, data: product };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deleta produto por ID',
    description: 'Endpoint para remover um produto pelo seu ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do produto a ser deletado',
    type: String,
    example: '667f123abc456def78901234',
  })
  @ApiResponse({ status: 204, description: PRODUCT_MESSAGES.PRODUCT_DELETED })
  @ApiResponse({ status: 400, description: AUTH_MESSAGES.BAD_REQUEST })
  @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED })
  @ApiResponse({ status: 403, description: AUTH_MESSAGES.FORBIDDEN })
  @ApiResponse({ status: 404, description: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND })
  async delete(@Param('id') id: string) {
    await this.productsService.remove(id);
    return { message: PRODUCT_MESSAGES.PRODUCT_DELETED };
  }
}
