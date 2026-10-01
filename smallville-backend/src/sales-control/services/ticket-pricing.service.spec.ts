import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { TicketPricingService } from './ticket-pricing.service';
import { TicketPriceRule } from '../schemas/ticket-price-rule.schema';
import { Session } from 'src/session/schemas/session.schema';
import { TicketType } from 'src/tickets/enums/ticket-type.enum';
import { SALES_CONTROL_MESSAGES } from '../messages/sales-control.message';

describe('TicketPricingService (Unitário)', () => {
  let service: TicketPricingService;

  const rulesExec = jest.fn();
  const sessionExec = jest.fn();

  const ruleModelMock = {
    find: jest.fn(() => ({ exec: rulesExec })),
  };

  const sessionModelMock = {
    findById: jest.fn(() => ({ exec: sessionExec })),
  };

  // Sexta-feira, 21h no horário de Brasília.
  const fridaySession = {
    _id: new Types.ObjectId(),
    cinemaId: new Types.ObjectId(),
    dateTime: '2026-08-21T21:00:00-03:00',
    price: 3000,
  };

  const buildRule = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    name: 'Regra',
    weekday: null,
    cinema: null,
    fullPrice: 2000,
    halfPrice: 1000,
    active: true,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    rulesExec.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketPricingService,
        {
          provide: getModelToken(TicketPriceRule.name),
          useValue: ruleModelMock,
        },
        { provide: getModelToken(Session.name), useValue: sessionModelMock },
      ],
    }).compile();

    service = module.get<TicketPricingService>(TicketPricingService);
  });

  describe('resolução de preço', () => {
    it('usa o preço da sessão quando não há regra cadastrada', async () => {
      const pricing = await service.resolveForSession(fridaySession);

      expect(pricing).toEqual(
        expect.objectContaining({
          fullPrice: 3000,
          halfPrice: 1500,
          source: 'padrao',
        }),
      );
    });

    it('aplica a regra da tabela por cima do preço da sessão', async () => {
      rulesExec.mockResolvedValue([
        buildRule({ weekday: 5, fullPrice: 3500, halfPrice: 1750 }),
      ]);

      const pricing = await service.resolveForSession(fridaySession);

      expect(pricing.fullPrice).toBe(3500);
      expect(pricing.halfPrice).toBe(1750);
      expect(pricing.source).toBe('regra');
      expect(pricing.appliedRule?.weekday).toBe(5);
    });

    it('prefere a regra mais específica entre as aplicáveis', async () => {
      const geral = buildRule({ fullPrice: 2000, halfPrice: 1000 });
      const doDia = buildRule({
        weekday: 5,
        fullPrice: 3000,
        halfPrice: 1500,
      });
      const doDiaNoCinema = buildRule({
        weekday: 5,
        cinema: fridaySession.cinemaId,
        fullPrice: 4000,
        halfPrice: 2000,
      });

      rulesExec.mockResolvedValue([geral, doDia, doDiaNoCinema]);

      const pricing = await service.resolveForSession(fridaySession);

      expect(pricing.fullPrice).toBe(4000);
      expect(pricing.halfPrice).toBe(2000);
    });

    it('deixa o preço próprio da sessão vencer a tabela', async () => {
      rulesExec.mockResolvedValue([
        buildRule({ weekday: 5, fullPrice: 3500, halfPrice: 1750 }),
      ]);

      const pricing = await service.resolveForSession({
        ...fridaySession,
        priceFull: 5000,
        priceHalf: 2500,
      });

      expect(pricing.fullPrice).toBe(5000);
      expect(pricing.halfPrice).toBe(2500);
      expect(pricing.source).toBe('sessao');
    });

    it('cobra meia e inteira conforme o tipo do ingresso', async () => {
      const pricing = await service.resolveForSession(fridaySession);

      expect(service.priceFor(pricing, TicketType.FULL)).toBe(3000);
      expect(service.priceFor(pricing, TicketType.HALF)).toBe(1500);
    });

    /**
     * A sessão grava `dateTime` como "DD/MM/AAAA HH:MM" — é o formato que o
     * DTO exige.
     */
    describe('data da sessão no formato gravado (DD/MM/AAAA HH:MM)', () => {
      it('encontra a regra do dia quando o dia é maior que 12', async () => {
        // 21/08/2026 é uma sexta-feira.
        rulesExec.mockResolvedValue([
          buildRule({ weekday: 5, fullPrice: 3500, halfPrice: 1750 }),
        ]);

        const pricing = await service.resolveForSession({
          ...fridaySession,
          dateTime: '21/08/2026 21:00',
        });

        expect(rulesExec).toHaveBeenCalled();
        expect(ruleModelMock.find).toHaveBeenCalledWith(
          expect.objectContaining({ weekday: { $in: [5, null] } }),
        );
        expect(pricing.fullPrice).toBe(3500);
        expect(pricing.source).toBe('regra');
      });

      it('não confunde dia com mês quando o dia é menor ou igual a 12', async () => {
        // 05/11/2026 é uma quinta-feira; lido como mês/dia seria 11/05, uma
        // segunda-feira.
        await service.resolveForSession({
          ...fridaySession,
          dateTime: '05/11/2026 20:30',
        });

        expect(ruleModelMock.find).toHaveBeenCalledWith(
          expect.objectContaining({ weekday: { $in: [4, null] } }),
        );
      });

      it('mantém o dia do cinema em sessão de fim de noite', async () => {
        // 19/08/2026 23:30 em São Paulo ainda é quarta-feira, mesmo que em
        // UTC já seja quinta.
        await service.resolveForSession({
          ...fridaySession,
          dateTime: '19/08/2026 23:30',
        });

        expect(ruleModelMock.find).toHaveBeenCalledWith(
          expect.objectContaining({ weekday: { $in: [3, null] } }),
        );
      });
    });

    describe('regra sem preço não zera o ingresso', () => {
      it('ignora regra zerada e mantém o preço da sessão', async () => {
        // Regra padrão salva sem valor: era o que fazia todo ingresso
        // aparecer por R$ 0,00 na compra.
        rulesExec.mockResolvedValue([]);

        const pricing = await service.resolveForSession(fridaySession);

        expect(pricing.fullPrice).toBe(3000);
        expect(pricing.halfPrice).toBe(1500);
      });

      it('pede ao banco apenas regras com preço', async () => {
        await service.resolveForSession(fridaySession);

        expect(ruleModelMock.find).toHaveBeenCalledWith(
          expect.objectContaining({ fullPrice: { $gt: 0 } }),
        );
      });

      it('ignora preço próprio zerado da sessão', async () => {
        rulesExec.mockResolvedValue([
          buildRule({ weekday: 5, fullPrice: 3500, halfPrice: 1750 }),
        ]);

        const pricing = await service.resolveForSession({
          ...fridaySession,
          priceFull: 0,
          priceHalf: 0,
        });

        expect(pricing.fullPrice).toBe(3500);
        expect(pricing.halfPrice).toBe(1750);
        expect(pricing.source).toBe('regra');
      });
    });
  });

  describe('disponibilidade de venda', () => {
    const now = new Date('2026-08-18T12:00:00-03:00');

    it('considera à venda a sessão sem configuração', () => {
      expect(service.describeAvailability(fridaySession, now).onSale).toBe(
        true,
      );
    });

    it('bloqueia a sessão com venda encerrada pelo administrador', () => {
      const availability = service.describeAvailability(
        { ...fridaySession, salesEnabled: false },
        now,
      );

      expect(availability.onSale).toBe(false);
      expect(availability.reason).toBe(SALES_CONTROL_MESSAGES.SALES_DISABLED);
    });

    it('bloqueia antes do início do período de vendas', () => {
      const availability = service.describeAvailability(
        {
          ...fridaySession,
          salesStartAt: new Date('2026-08-19T10:00:00-03:00'),
        },
        now,
      );

      expect(availability.onSale).toBe(false);
      expect(availability.reason).toBe(
        SALES_CONTROL_MESSAGES.SALES_NOT_STARTED,
      );
    });

    it('bloqueia depois do fim do período de vendas', () => {
      const availability = service.describeAvailability(
        {
          ...fridaySession,
          salesEndAt: new Date('2026-08-17T18:00:00-03:00'),
        },
        now,
      );

      expect(availability.onSale).toBe(false);
      expect(availability.reason).toBe(SALES_CONTROL_MESSAGES.SALES_FINISHED);
    });

    it('recusa a compra quando a sessão não está à venda', () => {
      expect(() =>
        service.assertOnSale({ ...fridaySession, salesEnabled: false }, now),
      ).toThrow(BadRequestException);
    });

    /**
     * A comparação é de data + horário, e não só de data: a sessão das 8h de
     * hoje já passou às 10h, enquanto a das 23h do mesmo dia ainda vende.
     */
    describe('sessão que já aconteceu', () => {
      const agora = new Date('2026-08-20T10:00:00-03:00');

      const sessionAt = (dateTime: string) => ({ ...fridaySession, dateTime });

      it('bloqueia a sessão de um dia anterior', () => {
        const availability = service.describeAvailability(
          sessionAt('19/08/2026 20:00'),
          agora,
        );

        expect(availability.onSale).toBe(false);
        expect(availability.reason).toBe(
          SALES_CONTROL_MESSAGES.SESSION_ALREADY_STARTED,
        );
      });

      it('bloqueia a sessão de hoje cujo horário já passou', () => {
        expect(
          service.describeAvailability(sessionAt('20/08/2026 08:00'), agora)
            .onSale,
        ).toBe(false);
      });

      it('mantém à venda a sessão de hoje que ainda vai começar', () => {
        expect(
          service.describeAvailability(sessionAt('20/08/2026 23:00'), agora)
            .onSale,
        ).toBe(true);
      });

      it('mantém à venda a sessão de um dia seguinte', () => {
        expect(
          service.describeAvailability(sessionAt('21/08/2026 20:00'), agora)
            .onSale,
        ).toBe(true);
      });

      it('lê o horário no fuso do cinema, e não no do servidor', () => {
        // 20/08/2026 22:00 em São Paulo é 01:00 do dia 21 em UTC: lida como
        // UTC, a sessão pareceria já ter acontecido às 23h de Brasília.
        const vinteETresHoras = new Date('2026-08-20T23:00:00-03:00');

        expect(
          service.describeAvailability(
            sessionAt('20/08/2026 23:30'),
            vinteETresHoras,
          ).onSale,
        ).toBe(true);
      });

      it('recusa a compra da sessão que já aconteceu', () => {
        expect(() =>
          service.assertOnSale(sessionAt('19/08/2026 20:00'), agora),
        ).toThrow(
          new BadRequestException(
            SALES_CONTROL_MESSAGES.SESSION_ALREADY_STARTED,
          ),
        );
      });
    });
  });

  it('responde 404 para sessão inexistente', async () => {
    sessionExec.mockResolvedValue(null);

    await expect(
      service.findSessionOrFail(new Types.ObjectId().toString()),
    ).rejects.toThrow(NotFoundException);
  });
});
