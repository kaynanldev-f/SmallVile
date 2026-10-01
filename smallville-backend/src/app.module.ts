import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SignOptions } from 'jsonwebtoken';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { TicketsModule } from './tickets/tickets.module';
import { SessionsModule } from './session/session.module';
import { MoviesModule } from './movies/movies.module';
import { OrdersModule } from './orders/orders.module';
import { CinemasModule } from './cinemas/cinema.module';
import { StorageModule } from './storage/storage.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { SalesControlModule } from './sales-control/sales-control.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.DATABASE_URL),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    JwtModule.register({
      global: true,
      secret: process.env.TOKEN_SECRET,
      signOptions: {
        expiresIn: process.env.TOKEN_EXPIRATION as SignOptions['expiresIn'],
      },
    }),
    MailModule,
    AuthModule,
    UsersModule,
    StorageModule,
    ProductsModule,
    TicketsModule,
    SessionsModule,
    MoviesModule,
    OrdersModule,
    CinemasModule,
    PaymentsModule,
    NotificationsModule,
    LoyaltyModule,
    SalesControlModule,
    AnalyticsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
