import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from '../schemas/notification.schema';
import { NotificationAudience } from '../enums/notification-audience.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { User } from 'src/users/schemas/users.schema';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { NOTIFICATION_CONTENT } from '../messages/notification-content';

describe('NotificationsService (Unitário)', () => {
  let service: NotificationsService;

  const userId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId();
  const otherAdminId = new Types.ObjectId();

  const findExec = jest.fn();
  const countExec = jest.fn();
  const updateManyExec = jest.fn();
  const findOneAndUpdateExec = jest.fn();
  const usersExec = jest.fn();

  // Encadeamento das queries do mongoose: cada método devolve o próprio
  // mock e o resultado sai de `exec()`.
  interface QueryMock {
    sort: jest.Mock;
    skip: jest.Mock;
    limit: jest.Mock;
    exec: jest.Mock;
  }

  const findQueryMock: QueryMock = {
    sort: jest.fn((): QueryMock => findQueryMock),
    skip: jest.fn((): QueryMock => findQueryMock),
    limit: jest.fn((): QueryMock => findQueryMock),
    exec: findExec,
  };

  const notificationModelMock = {
    find: jest.fn((): QueryMock => findQueryMock),
    countDocuments: jest.fn(() => ({ exec: countExec })),
    updateMany: jest.fn(() => ({ exec: updateManyExec })),
    findOneAndUpdate: jest.fn(() => ({ exec: findOneAndUpdateExec })),
    create: jest.fn(),
    exists: jest.fn(),
  };

  const userModelMock = {
    find: jest.fn(() => ({
      select: jest.fn(() => ({
        lean: jest.fn(() => ({ exec: usersExec })),
      })),
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    findExec.mockResolvedValue([]);
    countExec.mockResolvedValue(0);
    updateManyExec.mockResolvedValue({ modifiedCount: 0 });
    findOneAndUpdateExec.mockResolvedValue(null);
    usersExec.mockResolvedValue([{ _id: adminId }, { _id: otherAdminId }]);
    notificationModelMock.exists.mockResolvedValue(null);
    notificationModelMock.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: notificationModelMock,
        },
        { provide: getModelToken(User.name), useValue: userModelMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('disparo', () => {
    it('grava a notificação do comprador na caixa de usuário', async () => {
      await service.notifyUser(
        userId,
        NOTIFICATION_CONTENT.paymentApproved('pedido-1', 'Interestelar'),
      );

      expect(notificationModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: new Types.ObjectId(userId),
          audience: NotificationAudience.USER,
          type: NotificationType.PAYMENT_APPROVED,
          read: false,
        }),
      );
    });

    it('replica a notificação administrativa para cada administrador', async () => {
      await service.notifyAdmins(
        NOTIFICATION_CONTENT.newSale('pedido-1', 3000, 2),
      );

      expect(notificationModelMock.create).toHaveBeenCalledTimes(2);
      expect(notificationModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: adminId,
          audience: NotificationAudience.ADMIN,
          type: NotificationType.NEW_SALE,
        }),
      );
    });

    it('não repete um alerta recorrente ainda não lido', async () => {
      notificationModelMock.exists.mockResolvedValue({ _id: 'existente' });

      await service.notifyAdmins(
        NOTIFICATION_CONTENT.stockLow('produto-1', 'Pipoca Grande', 3),
      );

      expect(notificationModelMock.create).not.toHaveBeenCalled();
    });

    it('não derruba o fluxo quando a gravação falha', async () => {
      notificationModelMock.create.mockRejectedValue(new Error('banco fora'));

      await expect(
        service.notifyUser(
          userId,
          NOTIFICATION_CONTENT.orderCancelled('pedido-1'),
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('visibilidade', () => {
    it('restringe a listagem do usuário comum às próprias notificações', async () => {
      await service.findForRequester({}, { userId, role: UserRole.USER });

      expect(notificationModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          user: new Types.ObjectId(userId),
          audience: NotificationAudience.USER,
        }),
      );
    });

    it('abre a caixa administrativa para o administrador', async () => {
      await service.findForRequester({}, { userId, role: UserRole.ADMIN });

      expect(notificationModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({ audience: NotificationAudience.ADMIN }),
      );
    });

    it('nega ao usuário comum a caixa administrativa', async () => {
      await expect(
        service.findForRequester(
          { audience: NotificationAudience.ADMIN },
          { userId, role: UserRole.USER },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('conta apenas as não lidas do próprio dono', async () => {
      countExec.mockResolvedValue(3);

      const total = await service.countUnread({
        userId,
        role: UserRole.USER,
      });

      expect(total).toBe(3);
      expect(notificationModelMock.countDocuments).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        audience: NotificationAudience.USER,
        read: false,
      });
    });
  });

  describe('leitura', () => {
    it('marca como lida somente uma notificação do próprio usuário', async () => {
      await service.markAsRead(new Types.ObjectId().toString(), {
        userId,
        role: UserRole.USER,
      });

      expect(notificationModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ user: new Types.ObjectId(userId) }),
        { $set: { read: true, readAt: expect.any(Date) as Date } },
        { new: true },
      );
    });

    it('devolve nulo para id inválido em vez de estourar', async () => {
      await expect(
        service.markAsRead('nao-e-um-id', { userId, role: UserRole.USER }),
      ).resolves.toBeNull();
    });

    it('marca todas as não lidas da caixa do solicitante', async () => {
      updateManyExec.mockResolvedValue({ modifiedCount: 4 });

      const updated = await service.markAllAsRead({
        userId,
        role: UserRole.USER,
      });

      expect(updated).toBe(4);
      expect(notificationModelMock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          user: new Types.ObjectId(userId),
          audience: NotificationAudience.USER,
          read: false,
        }),
        { $set: { read: true, readAt: expect.any(Date) as Date } },
      );
    });
  });
});
