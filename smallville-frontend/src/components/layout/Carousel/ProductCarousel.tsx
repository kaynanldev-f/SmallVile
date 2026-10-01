"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import ProductCard, { Product } from "./ProductCard";
import type { CartItem } from "@/src/types/cart";

export default function ProductCarousel({
  title,
  products,
  cart,
  onAdd,
  onRemove,
}: {
  title: string;
  products: Product[];
  cart: CartItem[];
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <section className="w-full">
      <h2 className="text-2xl font-black text-grayScale-200 mb-6">{title}</h2>
      <Swiper
        modules={[Autoplay]}
        speed={800}
        autoplay={{
          delay: 3500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        observer={true}
        observeParents={true}
        spaceBetween={20}
        breakpoints={{
          480: { slidesPerView: 1.5, spaceBetween: 16 },
          640: { slidesPerView: 2, spaceBetween: 18 },
          768: { slidesPerView: 2.5, spaceBetween: 20 },
          1024: { slidesPerView: 3, spaceBetween: 24 },
          1280: { slidesPerView: 4, spaceBetween: 24 },
        }}
        className="w-full pb-8 pt-2"
      >
        {products.map((product) => {
          const cartItem = cart.find((item) => item.id === product.id);
          const quantity = cartItem?.quantity ?? 0;
          const limitReached = quantity >= product.limit;

          return (
            <SwiperSlide key={product.id} className="h-auto  flex">
              <ProductCard
                product={product}
                quantity={quantity}
                onAdd={() => onAdd(product)}
                onRemove={() => onRemove(product.id)}
                limitReached={limitReached}
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
