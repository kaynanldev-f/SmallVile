"use client";

import { useEffect, useState, useTransition } from "react";
import { SessionInfo } from "@/src/types/session-types";
import { useSeatSelection } from "@/src/hooks/useSeatSelection";
import { SeatMapHeader } from "./SeatMapHeader";
import { SeatMapSidebar } from "./SeatMapSidebar";
import { SeatMapFooter } from "./SeatMapFooter";
import { TicketTypesPanel } from "./TicketTypesPanel";
import { resolveTicketPrice } from "@/src/utils/ticket";
import { SeatGrid } from "./SeatMapGrid";
import { SeatRow } from "@/src/utils/seat-rows";
import { getSessionDetails } from "@/src/actions/sessionActions";
import { createOrder, type SeatDto } from "@/src/actions/orderAction";
import BomboniereModal from "../bomboniere/BomboniereModal";
import { Product } from "@/src/components/layout/Carousel/ProductCard";
import { addProductsToOrder } from "@/src/actions/orderAction";
import type { CartItem } from "@/src/types/cart";
import { getBomboniere, type ProductResponse } from "../../actions/productAction";
import {
  clearSnackPreselection,
  readSnackPreselection,
} from "@/src/lib/snackPreselection";
import { useRouter } from "next/navigation";
import { useOrder } from "@/src/context/OrderContext";
import { isSessionPast } from "@/src/utils/date";

