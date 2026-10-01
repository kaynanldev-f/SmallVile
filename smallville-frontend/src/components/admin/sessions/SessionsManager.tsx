"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createSession,
  deleteSession,
  updateSession,
  SessionInput,
} from "@/src/actions/admin/sessionAdminActions";
import {
  AdminCinema,
  AdminMovie,
  AdminSession,
  MOVIE_LANGUAGES,
  ROOM_TYPES,
} from "@/src/types/admin";
import { brToIsoDate, isoToBrDate } from "@/src/utils/date";
import { centsToInput, formatCents, inputToCents } from "@/src/utils/currency";
import { capitalizeWords } from "@/src/utils/text";
import AdminCrudShell from "../AdminCrudShell";
import AdminTable from "../AdminTable";
import AdminModal from "../AdminModal";
import AdminField, { adminInputClass } from "../AdminField";
import DeleteConfirmModal from "../DeleteConfirmModal";
import Button from "../../ui/Button";

interface FormState {
  cinemaId: string;
  movieTitle: string;
  roomName: string;
  roomType: string;
  language: string;
  /** "AAAA-MM-DD" do input type="date". */
  date: string;
  /** "HH:MM" do input type="time". */
  time: string;
  /** Em reais, como o admin digita. */
  price: string;
}

const EMPTY_FORM: FormState = {
  cinemaId: "",
  movieTitle: "",
  roomName: "",
  roomType: "COMUM",
  language: "Dublado",
  date: "",
  time: "",
  price: "",
};

interface Props {
  sessions: AdminSession[];
  cinemas: AdminCinema[];
  movies: AdminMovie[];
  loadError?: string;
}

