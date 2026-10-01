import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import {
  PointsTransaction,
  PointsTransactionDocument,
} from '../schemas/points-transaction.schema';
import {
  PointsBalance,
  PointsBalanceDocument,
} from '../schemas/points-balance.schema';
import { PointsTransactionType } from '../enums/points-transaction-type.enum';
import {
  buildOrderEarnKey,
  buildOrderRevokeKey,
  calculateEarnedPoints,
  POINTS_PER_STEP,
  POINTS_STEP_AMOUNT_CENTS,
} from '../constants/loyalty.rules';
import { LOYALTY_MESSAGES } from '../messages/loyalty.message';

const DUPLICATE_KEY_ERROR = 11000;

export interface PointsBalanceSummary {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
}

export interface AwardPointsInput {
  userId: string;
  orderId: string;
  amountInCents: number;
}

export interface AwardPointsResult {
  /** Pontos creditados AGORA. Zero quando o pedido já havia pontuado. */
  points: number;
  balance: number;
  alreadyAwarded: boolean;
}

export interface RevokePointsInput {
  userId: string;
  orderId: string;
  /** Aparece no extrato do usuário como origem do ajuste. */
  description?: string;
}

export interface RevokePointsResult {
  /** Pontos retirados AGORA. Zero quando não havia o que estornar. */
  points: number;
  balance: number;
  alreadyRevoked: boolean;
}

