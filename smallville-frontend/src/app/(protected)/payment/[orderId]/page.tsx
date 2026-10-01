"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import {
  createPayment,
  getPaymentStatus,
  cancelPayment,
} from "@/src/actions/paymentActions";

import { getOrder } from "@/src/actions/orderAction";

import PaymentMethods from "@/src/components/payments/PaymentsMethods";
import PixPayment from "@/src/components/payments/PixPayment";
import PaymentButtons from "@/src/components/payments/PaymentButton";
import CancelPurchaseModal from "@/src/components/payments/CancelPurchaseModal";
import ContPurchaseSummary from "@/src/components/payments/PurchaseSummary";
import { useOrder } from "@/src/context/OrderContext";
import {
  FINAL_PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PaymentMethod,
  PaymentStatus,
  PurchaseSummary,
} from "@/src/types/payments";

import OrderConfirmedModal from "@/src/components/confirmation/OrderConfirmed";

/** Espaço no topo da tela de pagamento. */
const PAGE_TOP_SPACING = "pt-24";

interface Payment {
  _id: string;
  status: PaymentStatus;
  /** Motivo da recusa devolvido pelo gateway. */
  failureReason?: string;

  pix?: {
    qrCode: string;
    copyPasteCode: string;
    expiresAt: string;
  };
}

/** Mensagem para os desfechos que não são aprovação. */
function failureMessage(payment: Payment): string {
  if (payment.status === PAYMENT_STATUSES.EXPIRED) {
    return "O prazo para pagamento expirou. Escolha uma forma de pagamento e tente novamente.";
  }

  return (
    payment.failureReason ??
    "Pagamento não autorizado. Escolha outra forma de pagamento ou tente novamente."
  );
}

