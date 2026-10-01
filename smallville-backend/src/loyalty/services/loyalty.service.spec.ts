import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { LoyaltyService } from './loyalty.service';
import { PointsTransaction } from '../schemas/points-transaction.schema';
import { PointsBalance } from '../schemas/points-balance.schema';
import { PointsTransactionType } from '../enums/points-transaction-type.enum';
import { calculateEarnedPoints } from '../constants/loyalty.rules';

describe('LoyaltyService (Unitário)', () => {
  let service: LoyaltyService;

  const userId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();

  const transactionFindOneExec = jest.fn();
  const balanceFindOneExec = jest.fn();

  const transactionModelMock = {
    findOne: jest.fn(() => ({ exec: transactionFindOneExec })),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const balanceModelMock = {
    findOne: jest.fn(() => ({ exec: balanceFindOneExec })),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    transactionFindOneExec.mockResolvedValue(null);
    balanceFindOneExec.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        {
          provide: getModelToken(PointsTransaction.name),
          useValue: transactionModelMock,
        },
        {
          provide: getModelToken(PointsBalance.name),
          useValue: balanceModelMock,
        },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
  });

  const mockCredit = (balanceAfter: number) => {
    const transaction = {
      balanceAfter: 0,
      save: jest.fn().mockResolvedValue(undefined),
    };

    transactionModelMock.create.mockResolvedValue(transaction);
    balanceModelMock.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ balance: balanceAfter }),
    });

    return transaction;
  };

  describe('regra de pontuação (10 pontos a cada R$ 5,00)', () => {
    it.each([
      [500, 10],
      [1000, 20],
      [2500, 50],
      [5000, 100],
      [10000, 200],
    ])('%i centavos devem valer %i pontos', (cents, expected) => {
      expect(calculateEarnedPoints(cents)).toBe(expected);
    });

    it('pontua por faixa cheia: R$ 7,00 vale o mesmo que R$ 5,00', () => {
      expect(calculateEarnedPoints(700)).toBe(10);
    });

    it('não pontua compra abaixo da faixa nem valor inválido', () => {
      expect(calculateEarnedPoints(499)).toBe(0);
      expect(calculateEarnedPoints(0)).toBe(0);
      expect(calculateEarnedPoints(-100)).toBe(0);
    });
  });

  describe('awardForOrder', () => {
    it('credita os pontos da compra aprovada e atualiza o saldo', async () => {
      const transaction = mockCredit(100);

      const result = await service.awardForOrder({
        userId,
        orderId,
        amountInCents: 5000,
      });

      expect(result).toEqual({
        points: 100,
        balance: 100,
        alreadyAwarded: false,
      });

      expect(transactionModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PointsTransactionType.EARN,
          points: 100,
          amountInCents: 5000,
          idempotencyKey: `credito:pedido:${orderId}`,
        }),
      );

      // O saldo é somado de forma atômica, e a transação guarda o saldo
      // resultante para o extrato.
      expect(balanceModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { user: new Types.ObjectId(userId) },
        { $inc: { balance: 100, totalEarned: 100 } },
        expect.objectContaining({ upsert: true }),
      );
      expect(transaction.balanceAfter).toBe(100);
      expect(transaction.save).toHaveBeenCalled();
    });

    it('não credita duas vezes o mesmo pedido', async () => {
      transactionFindOneExec.mockResolvedValue({ points: 100 });
      balanceFindOneExec.mockResolvedValue({
        balance: 100,
        totalEarned: 100,
        totalRedeemed: 0,
      });

      const result = await service.awardForOrder({
        userId,
        orderId,
        amountInCents: 5000,
      });

      expect(result).toEqual({
        points: 0,
        balance: 100,
        alreadyAwarded: true,
      });
      expect(transactionModelMock.create).not.toHaveBeenCalled();
      expect(balanceModelMock.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('não credita quando duas aprovações simultâneas disputam a chave', async () => {
      // A primeira consulta não encontra nada, mas o índice único barra a
      // gravação: quem perdeu a corrida não pode somar pontos.
      transactionModelMock.create.mockRejectedValue({ code: 11000 });
      balanceFindOneExec.mockResolvedValue({
        balance: 100,
        totalEarned: 100,
        totalRedeemed: 0,
      });

      const result = await service.awardForOrder({
        userId,
        orderId,
        amountInCents: 5000,
      });

      expect(result.alreadyAwarded).toBe(true);
      expect(result.points).toBe(0);
      expect(balanceModelMock.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('não grava movimentação quando a compra não atinge a faixa', async () => {
      const result = await service.awardForOrder({
        userId,
        orderId,
        amountInCents: 400,
      });

      expect(result.points).toBe(0);
      expect(transactionModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('revokeForOrder (pedido reembolsado)', () => {
    // O estorno lê a transação de crédito do pedido para saber quanto tirar:
    // 1ª busca é a chave do estorno (ainda não existe), 2ª é a do crédito.
    const mockRevokeLookup = (awarded: number | null, balance: number) => {
      transactionFindOneExec
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(awarded === null ? null : { points: awarded });

      balanceFindOneExec.mockResolvedValue({
        balance,
        totalEarned: balance,
        totalRedeemed: 0,
      });
    };

    it('retira do saldo os pontos que a compra reembolsada havia gerado', async () => {
      mockRevokeLookup(100, 100);

      const transaction = {
        balanceAfter: 0,
        save: jest.fn().mockResolvedValue(undefined),
      };
      transactionModelMock.create.mockResolvedValue(transaction);
      balanceModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ balance: 0 }),
      });

      const result = await service.revokeForOrder({ userId, orderId });

      expect(result).toEqual({
        points: 100,
        balance: 0,
        alreadyRevoked: false,
      });

      // O crédito original NÃO é apagado: entra uma linha nova, negativa.
      expect(transactionModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PointsTransactionType.ADJUSTMENT,
          points: -100,
          idempotencyKey: `estorno:pedido:${orderId}`,
        }),
      );
      expect(balanceModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { user: new Types.ObjectId(userId) },
        { $inc: { balance: -100, totalEarned: -100 } },
        expect.objectContaining({ upsert: true }),
      );
      expect(transaction.balanceAfter).toBe(0);
    });

    it('não estorna duas vezes o mesmo pedido', async () => {
      transactionFindOneExec.mockResolvedValueOnce({ points: -100 });
      balanceFindOneExec.mockResolvedValue({
        balance: 0,
        totalEarned: 100,
        totalRedeemed: 0,
      });

      const result = await service.revokeForOrder({ userId, orderId });

      expect(result).toEqual({ points: 0, balance: 0, alreadyRevoked: true });
      expect(transactionModelMock.create).not.toHaveBeenCalled();
      expect(balanceModelMock.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('nunca deixa o saldo negativo quando os pontos já foram gastos', async () => {
      // Ganhou 100 pelo pedido, mas só restam 40 no saldo.
      mockRevokeLookup(100, 40);

      transactionModelMock.create.mockResolvedValue({
        balanceAfter: 0,
        save: jest.fn().mockResolvedValue(undefined),
      });
      balanceModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ balance: 0 }),
      });

      const result = await service.revokeForOrder({ userId, orderId });

      expect(result.points).toBe(40);
      expect(balanceModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        { user: new Types.ObjectId(userId) },
        { $inc: { balance: -40, totalEarned: -40 } },
        expect.objectContaining({ upsert: true }),
      );
    });

    it('não lança movimentação quando o pedido nunca pontuou', async () => {
      mockRevokeLookup(null, 0);

      const result = await service.revokeForOrder({ userId, orderId });

      expect(result).toEqual({ points: 0, balance: 0, alreadyRevoked: false });
      expect(transactionModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('devolve saldo zerado para quem ainda não pontuou', async () => {
      await expect(service.getBalance(userId)).resolves.toEqual({
        balance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
      });
    });

    it('devolve o saldo persistido', async () => {
      balanceFindOneExec.mockResolvedValue({
        balance: 250,
        totalEarned: 250,
        totalRedeemed: 0,
      });

      await expect(service.getBalance(userId)).resolves.toEqual({
        balance: 250,
        totalEarned: 250,
        totalRedeemed: 0,
      });
    });
  });

  describe('catálogo de recompensas', () => {
    it('mantém todo resgate indisponível nesta etapa', () => {
      const rewards = service.getRewards();

      expect(rewards.length).toBeGreaterThan(0);
      expect(rewards.every((reward) => reward.available === false)).toBe(true);
      expect(rewards.every((reward) => Boolean(reward.unavailableReason))).toBe(
        true,
      );
    });

    it('expõe a regra vigente para a tela não recalcular', () => {
      expect(service.getEarningRule()).toEqual(
        expect.objectContaining({ pointsPerStep: 10, stepAmountInCents: 500 }),
      );
    });
  });
});
