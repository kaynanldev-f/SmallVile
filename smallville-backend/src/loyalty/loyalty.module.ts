import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PointsTransaction,
  PointsTransactionSchema,
} from './schemas/points-transaction.schema';
import {
  PointsBalance,
  PointsBalanceSchema,
} from './schemas/points-balance.schema';
import { LoyaltyService } from './services/loyalty.service';
import { LoyaltyController } from './controllers/loyalty.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PointsTransaction.name, schema: PointsTransactionSchema },
      { name: PointsBalance.name, schema: PointsBalanceSchema },
    ]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