export default function PaymentPage({
  params,
}: {
  params: Promise<{
    orderId: string;
  }>;
}) {
  const router = useRouter();
  const { orderId } = use(params);
  const { clearOrder } = useOrder();

  const [order, setOrder] = useState<PurchaseSummary | undefined>();

  const [payment, setPayment] = useState<Payment | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const checkingPayment = useRef(false);

  /*
   * Busca pedido
   */
  useEffect(() => {
    let mounted = true;

    async function loadOrder() {
      try {
        setLoadingOrder(true);

        const data = await getOrder(orderId);

        if (mounted) {
          setOrder(data);
        }
      } catch (error) {
        if (mounted) {
          setError(
            error instanceof Error ? error.message : "Erro ao carregar pedido",
          );
        }
      } finally {
        if (mounted) {
          setLoadingOrder(false);
        }
      }
    }

    loadOrder();

    return () => {
      mounted = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (paymentMethod !== PAYMENT_METHODS.PIX) return;
    if (!order?._id) return;
    if (payment) return;

    const orderId = order._id;
    async function createPix() {
      try {
        setLoadingPayment(true);

        const response = await createPayment(orderId, PAYMENT_METHODS.PIX);

        setPayment(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao gerar PIX.");
      } finally {
        setLoadingPayment(false);
      }
    }
    createPix();
  }, [paymentMethod, order?._id, payment]);

  /** Acompanhamento do pagamento. */
  useEffect(() => {
    if (!payment?._id || !order) return;
    if (FINAL_PAYMENT_STATUSES.includes(payment.status)) return;

    const interval = setInterval(async () => {
      if (checkingPayment.current) return;

      checkingPayment.current = true;

      try {
        const result = await getPaymentStatus(payment._id);

        if (!result) {
          return;
        }
        if (result.status === PAYMENT_STATUSES.APPROVED) {
          clearInterval(interval);

          clearOrder();

          // O status guardado é o que a API devolveu: é ele que faz o modal
          // sair de "Em análise" para "Compra aprovada" e liberar os ingressos.
          setPayment(result);
          setIsConfirmModalOpen(true);
        }

        if (
          result.status === PAYMENT_STATUSES.REFUSED ||
          result.status === PAYMENT_STATUSES.EXPIRED
        ) {
          clearInterval(interval);

          // O pagamento continua em estado no modal (que passa a mostrar
          // "Compra recusada" com o motivo). A volta ao estado de escolha
          // acontece ao fechar o modal, em `handleCloseConfirmation`.
          setPayment(result);
          setError(failureMessage(result));
        }
      } catch (error) {
        console.error("Erro verificando pagamento:", error);

        clearInterval(interval);
      } finally {
        checkingPayment.current = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [payment, order, clearOrder]);

  async function handleConfirmPayment() {
    if (!paymentMethod) {
      setError("Selecione uma forma de pagamento.");
      return;
    }

    if (!order?._id) {
      setError("Pedido inválido.");
      return;
    }

    /** Só PIX. */
    if (paymentMethod !== PAYMENT_METHODS.PIX) {
      setError(
        "Esta forma de pagamento ainda não está disponível. Utilize o PIX.",
      );
      return;
    }

    try {
      setLoadingPayment(true);
      setError(null);

      const response = await createPayment(order._id, PAYMENT_METHODS.PIX);

      setPayment(response);

      /**
       * Compra confirmada: o modal do ingresso abre já aqui, com o status real
       * que veio da API — pendente, ou seja "Em análise".
       */
      setIsConfirmModalOpen(true);
    } catch (error) {
      console.error(error);

      setError(error instanceof Error ? error.message : "Erro ao gerar PIX.");
    } finally {
      setLoadingPayment(false);
    }
  }

  /** Fecha o modal do ingresso. */
  function handleCloseConfirmation() {
    setIsConfirmModalOpen(false);

    if (
      payment?.status === PAYMENT_STATUSES.REFUSED ||
      payment?.status === PAYMENT_STATUSES.EXPIRED
    ) {
      setPayment(null);
      setPaymentMethod(null);
    }
  }

  async function handleCancelPurchase() {
    if (!order) return;

    try {
      setLoadingPayment(true);

      await cancelPayment(order._id);

      clearOrder();

      router.push("/");
    } catch (error) {
      console.error(error);

      setError("Erro ao cancelar pedido.");
    } finally {
      setLoadingPayment(false);

      setCancelModalOpen(false);
    }
  }

  if (loadingOrder && !order) {
    return (
      <div className={`${PAGE_TOP_SPACING} flex min-h-screen items-center justify-center text-white`}>
        Carregando pedido...
      </div>
    );
  }

  if (!order) {
    return (
      <div className={`${PAGE_TOP_SPACING} flex min-h-screen items-center justify-center px-6 text-center text-red-500`}>
        {error ?? "Pedido não encontrado"}
      </div>
    );
  }

  return (
    <main className={`${PAGE_TOP_SPACING} mx-auto max-w-7xl px-4 pb-12 sm:px-6`}>
      {error && (
        <p
          className="
          mb-4
          rounded-lg
          bg-red-500/10
          p-3
          text-center
          text-red-400
        "
        >
          {error}
        </p>
      )}

      <section
        className="
        grid
        gap-8
        lg:grid-cols-[340px_1fr]
      "
      >
        <ContPurchaseSummary purchase={order} />

        <div className="space-y-6">
          <PaymentMethods value={paymentMethod} onChange={setPaymentMethod} />

          {paymentMethod === PAYMENT_METHODS.PIX && payment?.pix && (
            <PixPayment
              qrCode={payment.pix.qrCode}
              copyPasteCode={payment.pix.copyPasteCode}
              expiresIn={new Date(payment.pix.expiresAt).getTime()}
            />
          )}

          <PaymentButtons
            showConfirm={paymentMethod !== PAYMENT_METHODS.PIX}
            disabled={!paymentMethod || loadingPayment}
            loading={loadingPayment}
            onConfirm={handleConfirmPayment}
            onBack={() => router.back()}
            onCancel={() => setCancelModalOpen(true)}
          />
        </div>
      </section>

      <CancelPurchaseModal
        open={cancelModalOpen}
        loading={loadingPayment}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelPurchase}
      />
      <OrderConfirmedModal
        isOpen={isConfirmModalOpen}
        onClose={handleCloseConfirmation}
        order={order}
        paymentStatus={payment?.status}
        failureReason={payment?.failureReason}
      />
    </main>
  );
}