/** Sessão já realizada não seleciona assento: o clique não faz nada. */
const noSeatSelection = () => {};
import {
  SALES_STATUS_LABELS,
  isSessionOnSale,
} from "@/src/types/sales-control";
export default function SeatMapModal({
  isOpen,
  onClose,
  sessionId,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}) {
  const router = useRouter();
  const { setOrder } = useOrder();
  const { selectedSeats, selectedCount, toggleSeat, setSeatType } =
    useSeatSelection();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [seatRows, setSeatRows] = useState<SeatRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isOpenBomboniere, setIsOpenBomboniere] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [bebidas, setBebidas] = useState<Product[]>([]);
  const [comidas, setComidas] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Product[]>([]);
  const handleCheckout = async (cart: CartItem[]) => {
    try {
      if (!orderId) return;

      const products = cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

      const result = await addProductsToOrder(orderId, products);

      if (!result.success) {
        setProductsError(result.error ?? "Erro ao adicionar produtos.");
        return;
      }

      setProductsError(null);

      // A pré-seleção da Home já virou pedido: mantê-la faria os mesmos itens
      // reaparecerem na próxima compra.
      clearSnackPreselection();

      setOrder((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          products: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: result.order.totalAmount ?? result.order.total ?? prev.total,
        };
      });

      setIsOpenBomboniere(false);
      onClose();
      router.push(`/payment/${orderId}`);
    } catch (error) {
      console.error("[bomboniere] falha ao adicionar produtos", error);

      setProductsError(
        "Não foi possível adicionar os produtos. Tente novamente.",
      );
    }
  };
  useEffect(() => {
    if (!isOpen) return;

    getSessionDetails(sessionId).then((result) => {
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      setSessionInfo(result.sessionInfo);
      setSeatRows(result.seatRows);
    });

    return () => {
      setSessionInfo(null);
      setSeatRows([]);
      setLoadError(null);
      setPurchaseError(null);
    };
  }, [isOpen, sessionId]);

  useEffect(() => {
    async function loadProducts() {
      const result = await getBomboniere();

      if (!result.success || !result.products) {
        setProductsError(result.error ?? "Erro ao carregar a bomboniere.");
        return;
      }

      setProductsError(null);

      const products = result.products;

      // `price` do backend vem em centavos; o card da bomboniere trabalha em
      // reais.
      const toProduct = (product: ProductResponse): Product => ({
        id: product._id,
        name: product.name,
        size: product.size ?? "",
        price: product.price / 100,
        limit: Math.max(
          0,
          Math.min(product.maxLimit || 0, product.quantity || 0),
        ),
        image: product.imageUrl,
      });

      const byCategory = (category: ProductResponse["category"]) =>
        products.filter((p) => p.category === category).map(toProduct);

      setBebidas(byCategory("BEBIDAS"));
      setComidas(byCategory("COMIDAS"));
      setCombos(byCategory("COMBOS"));

      // Traz o que o usuário já tinha separado na Home, limitado ao que a
      // sessão de fato permite comprar.
      const preselection = readSnackPreselection();

      if (!preselection.length) return;

      const catalog = new Map(products.map((p) => [p._id, p]));

      setCart(
        preselection.flatMap(({ productId, quantity }) => {
          const product = catalog.get(productId);

          if (!product) return [];

          const limit = Math.max(
            0,
            Math.min(product.maxLimit || 0, product.quantity || 0),
          );

          if (limit <= 0) return [];

          return [
            {
              id: product._id,
              name: product.name,
              size: product.size ?? "",
              price: product.price / 100,
              quantity: Math.min(quantity, limit),
            },
          ];
        }),
      );
    }

    if (isOpenBomboniere) {
      loadProducts();
    }
  }, [isOpenBomboniere]);
  const totalSeatsCount = seatRows.reduce(
    (total, { seats }) => total + seats.filter((s) => s !== null).length,
    0,
  );

  // Fora do período de venda o botão fica desabilitado, com o motivo na tela.
  const salesStatus = sessionInfo?.salesStatus;

  // Sessão que já começou não vende, independente do controle de venda do
  // administrador. Vai pelo mesmo canal de bloqueio: desabilita o botão do
  // rodapé, mostra o aviso e barra `handleConfirm` antes de `createOrder`.
  const alreadyStarted = !!sessionInfo && isSessionPast(sessionInfo.dateTime);

  const salesBlockedMessage = alreadyStarted
    ? "Sessão encerrada. Não é possível comprar ingressos para uma sessão que já aconteceu."
    : salesStatus && !isSessionOnSale({ salesStatus })
      ? `${SALES_STATUS_LABELS[salesStatus]}. Esta sessão não está disponível para compra.`
      : undefined;

  async function handleConfirm() {
    if (!sessionInfo) {
      setPurchaseError("Sessão não encontrada.");
      return;
    }

    if (salesBlockedMessage) {
      setPurchaseError(salesBlockedMessage);
      return;
    }

    if (selectedSeats.length === 0) {
      setPurchaseError("Selecione pelo menos um assento.");
      return;
    }

    setPurchaseError(null);

    startTransition(async () => {
      try {
        const seats: SeatDto[] = selectedSeats.map((seat) => ({
          seatNumber: seat.seatNumber,
          type: seat.type,
        }));

        const result = await createOrder(sessionId, seats);

        if (!result.success || !result.order) {
          setPurchaseError(result.error ?? "Erro ao criar pedido.");
          return;
        }

        const order = result.order;

        const orderData = {
          _id: order._id,
          movie: sessionInfo.movieTitle,
          session: `${sessionInfo.date} às ${sessionInfo.time}`,
          room: sessionInfo.room,

          seats: selectedSeats.map((seat) => seat.seatNumber),

          tickets: selectedSeats.map((seat) => ({
            seatNumber: seat.seatNumber,
            type: seat.type,
            price: resolveTicketPrice(
              sessionInfo.prices,
              sessionInfo.price,
              seat.type,
            ),
          })),

          products: [],

          // `totalAmount` é o campo do pedido no backend; `total` era um nome
          // que nunca chegou a existir na resposta e deixava o resumo em zero.
          total: order.totalAmount ?? order.total ?? 0,
          discount: order.discountAmount ?? 0,
        };

        setOrder(orderData);

        setOrderId(order._id);

        setIsOpenBomboniere(true);
      } catch (error) {
        console.error("Erro ao criar pedido:", error);

        setPurchaseError("Não foi possível criar o pedido.");
      }
    });
  }

  if (!isOpen) return null;

  const handleAdd = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.limit),
              }
            : item,
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  const handleRemove = (productId: string) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 lg:p-10"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="
        relative
        w-full
        max-w-7xl
        h-[95vh]
        lg:h-auto
        lg:max-h-[90vh]
        overflow-y-auto
        rounded-2xl
        bg-[#181818]
        border
        border-neutral-800
        p-4
        sm:p-6
        text-white
        shadow-2xl
      "
          onClick={(e) => e.stopPropagation()}
        >
          <SeatMapHeader onClose={onClose} />

          {loadError && (
            <p className="py-8 text-center text-sm text-red-500">{loadError}</p>
          )}

          {!loadError && !sessionInfo && (
            <p className="py-8 text-center text-sm text-neutral-400">
              Carregando sessão...
            </p>
          )}

          {sessionInfo && (
            <>
              <div
                className="
              mt-6
              flex
              flex-col
              gap-8
              xl:flex-row
              xl:items-start
              xl:justify-between
            "
              >
                <div className="w-full xl:flex-1">
                  <SeatGrid
                    seatRows={seatRows}
                    selectedSeats={selectedSeats}
                    toggleSeat={alreadyStarted ? noSeatSelection : toggleSeat}
                    screenType={sessionInfo.screenType}
                    room={sessionInfo.room}
                  />
                </div>

                <div className="flex w-full flex-col gap-4 xl:w-[320px]">
                  <SeatMapSidebar
                    totalSeatsCount={totalSeatsCount}
                    selectedCount={selectedCount}
                  />

                  <TicketTypesPanel
                    selectedSeats={selectedSeats}
                    sessionPrice={sessionInfo.price}
                    prices={sessionInfo.prices}
                    onChangeType={setSeatType}
                  />
                </div>
              </div>

              {salesBlockedMessage && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400"
                >
                  {salesBlockedMessage}
                </p>
              )}

              {purchaseError && (
                <p className="mt-4 text-center text-sm text-red-500">
                  {purchaseError}
                </p>
              )}

              <div className="mt-6">
                <SeatMapFooter
                  session={sessionInfo}
                  selectedCount={selectedCount}
                  onConfirm={handleConfirm}
                  isLoading={isPending}
                  blockedMessage={salesBlockedMessage}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <BomboniereModal
        isOpen={isOpenBomboniere}
        onClose={() => setIsOpenBomboniere(false)}
        bebidas={bebidas}
        comidas={comidas}
        combos={combos}
        cart={cart}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onCheckout={handleCheckout}
        error={productsError}
      />
    </>
  );
}
