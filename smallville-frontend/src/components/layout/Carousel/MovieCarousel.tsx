"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import MovieCard from "./MovieCard";
import HeadingContent from "@/src/components/ui/HeadingContent";
import { MovieCarouselProps } from "@/src/types/movie-types";

export default function MovieCarousel({
  title,
  movies,
  idSection,
  seeAllHref,
  emptyMessage = "Nenhum filme disponível no momento.",
}: MovieCarouselProps) {
  return (
    <section
      id={idSection}
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <HeadingContent title={title} />

        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-sm font-bold text-grayScale-400 transition-colors hover:text-red-cinema"
          >
            Ver todos
          </Link>
        )}
      </div>

      {!movies?.length ? (
        <p className="mt-8 rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-10 text-center text-sm text-grayScale-400">
          {emptyMessage}
        </p>
      ) : (
        <Swiper
          modules={[Autoplay]}
          loop={movies.length > 1}
          speed={700}
          autoplay={{
            delay: 2000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          spaceBetween={16}
          slidesPerView={1.2}
          breakpoints={{
            480: { slidesPerView: 1.5, spaceBetween: 16 },
            640: { slidesPerView: 2, spaceBetween: 18 },
            768: { slidesPerView: 2.5, spaceBetween: 20 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
            1280: { slidesPerView: 4, spaceBetween: 24 },
          }}
          className="mt-8"
        >
          {movies.map((movie) => (
            /** `!h-auto` desliga a altura fixa que o Swiper aplica no slide. */
            <SwiperSlide key={movie._id} className="h-auto!">
              <MovieCard movie={movie} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}
