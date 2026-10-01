"use client";
import CloseIcon from "@mui/icons-material/Close";
import { ShoppingCart } from "@mui/icons-material";
import ProductCarousel from "@/src/components/layout/Carousel/ProductCarousel";
import type { CartItem } from "@/src/types/cart";
import { Product } from "@/src/components/layout/Carousel/ProductCard";
import Button from "@/src/components/ui/Button";
import { useState, useEffect } from "react";
interface BomboniereModalProps {
  isOpen: boolean;
  onClose: () => void;
  bebidas: Product[];
  comidas: Product[];
  combos: Product[];
  cart: CartItem[];
  onAdd: (product: Product) => void;
  onRemove: (id: string) => void;
  onCheckout: (cart: CartItem[]) => void;
  /** Falha ao carregar o catálogo ou ao gravar os produtos no pedido. */
  error?: string | null;
}
export default function BomboniereModal({
  isOpen,
  onClose,
  bebidas,
  comidas,
  combos,
  cart,
  onAdd,
  onRemove,
  onCheckout,
  error,
}: BomboniereModalProps) {
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  if (!isOpen) return null;
  const totalItems = cart.reduce((a, b) => a + b.quantity, 0);
  const totalPrice = cart.reduce((a, b) => a + b.quantity * b.price, 0);

  return (
    <div className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-md ">
      {" "}
      <div className="flex h-dvh items-center justify-center p-2 sm:p-4 lg:p-6">
        {" "}
        <div className="relative flex h-full max-h-[95dvh]  w-full max-w-7xl flex-col overflow-hidden bg-deep-black sm:max-h-[95vh] sm:rounded-2xl xl:max-h-[92vh] xl:rounded-3xl">
          {" "}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gray-surface transition hover:bg-red-cinema sm:right-6 sm:top-6 sm:h-11 sm:w-11"
          >
            {" "}
            <CloseIcon />{" "}
          </button>{" "}
          <div className="grid h-full overflow-hidden grid-cols-1 xl:grid-cols-[1fr_380px]">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="bg-deep-black px-4 py-5 sm:px-6 lg:px-8">
                <h1 className="text-xl font-bold sm:text-3xl lg:text-4xl">
                  Bomboniere
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-grayScale-400 sm:text-base">
                  Complete sua experiência com pipoca fresquinha, bebidas
                  geladas e os melhores snacks.
                </p>

                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                  >
                    {error}
                  </p>
                )}
              </div>

              <div className="custom-scroll flex-1 overflow-y-auto px-4 pb-5 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-8 rounded-2xl border border-grayScale-600 bg-deep-black p-4 sm:p-6">
                  {" "}
                  <ProductCarousel
                    title="Combos Exclusivos"
                    products={combos}
                    cart={cart}
                    onAdd={onAdd}
                    onRemove={onRemove}
                  />{" "}
                  <ProductCarousel
                    title="Pipoca e Snacks"
                    products={comidas}
                    cart={cart}
                    onAdd={onAdd}
                    onRemove={onRemove}
                  />{" "}
                  <ProductCarousel
                    title="Drinks & Refrigerantes"
                    products={bebidas}
                    cart={cart}
                    onAdd={onAdd}
                    onRemove={onRemove}
                  />{" "}
                </div>
              </div>
            </div>
            <aside className="hidden xl:flex border-l border-grayScale-600 bg-deep-black">
              <div className="flex h-full flex-col">
                {" "}
                {/* Header */}{" "}
                <div className="border-b border-grayScale-600 p-6">
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <h2 className="flex items-center gap-3 text-2xl font-bold ">
                      {" "}
                      <ShoppingCart /> Carrinho{" "}
                    </h2>{" "}
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-red-cinema px-2 text-sm font-bold">
                      {" "}
                      {totalItems}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                {/* Produtos */}{" "}
                <div className="flex-1 overflow-y-auto custom-scroll p-6">
                  {" "}
                  {cart.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-grayScale-400">
                      {" "}
                      Nenhum produto selecionado.{" "}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {" "}
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-grayScale-600 bg-[#161616] p-3 sm:p-4"
                        >
                          {" "}
                          <div className="flex justify-between gap-3">
                            {" "}
                            <div>
                              {" "}
                              <p className="font-semibold">{item.name}</p>{" "}
                              <p className="mt-1 text-sm text-grayScale-400">
                                {" "}
                                {item.size}{" "}
                              </p>{" "}
                              <p className="mt-2 text-sm">
                                {" "}
                                Quantidade:{" "}
                                <span className="font-bold">
                                  {" "}
                                  {item.quantity}{" "}
                                </span>{" "}
                              </p>{" "}
                            </div>{" "}
                            <span className="font-bold text-red-cinema whitespace-nowrap">
                              {" "}
                              R${" "}
                              {(item.price * item.quantity)
                                .toFixed(2)
                                .replace(".", ",")}{" "}
                            </span>{" "}
                          </div>{" "}
                        </div>
                      ))}{" "}
                    </div>
                  )}{" "}
                </div>{" "}
                {/* Footer */}{" "}
                <div className="border-t border-grayScale-600 bg-deep-black p-6">
                  {" "}
                  <div className="mb-5 items-center mt-2 flex justify-between text-2xl font-black">
                    {" "}
                    <span className="text-grayScale-300">Total</span>{" "}
                    <span className="text-2xl font-black text-red-cinema">
                      {" "}
                      R$ {totalPrice.toFixed(2).replace(".", ",")}{" "}
                    </span>{" "}
                  </div>{" "}
                  <Button className="w-full" onClick={() => onCheckout(cart)}>
                    {" "}
                    Finalizar Pedido{" "}
                  </Button>{" "}
                </div>{" "}
              </div>{" "}
            </aside>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="mb-6 flex items-center justify-between">
        {" "}
        <h2 className="text-xl font-bold">Carrinho</h2>{" "}
        <button onClick={() => setCartOpen(false)}>
          {" "}
          <CloseIcon />{" "}
        </button>{" "}
      </div>{" "}
      {!cartOpen && totalItems > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="
      fixed
      bottom-5
      left-4
      right-4
      z-[9999]
      flex
      items-center
      justify-between
      rounded-2xl
      bg-red-cinema
      px-5
      py-4
      font-bold
      shadow-2xl
      xl:hidden
    "
        >
          <div className="flex items-center gap-2">
            <ShoppingCart />
            <span>{totalItems} itens</span>
          </div>

          <span>R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
        </button>
      )}
      {cartOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/70 lg:hidden">
          {" "}
          <div
            className="absolute inset-0"
            onClick={() => setCartOpen(false)}
          />{" "}
          <div className="absolute bottom-0 left-0 right-0 flex max-h-[90dvh] flex-col rounded-t-3xl bg-deep-black">
            {" "}
            <div className="flex items-center justify-between border-b border-grayScale-600 p-5">
              {" "}
              <h2 className="flex items-center gap-2 text-xl font-bold">
                {" "}
                <ShoppingCart /> Carrinho{" "}
              </h2>{" "}
              <button onClick={() => setCartOpen(false)}>
                {" "}
                <CloseIcon />{" "}
              </button>{" "}
            </div>{" "}
            <div className="flex-1 overflow-y-auto custom-scroll p-5">
              {" "}
              {cart.length === 0 ? (
                <p className="py-10 text-center text-grayScale-400">
                  {" "}
                  Nenhum produto.{" "}
                </p>
              ) : (
                <div className="space-y-4">
                  {" "}
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-grayScale-600 p-4"
                    >
                      {" "}
                      <div className="flex justify-between">
                        {" "}
                        <div>
                          {" "}
                          <p className="font-semibold">{item.name}</p>{" "}
                          <p className="text-sm text-grayScale-400">
                            {" "}
                            {item.quantity}x {item.size}{" "}
                          </p>{" "}
                        </div>{" "}
                        <span className="font-bold text-red-cinema">
                          {" "}
                          R${" "}
                          {(item.price * item.quantity)
                            .toFixed(2)
                            .replace(".", ",")}{" "}
                        </span>{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>
              )}{" "}
            </div>{" "}
            <div className="sticky bottom-0 border-t border-grayScale-600 bg-deep-black p-5">
              {" "}
              <div className="mb-5 flex justify-between text-xl font-bold">
                {" "}
                <span>Total</span>{" "}
                <span className="text-red-cinema">
                  {" "}
                  R$ {totalPrice.toFixed(2).replace(".", ",")}{" "}
                </span>{" "}
              </div>{" "}
              <Button className="w-full" onClick={() => onCheckout(cart)}>
                {" "}
                Finalizar Pedido{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
