import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/users/schemas/users.schema';
import { UserRole } from 'src/users/enums/user-roles.enum';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';
import { NotificationAudience } from '../enums/notification-audience.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { QueryNotificationsDto } from '../dtos/query-notifications.dto';
import { NOTIFICATION_MESSAGES } from '../messages/notifications.message';

export interface NotificationRequester {
  userId: string;
  role?: UserRole;
}

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /** Notifica o comprador. */
  async notifyUser(userId: string, input: NotifyInput): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      return;
    }

    try {
      await this.createFor(
        new Types.ObjectId(userId),
        NotificationAudience.USER,
        input,
      );
    } catch (error) {
      this.logNotificationFailure(input.type, error);
    }
  }

  /** Notifica a operação do cinema. */
  async notifyAdmins(input: NotifyInput): Promise<void> {
    try {
      const admins = await this.userModel
        .find({ role: UserRole.ADMIN })
        .select('_id')
        .lean()
        .exec();

      for (const admin of admins) {
        await this.createFor(admin._id, NotificationAudience.ADMIN, input);
      }
    } catch (error) {
      this.logNotificationFailure(input.type, error);
    }
  }

  async findForRequester(
    query: QueryNotificationsDto,
    requester: NotificationRequester,
  ) {
    const audience = this.resolveAudience(query.audience, requester);

    const filter: Record<string, unknown> = {
      user: new Types.ObjectId(requester.userId),
      audience,
    };

    if (typeof query.read === 'boolean') {
      filter.read = query.read;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.countUnread({ ...requester }, audience),
    ]);

    return {
      items,
      total,
      page,
      limit,
      unreadCount,
      ...(total === 0
        ? { message: NOTIFICATION_MESSAGES.NO_NOTIFICATIONS }
        : {}),
    };
  }

  /** Contador do sino. */
  async countUnread(
    requester: NotificationRequester,
    audience?: NotificationAudience,
  ): Promise<number> {
    const target = this.resolveAudience(audience, requester);

    return this.notificationModel
      .countDocuments({
        user: new Types.ObjectId(requester.userId),
        audience: target,
        read: false,
      })
      .exec();
  }

  /** Marca uma notificação como lida. */
  async markAsRead(
    notificationId: string,
    requester: NotificationRequester,
  ): Promise<NotificationDocument | null> {
    if (!Types.ObjectId.isValid(notificationId)) {
      return null;
    }

    return this.notificationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId),
          user: new Types.ObjectId(requester.userId),
        },
        { $set: { read: true, readAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  async markAllAsRead(
    requester: NotificationRequester,
    audience?: NotificationAudience,
  ): Promise<number> {
    const target = this.resolveAudience(audience, requester);

    const result = await this.notificationModel
      .updateMany(
        {
          user: new Types.ObjectId(requester.userId),
          audience: target,
          read: false,
        },
        { $set: { read: true, readAt: new Date() } },
      )
      .exec();

    return result.modifiedCount;
  }

  /**
   * Regra de segurança das duas caixas: a de administrador só existe para
   * quem é administrador.
   */
  private resolveAudience(
    requested: NotificationAudience | undefined,
    requester: NotificationRequester,
  ): NotificationAudience {
    if (requested === NotificationAudience.ADMIN) {
      if (requester.role !== UserRole.ADMIN) {
        throw new ForbiddenException(NOTIFICATION_MESSAGES.AUDIENCE_FORBIDDEN);
      }
      return NotificationAudience.ADMIN;
    }

    if (requested === NotificationAudience.USER) {
      return NotificationAudience.USER;
    }

    // Sem filtro explícito: o administrador abre o sino do painel, o
    // usuário comum abre o dele.
    return requester.role === UserRole.ADMIN
      ? NotificationAudience.ADMIN
      : NotificationAudience.USER;
  }

  private async createFor(
    user: Types.ObjectId,
    audience: NotificationAudience,
    input: NotifyInput,
  ): Promise<void> {
    if (input.dedupeKey) {
      const pending = await this.notificationModel.exists({
        user,
        dedupeKey: input.dedupeKey,
        read: false,
      });

      // Já existe o mesmo aviso não lido: repetir só encheria o sino.
      if (pending) {
        return;
      }
    }

    await this.notificationModel.create({
      user,
      audience,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata ?? {},
      dedupeKey: input.dedupeKey,
      read: false,
    });
  }

  private logNotificationFailure(type: NotificationType, error: unknown): void {
    this.logger.error(
      `Falha ao registrar a notificação ${type}: ${
        error instanceof Error ? error.message : 'erro desconhecido'
      }`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
