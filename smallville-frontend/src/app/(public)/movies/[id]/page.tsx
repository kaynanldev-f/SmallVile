"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Footer from "@/src/components/layout/Footer/Footer";
import SeatMapModal from "@/src/components/sessions/SeatMapModal";
import type { MovieDetailsResult } from "@/src/types/movie-types";
import { getMovieWithSessions } from "@/src/actions/movieActions";
import { useAuth } from "@/src/context/AuthContext";
import MovieBanner from "@/src/components/movies/MovieBanner";
import MovieInfo from "@/src/components/movies/MovieInfo";
import MovieCast from "@/src/components/movies/MovieCast";
import CinemaMovieSessions from "@/src/components/movies/CinemaMovieSessions";

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [details, setDetails] = useState<MovieDetailsResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  // A cidade do perfil apenas semeia o filtro da página. Visitante sem cadastro
  // começa sem cidade e escolhe no seletor — nenhuma cidade é presumida. Trocar
  // aqui não altera a cidade cadastrada no perfil.
  const [city, setCity] = useState<string | null>(() => user?.city ?? null);

  useEffect(() => {
    let active = true;

    getMovieWithSessions(id, city).then((result) => {
      if (!active) return;

      if (!result.success) {
        setLoadError(result.error);
        return;
      }

      setLoadError(null);
      setDetails(result.data);

      // A cidade do perfil pode estar grafada sem acento; o backend devolve a
      // versão canônica do cadastro de cinemas e o seletor passa a usá-la.
      if (result.data.city && result.data.city !== city) {
        setCity(result.data.city);
      }
    });

    return () => {
      active = false;
    };
  }, [id, city]);

  // Enquanto o backend não devolve a cidade pedida, a grade exibida ainda é a
  // da cidade anterior: é esse intervalo que o seletor mostra como carregando.
  const loadingSessions = !!details && details.city !== city;

  if (loadError || !details) {
    return (
      <div className="min-h-screen bg-deep-black flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-grayScale-400 text-lg">
            {loadError || "Carregando..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />

      <div className="bg-deep-black text-grayScale-200 min-h-screen">
        <MovieBanner bannerUrl={details.movie.banner} />

        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 flex flex-col gap-16">
          <MovieInfo
            synopsis={details.movie.synopsis}
            director={details.movie.director}
            releaseDate={details.movie.releaseDate}
          />

          <MovieCast cast={details.cast} />

          <CinemaMovieSessions
            groups={details.groups}
            dates={details.dates}
            cities={details.cities}
            selectedCity={city}
            onSelectCity={setCity}
            loading={loadingSessions}
            onSelectSession={setSelectedSessionId}
          />
        </div>

        <Footer />

        {selectedSessionId && (
          <SeatMapModal
            isOpen={true}
            sessionId={selectedSessionId}
            onClose={() => setSelectedSessionId(null)}
          />
        )}
      </div>
    </>
  );
}
