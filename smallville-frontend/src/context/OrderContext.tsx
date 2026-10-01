"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Dispatch, SetStateAction } from "react";

type Ticket = {
  seatNumber: string;
  type: string;
  price: number;
};

type Product = {
  name: string;
  quantity: number;
  price: number;
};

export interface OrderData {
  _id: string;
  movie: string;
  session: string;
  room: string;
  seats: string[];
  tickets: Ticket[];
  products: Product[];
  total: number;
  discount: number;
}

interface OrderContextType {
  order: OrderData | null;
  setOrder: Dispatch<SetStateAction<OrderData | null>>;
  clearOrder: () => void;
}

const OrderContext = createContext<OrderContextType>({} as OrderContextType);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<OrderData | null>(null);

  function clearOrder() {
    setOrder(null);
  }

  return (
    <OrderContext.Provider
      value={{
        order,
        setOrder,
        clearOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  return useContext(OrderContext);
}
