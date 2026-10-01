import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { firebaseProvider } from './firebase.provider';
import { StorageController } from './storage.controller';
@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [firebaseProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