export default function SessionsManager({
  sessions,
  cinemas,
  movies,
  loadError,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminSession | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminSession | null>(null);

  const [error, setError] = useState<string | null>(loadError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  const cinemasById = useMemo(
    () => new Map(cinemas.map((cinema) => [cinema._id, cinema])),
    [cinemas],
  );

  /** Só os filmes em cartaz no cinema escolhido. */
  const availableMovies = useMemo(() => {
    const attached = new Set(
      (cinemasById.get(form.cinemaId)?.movies ?? []).map(String),
    );

    return movies.filter((movie) => attached.has(movie._id));
  }, [movies, cinemasById, form.cinemaId]);

  /** O filme escolhido no formulário, para checar a data de estreia. */
  const selectedMovie = useMemo(
    () => movies.find((movie) => movie.title === form.movieTitle) ?? null,
    [movies, form.movieTitle],
  );

  /** Estreia em "AAAA-MM-DD", para comparar com o input type="date". */
  const releaseDateIso = selectedMovie
    ? brToIsoDate(selectedMovie.releaseDate)
    : "";

  /** Uma sessão antiga pode apontar para um filme que saiu do cartaz depois. */
  const staleMovieTitle =
    !!form.movieTitle &&
    !availableMovies.some((movie) => movie.title === form.movieTitle)
      ? form.movieTitle
      : null;

  function selectCinema(cinemaId: string) {
    const attached = new Set(
      (cinemasById.get(cinemaId)?.movies ?? []).map(String),
    );

    const stillAvailable = movies.some(
      (movie) => attached.has(movie._id) && movie.title === form.movieTitle,
    );

    setForm({
      ...form,
      cinemaId,
      movieTitle: stillAvailable ? form.movieTitle : "",
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, cinemaId: cinemas[0]?._id ?? "" });
    setFormOpen(true);
  }

  function openEdit(session: AdminSession) {
    const [date = "", time = ""] = session.dateTime.split(" ");

    setEditing(session);
    setForm({
      cinemaId: session.cinemaId,
      movieTitle: session.movieTitle,
      roomName: session.roomName,
      roomType: session.roomType,
      language: session.language,
      date: brToIsoDate(date),
      time,
      price: centsToInput(session.price),
    });
    setFormOpen(true);
  }

  function buildPayload(): SessionInput | string {
    if (!form.cinemaId) return "Selecione o cinema.";
    if (!form.movieTitle.trim()) return "Informe o filme.";
    if (!form.roomName.trim()) return "Informe o nome da sala.";
    if (!form.date || !form.time) return "Informe data e horário da sessão.";

    // Regra de negócio validada também no backend: a sessão nunca pode ser
    // anterior à estreia. Comparação em "AAAA-MM-DD", só pelo dia civil, para
    // não depender de fuso — o dia da estreia já é permitido.
    if (releaseDateIso && form.date < releaseDateIso)
      return (
        "Não é possível criar uma sessão antes da data de estreia do filme." +
        ` A estreia de "${form.movieTitle}" é em ${selectedMovie?.releaseDate}.`
      );

    const price = inputToCents(form.price);

    if (price === null) return "Informe um preço válido (ex.: 35,00).";

    return {
      cinemaId: form.cinemaId,
      movieTitle: form.movieTitle.trim(),
      // Mesmo padrão de caixa do resto do cadastro ("sala premium" →
      // "Sala Premium"), igual em criação e edição.
      roomName: capitalizeWords(form.roomName),
      roomType: form.roomType,
      language: form.language,
      dateTime: `${isoToBrDate(form.date)} ${form.time}`,
      price,
    };
  }

  function handleSubmit() {
    const payload = buildPayload();

    if (typeof payload === "string") {
      setError(payload);
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = editing
        ? await updateSession(editing._id, payload)
        : await createSession(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(editing ? "Sessão atualizada." : "Sessão criada.");
      setFormOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;

    startTransition(async () => {
      const result = await deleteSession(deleting._id);

      if (!result.success) {
        setError(result.error);
        setDeleting(null);
        return;
      }

      setSuccess("Sessão removida.");
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <AdminCrudShell
      title="Sessões"
      description="Horários em cartaz, sala, idioma e preço do ingresso."
      createLabel="Nova sessão"
      onCreate={openCreate}
      error={error}
      success={success}
      onDismiss={() => {
        setError(null);
        setSuccess(null);
      }}
    >
      {!cinemas.length && (
        <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Cadastre um cinema antes de criar sessões.
        </p>
      )}

      <AdminTable
        rows={sessions}
        rowKey={(session) => session._id}
        emptyMessage="Nenhuma sessão cadastrada ainda."
        onEdit={openEdit}
        onDelete={setDeleting}
        columns={[
          {
            header: "Filme",
            render: (session) => (
              <span className="font-bold text-white">{session.movieTitle}</span>
            ),
          },
          {
            header: "Cinema",
            render: (session) =>
              cinemasById.get(session.cinemaId)?.name ?? session.cinemaId,
          },
          { header: "Sala", render: (session) => session.roomName },
          {
            header: "Tipo/Idioma",
            render: (session) => `${session.roomType} · ${session.language}`,
          },
          { header: "Data e hora", render: (session) => session.dateTime },
          {
            header: "Preço",
            render: (session) => formatCents(session.price),
          },
        ]}
      />

      <AdminModal
        open={formOpen}
        title={editing ? "Editar sessão" : "Nova sessão"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminField label="Cinema" htmlFor="session-cinema">
            <select
              id="session-cinema"
              value={form.cinemaId}
              onChange={(e) => selectCinema(e.target.value)}
              className={adminInputClass}
            >
              <option value="">Selecione...</option>

              {cinemas.map((cinema) => (
                <option key={cinema._id} value={cinema._id}>
                  {cinema.name}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField
            label="Filme"
            htmlFor="session-movie"
            hint="Apenas os filmes em cartaz no cinema selecionado."
          >
            <select
              id="session-movie"
              value={form.movieTitle}
              onChange={(e) => setForm({ ...form, movieTitle: e.target.value })}
              disabled={!form.cinemaId}
              className={adminInputClass}
            >
              <option value="">Selecione...</option>

              {availableMovies.map((movie) => (
                <option key={movie._id} value={movie.title}>
                  {movie.title}
                </option>
              ))}

              {staleMovieTitle && (
                <option value={staleMovieTitle}>
                  {staleMovieTitle} (fora do cartaz)
                </option>
              )}
            </select>
          </AdminField>

          {form.cinemaId && !availableMovies.length && (
            <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 sm:col-span-2">
              Nenhum filme em cartaz neste cinema. Defina o cartaz em{" "}
              <Link href="/admin/cinemas" className="font-bold underline">
                Cinemas
              </Link>{" "}
              antes de criar a sessão.
            </p>
          )}

          <AdminField label="Sala" htmlFor="session-room">
            <input
              id="session-room"
              value={form.roomName}
              onChange={(e) => setForm({ ...form, roomName: e.target.value })}
              className={adminInputClass}
              placeholder="Sala CineVille 01"
            />
          </AdminField>

          <AdminField label="Tipo de sala" htmlFor="session-room-type">
            <select
              id="session-room-type"
              value={form.roomType}
              onChange={(e) => setForm({ ...form, roomType: e.target.value })}
              className={adminInputClass}
            >
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Idioma" htmlFor="session-language">
            <select
              id="session-language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className={adminInputClass}
            >
              {MOVIE_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField
            label="Preço do ingresso"
            htmlFor="session-price"
            hint="Em reais. Enviado ao backend em centavos."
          >
            <input
              id="session-price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={adminInputClass}
              placeholder="35,00"
              inputMode="decimal"
            />
          </AdminField>

          <AdminField
            label="Data"
            htmlFor="session-date"
            hint={
              selectedMovie
                ? `O filme estreia em ${selectedMovie.releaseDate}; a sessão não pode ser antes disso.`
                : undefined
            }
          >
            <input
              id="session-date"
              type="date"
              value={form.date}
              // Bloqueia a escolha de datas anteriores à estreia já no seletor.
              min={releaseDateIso || undefined}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField
            label="Horário"
            htmlFor="session-time"
            hint="O backend recusa sessões no passado."
          >
            <input
              id="session-time"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>
        </div>
      </AdminModal>

      <DeleteConfirmModal
        open={!!deleting}
        itemName={
          deleting ? `${deleting.movieTitle} — ${deleting.dateTime}` : ""
        }
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </AdminCrudShell>
  );
}
