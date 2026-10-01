import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AUTH_MESSAGES } from './auth/messages/auth.message';
import { validationExceptionFactory } from './common/exceptions/validation.factory';
import { SeedService } from './seed/seed-admin.service';
import { MulterExceptionFilter } from './storage/multer-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['debug', 'error', 'warn', 'log'],
  });

  const port = process.env.PORT || 21165;

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Documentação com Swagger - SmallVille')
    .setDescription(AUTH_MESSAGES.SWAGGER_DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new MulterExceptionFilter());

  try {
    const seedService = app.get(SeedService);
    await seedService.run();
  } catch (e) {
    console.error('Error occurred while seeding the database:', e);
  }

  await app.listen(port, '0.0.0.0');

  console.log(`BACKEND running on http://localhost:${port}`);
  console.log(`SWAGGER available at http://localhost:${port}/api/api-docs`);
}

void bootstrap();
