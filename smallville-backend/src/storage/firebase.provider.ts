import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, getApp, initializeApp } from 'firebase-admin/app';

export const FIREBASE_APP = 'FIREBASE_APP';

export const firebaseProvider = {
  provide: FIREBASE_APP,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): App => {
    const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    const storageBucket = configService.get<string>('FIREBASE_STORAGE_BUCKET');

    if (!getApps().length) {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      });
    }

    return getApp();
  },
};
