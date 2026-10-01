import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';
import { IMAGE_UPLOAD_LIMITS } from './storage.constants';

@Catch(MulterError, HttpException)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const maxSizeMb = IMAGE_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024);

    const isMulterSizeError =
      exception instanceof MulterError &&
      exception.code === ('LIMIT_FILE_SIZE' as MulterError['code']);

    const isHttpPayloadTooLarge =
      exception instanceof HttpException &&
      (exception.getStatus() as HttpStatus) === HttpStatus.PAYLOAD_TOO_LARGE;

    if (isMulterSizeError || isHttpPayloadTooLarge) {
      return response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        message: `O arquivo excede o tamanho máximo permitido de ${maxSizeMb}MB.`,
      });
    }

    if (exception instanceof HttpException) {
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    }

    return response.status(HttpStatus.BAD_REQUEST).json({
      message: 'Erro ao processar o arquivo enviado.',
    });
  }
}