/** Recompensas do catálogo. Nenhuma resgatável nesta etapa. */
export interface LoyaltyReward {
  code: string;
  label: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectModel(PointsTransaction.name)
    private readonly transactionModel: Model<PointsTransactionDocument>,
    @InjectModel(PointsBalance.name)
    private readonly balanceModel: Model<PointsBalanceDocument>,
  ) {}

  /** Credita os pontos de uma compra aprovada. */
  async awardForOrder(input: AwardPointsInput): Promise<AwardPointsResult> {
    const { userId, orderId, amountInCents } = input;
    const idempotencyKey = buildOrderEarnKey(orderId);
    const points = calculateEarnedPoints(amountInCents);

    const existing = await this.transactionModel
      .findOne({ idempotencyKey })
      .exec();

    if (existing) {
      const summary = await this.getBalance(userId);
      return { points: 0, balance: summary.balance, alreadyAwarded: true };
    }

    if (points <= 0) {
      const summary = await this.getBalance(userId);
      return { points: 0, balance: summary.balance, alreadyAwarded: false };
    }

    const user = new Types.ObjectId(userId);

    let transaction: PointsTransactionDocument;

    try {
      transaction = await this.transactionModel.create({
        user,
        type: PointsTransactionType.EARN,
        points,
        balanceAfter: 0,
        order: new Types.ObjectId(orderId),
        amountInCents,
        description: `Pontos da compra do pedido ${orderId}`,
        idempotencyKey,
      });
    } catch (error) {
      // Corrida entre duas aprovações do mesmo pedido: quem perdeu o índice
      // único não credita nada.
      if (this.isDuplicateKeyError(error)) {
        const summary = await this.getBalance(userId);
        return { points: 0, balance: summary.balance, alreadyAwarded: true };
      }
      throw error;
    }

    const balance = await this.balanceModel
      .findOneAndUpdate(
        { user },
        { $inc: { balance: points, totalEarned: points } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    transaction.balanceAfter = balance.balance;
    await transaction.save();

    this.logger.log(
      `Creditados ${points} pontos ao usuário ${userId} pelo pedido ${orderId} (saldo: ${balance.balance})`,
    );

    return { points, balance: balance.balance, alreadyAwarded: false };
  }

  /** Estorna os pontos creditados por um pedido reembolsado. */
  async revokeForOrder(input: RevokePointsInput): Promise<RevokePointsResult> {
    const { userId, orderId } = input;
    const idempotencyKey = buildOrderRevokeKey(orderId);

    const alreadyRevoked = await this.transactionModel
      .findOne({ idempotencyKey })
      .exec();

    if (alreadyRevoked) {
      const summary = await this.getBalance(userId);
      return { points: 0, balance: summary.balance, alreadyRevoked: true };
    }

    // A fonte da verdade do quanto estornar é a própria transação de crédito
    // do pedido: recalcular pelo valor pago devolveria outro número se a
    // regra de pontuação tivesse mudado desde a compra.
    const earned = await this.transactionModel
      .findOne({ idempotencyKey: buildOrderEarnKey(orderId) })
      .exec();

    const awarded = earned?.points ?? 0;
    const summary = await this.getBalance(userId);

    // Pedido que nunca pontuou (valor abaixo da faixa mínima, ou pontos já
    // creditados antes do programa): não há linha a lançar.
    if (awarded <= 0) {
      return { points: 0, balance: summary.balance, alreadyRevoked: false };
    }

    const points = Math.min(awarded, summary.balance);
    const user = new Types.ObjectId(userId);

    let transaction: PointsTransactionDocument;

    try {
      transaction = await this.transactionModel.create({
        user,
        type: PointsTransactionType.ADJUSTMENT,
        points: -points,
        balanceAfter: 0,
        order: new Types.ObjectId(orderId),
        description:
          input.description ??
          `Estorno dos pontos do pedido ${orderId} (reembolso aprovado)`,
        idempotencyKey,
      });
    } catch (error) {
      // Corrida entre duas aprovações do mesmo reembolso: quem perdeu o
      // índice único não debita nada.
      if (this.isDuplicateKeyError(error)) {
        const current = await this.getBalance(userId);
        return { points: 0, balance: current.balance, alreadyRevoked: true };
      }
      throw error;
    }

    let balanceAfter = summary.balance;

    if (points > 0) {
      // `totalEarned` também recua: os pontos não foram gastos, foram
      // desfeitos, e mantê-los no total somado deixaria o extrato sem
      // fechar com o saldo.
      const balance = await this.balanceModel
        .findOneAndUpdate(
          { user },
          { $inc: { balance: -points, totalEarned: -points } },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        )
        .exec();

      balanceAfter = balance.balance;
    }

    transaction.balanceAfter = balanceAfter;
    await transaction.save();

    this.logger.log(
      `Estornados ${points} pontos do usuário ${userId} pelo reembolso do pedido ${orderId} (saldo: ${balanceAfter})`,
    );

    return { points, balance: balanceAfter, alreadyRevoked: false };
  }

  async getBalance(userId: string): Promise<PointsBalanceSummary> {
    if (!Types.ObjectId.isValid(userId)) {
      return { balance: 0, totalEarned: 0, totalRedeemed: 0 };
    }

    const balance = await this.balanceModel
      .findOne({ user: new Types.ObjectId(userId) })
      .exec();

    // Quem nunca comprou não tem documento de saldo: zerado é a resposta
    // correta, e criar o registro só para responder seria escrita à toa.
    return {
      balance: balance?.balance ?? 0,
      totalEarned: balance?.totalEarned ?? 0,
      totalRedeemed: balance?.totalRedeemed ?? 0,
    };
  }

  async getTransactions(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filter = { user: new Types.ObjectId(userId) };

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      ...(total === 0 ? { message: LOYALTY_MESSAGES.NO_TRANSACTIONS } : {}),
    };
  }

  /* Regra de pontuação exibida na tela, vinda do backend. */
  getEarningRule() {
    return {
      pointsPerStep: POINTS_PER_STEP,
      stepAmountInCents: POINTS_STEP_AMOUNT_CENTS,
      description: LOYALTY_MESSAGES.EARNING_RULE,
    };
  }

  /* Catálogo de recompensas — todas indisponíveis nesta etapa.*/
  getRewards(): LoyaltyReward[] {
    return [
      {
        code: 'ingresso',
        label: 'Trocar por ingresso',
        description: 'Use seus pontos para garantir um ingresso.',
        available: false,
        unavailableReason: LOYALTY_MESSAGES.REDEMPTION_UNAVAILABLE,
      },
      {
        code: 'combo',
        label: 'Trocar por combo',
        description: 'Combos da bomboniere em troca de pontos.',
        available: false,
        unavailableReason: LOYALTY_MESSAGES.REDEMPTION_UNAVAILABLE,
      },
      {
        code: 'produto',
        label: 'Trocar por produtos',
        description: 'Pipoca, bebida e outros itens da bomboniere.',
        available: false,
        unavailableReason: LOYALTY_MESSAGES.REDEMPTION_UNAVAILABLE,
      },
      {
        code: 'recompensa',
        label: 'Outras recompensas',
        description: 'Brindes e vantagens exclusivas do programa.',
        available: false,
        unavailableReason: LOYALTY_MESSAGES.REDEMPTION_UNAVAILABLE,
      },
    ];
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === DUPLICATE_KEY_ERROR
    );
  }
}
