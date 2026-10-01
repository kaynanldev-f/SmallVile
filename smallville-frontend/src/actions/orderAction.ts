"use server";

import { cookies } from "next/headers";
import { TicketType } from "@/src/types/ticket";
import { TICKET_TYPE_LABELS, ticketPriceFromSession } from "@/src/utils/ticket";

export interface SeatDto {
  seatNumber: string;
  type: TicketType;
}

interface OrderSeat {
  seatNumber: string;
  type: TicketType;
  /** Valor oficial do ingresso, em centavos, calculado pelo backend. */
  pricePaid?: number;
}

interface OrderProduct {
  product?:
    | {
        _id: string;
        name: string;
      }
    | string;

  quantity: number;
  pricePaid: number;
}

export async function createOrder(sessionId: string, seats: SeatDto[]) {
  const cookieStore = await cookies();

  const token = cookieStore.get("auth_token")?.value;

  const response = await fetch(`${process.env.API_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      seats,
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.message ?? "Erro ao criar pedido",
    };
  }

  return {
    success: true,
    order: data.data ?? data,
  };
}

export async function addProductsToOrder(
  orderId: string,
  products: {
    productId: string;
    quantity: number;
  }[],
) {
  const token = (await cookies()).get("auth_token")?.value;

  const response = await fetch(
    `${process.env.API_URL}/orders/${orderId}/products`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        products,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.message ?? "Erro ao adicionar produtos",
    };
  }

  return {
    success: true,
    order: data.data ?? data,
  };
}

export async function getOrder(orderId: string) {
  const token = (await cookies()).get("auth_token")?.value;

  const response = await fetch(
    `${process.env.API_URL}/orders/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Erro ao buscar pedido");
  }

  const order = data.data ?? data;

  const formattedOrder = {
    _id: order._id,

    movie: order.session?.movieTitle ?? "Filme",

    session: order.session?.dateTime ?? "Sessão",

    room: order.session?.roomName ?? "Sala",

    seats: order.seats?.map((seat: OrderSeat) => seat.seatNumber) ?? [],

    tickets:
      order.seats?.map((seat: OrderSeat) => ({
        id: seat.seatNumber,
        seatNumber: seat.seatNumber,
        type: seat.type,

        description: `${TICKET_TYPE_LABELS[seat.type] ?? seat.type} · Assento ${seat.seatNumber}`,

        /** O valor exibido é o que o backend gravou no pedido. */
        price:
          seat.pricePaid ??
          ticketPriceFromSession(order.session?.price, seat.type),
      })) ?? [],

    products:
      order.products?.map((item: OrderProduct) => ({
        id: typeof item.product === "object" ? item.product._id : item.product,

        name: typeof item.product === "object" ? item.product.name : "Produto",

        quantity: item.quantity,

        price: item.pricePaid,
      })) ?? [],

    discount: order.discountAmount ?? 0,

    total: order.totalAmount ?? 0,
  };

  return formattedOrder;
}

/** Não existe mais uma ação de "checkout" no frontend. */
