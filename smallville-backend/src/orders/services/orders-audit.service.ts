import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  OrderAuditLog,
  OrderAuditLogDocument,
} from '../schemas/order-audit-log.schema';
import {
  OrderAuditOperation,
  OrderAuditResult,
} from '../enums/order-audit-operation.enum';

interface RegisterAuditParams {
  userId: string;
  orderId?: string;
  operation: OrderAuditOperation;
  result: OrderAuditResult;
  sessionId: string;
}

@Injectable()
export class OrdersAuditService {
  private readonly logger = new Logger(OrdersAuditService.name);

  constructor(
    @InjectModel(OrderAuditLog.name)
    private readonly auditModel: Model<OrderAuditLogDocument>,
  ) {}

  /** Histórico de um pedido, do mais recente para o mais antigo. */
  async findForOrder(orderId: string): Promise<OrderAuditLogDocument[]> {
    if (!Types.ObjectId.isValid(orderId)) {
      return [];
    }

    return this.auditModel
      .find({ order: new Types.ObjectId(orderId) })
      .populate({ path: 'user', select: 'name surname email role' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async register(params: RegisterAuditParams): Promise<void> {
    try {
      await this.auditModel.create({
        user: new Types.ObjectId(params.userId),
        order: params.orderId ? new Types.ObjectId(params.orderId) : undefined,
        operation: params.operation,
        result: params.result,
        sessionId: params.sessionId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';

      this.logger.error(
        `Falha ao registrar auditoria (${params.operation}): ${message}`,
      );
    }
  }
}
