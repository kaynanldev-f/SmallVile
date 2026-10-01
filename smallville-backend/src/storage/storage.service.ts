import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { FIREBASE_APP } from './firebase.provider';
import { IMAGE_UPLOAD_LIMITS } from './storage.constants';

@Injectable()
export class StorageService {
  constructor(
    @Inject(FIREBASE_APP) private readonly firebaseApp: App,
    private readonly configService: ConfigService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; path: string }> {
    if (!file) {
      throw new HttpException(
        { message: 'Nenhum arquivo enviado.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !IMAGE_UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof IMAGE_UPLOAD_LIMITS.ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new HttpException(
        { message: 'Formato de imagem inválido. Use JPEG, PNG ou WEBP.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const folder = this.configService.get<string>('FIREBASE_STORAGE_FOLDER');
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${randomUUID()}.${fileExtension}`;

    const bucket = getStorage(this.firebaseApp).bucket();
    const fileUpload = bucket.file(fileName);

    try {
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      await fileUpload.makePublic();

      const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      return { url, path: fileName };
    } catch (error) {
      console.error('Erro no upload para o Firebase Storage:', error);
      throw new HttpException(
        { message: 'Erro ao enviar o arquivo para o Firebase Storage.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload de um arquivo gerado pela própria aplicação (hoje: o ingresso em
   * PDF).
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; path: string }> {
    const folder = this.configService.get<string>('FIREBASE_STORAGE_FOLDER');
    const path = `${folder}/${fileName}`;

    const bucket = getStorage(this.firebaseApp).bucket();
    const fileUpload = bucket.file(path);

    try {
      await fileUpload.save(buffer, { metadata: { contentType } });
      await fileUpload.makePublic();

      return {
        url: `https://storage.googleapis.com/${bucket.name}/${path}`,
        path,
      };
    } catch (error) {
      console.error('Erro no upload para o Firebase Storage:', error);
      throw new HttpException(
        { message: 'Erro ao enviar o arquivo para o Firebase Storage.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFile(path: string): Promise<void> {
    const bucket = getStorage(this.firebaseApp).bucket();

    try {
      await bucket.file(path).delete();
    } catch {
      throw new HttpException(
        { message: 'Erro ao remover o arquivo do Firebase Storage.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
