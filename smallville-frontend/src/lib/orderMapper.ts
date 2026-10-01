/** Tradução da resposta crua de `/orders` e `/refunds` para o `Order` da tela. */

import type { MovieLanguage, ProductCategory, ProductSize, RoomType } from "@/src/types/admin";
import type {
  Order,
  OrderProductItem,
  OrderSeatItem,
  OrderStatus,
  RefundInfo,
} from "@/src/types/order";

interface RawCinema {
  _id: string;
  name: string;
  city?: string;
}

interface RawMovie {
  _id: string;
  title: string;
  banner?: string;
}

interface RawSession {
  _id: string;
  movieTitle: string;
  roomName: string;
  roomType?: RoomType;
  language?: MovieLanguage;
  dateTime: string;
  price: number;
  cinemaId?: RawCinema | string;
  movieId?: RawMovie | string;
}

interface RawProduct {
  _id: string;
  name: string;
  category?: ProductCategory;
  size?: ProductSize;
  /** Preço unitário em centavos. */
  price?: number;
  imageUrl?: string;
}

/** `order.refund` cru: datas em ISO e ids como string. */
interface RawRefund {
  requestedAt?: string;
  requestedBy?: string;
  reason?: string;
  amount?: number;
  previousStatus?: OrderStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionReason?: string;
}

export interface RawOrder {
  _id: string;
  user?: { _id: string; name?: string; surname?: string; email?: string } | string;
  session?: RawSession | string;
  seats?: OrderSeatItem[];
  tickets?: unknown[];
  products?: {
    product?: RawProduct | string;
    quantity: number;
    /** Total da linha em centavos. */
    pricePaid: number;
  }[];
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  paymentApproved: boolean;
  ticketGeneratedAt?: string;
  createdAt: string;
  refund?: RawRefund;
  /** Motivo da recusa. */
  paymentFailureReason?: string;
  payment?: { status?: string; failureReason?: string };
}

/** Envelope de `GET /orders` — `{ items, total, page, limit }`, sem `data`. */
export interface RawOrdersPage {
  items?: RawOrder[];
  total?: number;
  page?: number;
  limit?: number;
}

function isObject<T>(value: T | string | undefined): value is T {
  return typeof value === "object" && value !== null;
}

/** `refund` só existe no pedido depois que alguém solicitou. */
function toRefundInfo(raw?: RawRefund): RefundInfo | undefined {
  if (!raw?.requestedAt) return undefined;

  return {
    requestedAt: raw.requestedAt,
    requestedBy: raw.requestedBy,
    reason: raw.reason,
    amount: raw.amount,
    previousStatus: raw.previousStatus,
    resolvedAt: raw.resolvedAt,
    resolvedBy: raw.resolvedBy,
    resolutionReason: raw.resolutionReason,
  };
}

export function toOrder(raw: RawOrder): Order {
  const session = isObject<RawSession>(raw.session) ? raw.session : undefined;
  const movie = session && isObject<RawMovie>(session.movieId)
    ? session.movieId
    : undefined;
  const cinema = session && isObject<RawCinema>(session.cinemaId)
    ? session.cinemaId
    : undefined;

  const products: OrderProductItem[] = (raw.products ?? []).flatMap((item) => {
    const product = isObject<RawProduct>(item.product)
      ? item.product
      : undefined;

    // Produto não populado só acontece se o registro tiver sido removido do
    // catálogo; nesse caso ainda mostramos quantidade e valor pagos, que são
    // dados do próprio pedido.
    return [
      {
        id: product?._id ?? (typeof item.product === "string" ? item.product : ""),
        name: product?.name ?? "Produto indisponível",
        category: product?.category,
        size: product?.size,
        imageUrl: product?.imageUrl,
        quantity: item.quantity,
        unitPrice: product?.price ?? Math.round(item.pricePaid / item.quantity),
        pricePaid: item.pricePaid,
      },
    ];
  });

  const seats = raw.seats ?? [];

  const ticketsTotal = seats.reduce((acc, seat) => acc + seat.pricePaid, 0);
  const productsTotal = products.reduce(
    (acc, product) => acc + product.pricePaid,
    0,
  );

  const rawUser = raw.user;

  return {
    id: raw._id,
    status: raw.status,
    createdAt: raw.createdAt,

    seats,
    products,
    ticketsCount: raw.tickets?.length ?? 0,

    subtotal: raw.subtotalAmount ?? 0,
    discount: raw.discountAmount ?? 0,
    total: raw.totalAmount ?? 0,
    ticketsTotal,
    productsTotal,

    paymentApproved: !!raw.paymentApproved,
    ticketAvailable: !!raw.ticketGeneratedAt && (raw.tickets?.length ?? 0) > 0,

    paymentFailureReason:
      raw.paymentFailureReason ?? raw.payment?.failureReason ?? undefined,

    refund: toRefundInfo(raw.refund),

    movieTitle: movie?.title ?? session?.movieTitle,
    movieBanner: movie?.banner,
    roomName: session?.roomName,
    roomType: session?.roomType,
    language: session?.language,
    sessionDateTime: session?.dateTime,
    cinemaName: cinema?.name,

    user: isObject(rawUser)
      ? {
          id: rawUser._id,
          name: [rawUser.name, rawUser.surname].filter(Boolean).join(" "),
          email: rawUser.email ?? "",
        }
      : undefined,
  };
}
