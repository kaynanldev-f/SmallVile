import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { IMAGE_UPLOAD_LIMITS } from './storage.constants';

export const imageMulterOptions: MulterOptions = {
  limits: {
    fileSize: IMAGE_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES,
  },
};
