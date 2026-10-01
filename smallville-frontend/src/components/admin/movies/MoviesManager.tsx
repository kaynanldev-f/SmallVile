"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import AddIcon from "@mui/icons-material/Add";
import {
  createMovie,
  deleteMovie,
  updateMovie,
  MovieInput,
} from "@/src/actions/admin/movieAdminActions";
import {
  AdminMovie,
  CLASSIFICATIONS,
  MOVIE_GENRES,
  MOVIE_LANGUAGES,
} from "@/src/types/admin";
import { brToIsoDate, isoToBrDate } from "@/src/utils/date";
import { validateImageUpload } from "@/src/utils/upload";
import {
  capitalizeMovieTitle,
  capitalizeSentence,
} from "@/src/utils/text";
import AdminCrudShell from "../AdminCrudShell";
import AdminTable from "../AdminTable";
import AdminModal from "../AdminModal";
import AdminField, { adminInputClass } from "../AdminField";
import DeleteConfirmModal from "../DeleteConfirmModal";
import Button from "../../ui/Button";

interface CastRow {
  name: string;
  photo: File | null;
}

interface FormState {
  title: string;
  synopsis: string;
  genres: string[];
  classification: string;
  duration: string;
  author: string;
  trailer: string;
  /** "AAAA-MM-DD" do input type="date". */
  releaseDate: string;
  languages: string[];
  cast: CastRow[];
  banner: File | null;
}

const EMPTY_FORM: FormState = {
  title: "",
  synopsis: "",
  genres: [],
  classification: "L",
  duration: "",
  author: "",
  trailer: "",
  releaseDate: "",
  languages: [],
  cast: [{ name: "", photo: null }],
  banner: null,
};

interface Props {
  movies: AdminMovie[];
  loadError?: string;
}

export default function MoviesManager({ movies, loadError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminMovie | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [replaceCast, setReplaceCast] = useState(false);
  const [deleting, setDeleting] = useState<AdminMovie | null>(null);

  const [error, setError] = useState<string | null>(loadError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setReplaceCast(true);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(movie: AdminMovie) {
    setEditing(movie);
    setReplaceCast(false);
    setForm({
      title: movie.title,
      synopsis: movie.synopsis,
      genres: movie.genres ?? [],
      classification: movie.classification,
      duration: String(movie.duration ?? ""),
      author: movie.author,
      trailer: movie.trailer ?? "",
      releaseDate: brToIsoDate(movie.releaseDate),
      languages: movie.languages ?? [],
      cast: movie.cast?.length
        ? movie.cast.map((actor) => ({ name: actor.name, photo: null }))
        : [{ name: "", photo: null }],
      banner: null,
    });
    setFormOpen(true);
  }

  function toggleFromList(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  function updateCastRow(index: number, patch: Partial<CastRow>) {
    setForm((current) => ({
      ...current,
      cast: current.cast.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  function validate(): string | null {
    if (!form.title.trim()) return "Informe o título.";
    if (form.synopsis.trim().length < 10)
      return "A sinopse precisa ter entre 10 e 200 caracteres.";
    if (form.synopsis.trim().length > 200)
      return "A sinopse precisa ter no máximo 200 caracteres.";
    if (!form.genres.length) return "Selecione pelo menos um gênero.";
    if (!form.languages.length) return "Selecione pelo menos um idioma.";
    if (!form.author.trim()) return "Informe o diretor.";
    if (!form.releaseDate) return "Informe a data de lançamento.";

    const duration = Number(form.duration);

    if (!Number.isInteger(duration) || duration < 1 || duration > 300)
      return "A duração deve ser um número entre 1 e 300 minutos.";

    if (!editing && !form.banner) return "O banner do filme é obrigatório.";

    const sendingCast = !editing || replaceCast;

    if (sendingCast) {
      const named = form.cast.filter((row) => row.name.trim());

      if (!named.length) return "Informe pelo menos um ator no elenco.";

      if (named.some((row) => !row.photo))
        return "Cada ator do elenco precisa de uma foto.";
    }

    // Banner e fotos vão juntos na mesma Server Action, então o que importa é
    // o peso do conjunto — não adianta cada arquivo caber sozinho.
    return validateImageUpload([
      form.banner,
      ...(sendingCast ? form.cast.map((row) => row.photo) : []),
    ]);
  }

  function handleSubmit() {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    const sendingCast = !editing || replaceCast;
    const named = form.cast.filter((row) => row.name.trim());

    const input: MovieInput = {
      // Mesma normalização de caixa em cadastro e edição: título em Title Case
      // quando digitado todo em minúsculas, sinopse com capitalização natural.
      title: capitalizeMovieTitle(form.title),
      synopsis: capitalizeSentence(form.synopsis),
      genres: form.genres,
      classification: form.classification,
      duration: Number(form.duration),
      author: form.author.trim(),
      trailer: form.trailer.trim() || undefined,
      releaseDate: isoToBrDate(form.releaseDate),
      languages: form.languages,
      castNames: sendingCast ? named.map((row) => row.name.trim()) : [],
    };

    const photos = sendingCast
      ? named.map((row) => row.photo).filter((photo): photo is File => !!photo)
      : [];

    setError(null);

    startTransition(async () => {
      const result = editing
        ? await updateMovie(editing._id, input, form.banner, photos)
        : await createMovie(input, form.banner, photos);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(editing ? "Filme atualizado." : "Filme cadastrado.");
      setFormOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;

    startTransition(async () => {
      const result = await deleteMovie(deleting._id);

      if (!result.success) {
        setError(result.error);
        setDeleting(null);
        return;
      }

      setSuccess("Filme removido.");
      setDeleting(null);
      router.refresh();
    });
  }

  const castEditable = !editing || replaceCast;

  return (
    <AdminCrudShell
      title="Filmes"
      description="Catálogo em cartaz, elenco e classificação indicativa."
      createLabel="Novo filme"
      onCreate={openCreate}
      error={error}
      success={success}
      onDismiss={() => {
        setError(null);
        setSuccess(null);
      }}
    >
      <AdminTable
        rows={movies}
        rowKey={(movie) => movie._id}
        emptyMessage="Nenhum filme cadastrado ainda."
        onEdit={openEdit}
        onDelete={setDeleting}
        columns={[
          {
            header: "Filme",
            render: (movie) => (
              <div className="flex items-center gap-3">
                {movie.banner && (
                  <Image
                    src={movie.banner}
                    alt=""
                    width={32}
                    height={48}
                    unoptimized
                    className="h-12 w-8 rounded object-cover"
                  />
                )}

                <span className="font-bold text-white">{movie.title}</span>
              </div>
            ),
          },
          { header: "Diretor", render: (movie) => movie.author },
          {
            header: "Gêneros",
            render: (movie) => movie.genres?.join(", ") ?? "—",
          },
          { header: "Classif.", render: (movie) => movie.classification },
          { header: "Duração", render: (movie) => `${movie.duration} min` },
          { header: "Estreia", render: (movie) => movie.releaseDate },
        ]}
      />

      <AdminModal
        open={formOpen}
        title={editing ? "Editar filme" : "Novo filme"}
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
          <AdminField
            label="Título"
            htmlFor="movie-title"
            className="sm:col-span-2"
          >
            <input
              id="movie-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={adminInputClass}
              placeholder="Interestelar"
            />
          </AdminField>

          <AdminField
            label="Sinopse"
            htmlFor="movie-synopsis"
            className="sm:col-span-2"
            hint={`${form.synopsis.trim().length}/200 caracteres (mínimo 10).`}
          >
            <textarea
              id="movie-synopsis"
              value={form.synopsis}
              onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
              rows={3}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Gêneros" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {MOVIE_GENRES.map((genre) => {
                const active = form.genres.includes(genre);

                return (
                  <button
                    key={genre}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm({
                        ...form,
                        genres: toggleFromList(form.genres, genre),
                      })
                    }
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      active
                        ? "border-red-cinema bg-red-cinema text-white"
                        : "border-grayScale-600 text-grayScale-400 hover:text-white"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </AdminField>

          <AdminField label="Idiomas" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {MOVIE_LANGUAGES.map((language) => {
                const active = form.languages.includes(language);

                return (
                  <button
                    key={language}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm({
                        ...form,
                        languages: toggleFromList(form.languages, language),
                      })
                    }
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                      active
                        ? "border-red-cinema bg-red-cinema text-white"
                        : "border-grayScale-600 text-grayScale-400 hover:text-white"
                    }`}
                  >
                    {language}
                  </button>
                );
              })}
            </div>
          </AdminField>

          <AdminField label="Diretor" htmlFor="movie-author">
            <input
              id="movie-author"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              className={adminInputClass}
              placeholder="Christopher Nolan"
            />
          </AdminField>

          <AdminField label="Classificação" htmlFor="movie-classification">
            <select
              id="movie-classification"
              value={form.classification}
              onChange={(e) =>
                setForm({ ...form, classification: e.target.value })
              }
              className={adminInputClass}
            >
              {CLASSIFICATIONS.map((value) => (
                <option key={value} value={value}>
                  {value === "L" ? "Livre" : `${value} anos`}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Duração (min)" htmlFor="movie-duration">
            <input
              id="movie-duration"
              type="number"
              min={1}
              max={300}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className={adminInputClass}
              placeholder="148"
            />
          </AdminField>

          <AdminField label="Estreia" htmlFor="movie-release">
            <input
              id="movie-release"
              type="date"
              value={form.releaseDate}
              onChange={(e) =>
                setForm({ ...form, releaseDate: e.target.value })
              }
              className={adminInputClass}
            />
          </AdminField>

          <AdminField
            label="Trailer"
            htmlFor="movie-trailer"
            className="sm:col-span-2"
            hint="Opcional. URL entre 10 e 200 caracteres."
          >
            <input
              id="movie-trailer"
              value={form.trailer}
              onChange={(e) => setForm({ ...form, trailer: e.target.value })}
              className={adminInputClass}
              placeholder="https://youtube.com/..."
            />
          </AdminField>

          <AdminField
            label="Banner"
            htmlFor="movie-banner"
            className="sm:col-span-2"
            hint={
              editing
                ? "Deixe vazio para manter o banner atual."
                : "Obrigatório no cadastro."
            }
          >
            <input
              id="movie-banner"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({ ...form, banner: e.target.files?.[0] ?? null })
              }
              className={`${adminInputClass} file:mr-3 file:rounded file:border-0 file:bg-grayScale-600 file:px-3 file:py-1 file:text-xs file:text-white`}
            />
          </AdminField>

          <div className="sm:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-grayScale-400">
                Elenco
              </span>

              {editing && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-grayScale-400">
                  <input
                    type="checkbox"
                    checked={replaceCast}
                    onChange={(e) => setReplaceCast(e.target.checked)}
                  />
                  Substituir elenco (exige reenviar todas as fotos)
                </label>
              )}
            </div>

            {!castEditable && (
              <p className="rounded-lg border border-grayScale-600 bg-grayScale-700/40 px-3 py-2 text-xs text-grayScale-400">
                O elenco atual será mantido. O backend só aceita trocar o elenco
                junto com uma foto para cada ator.
              </p>
            )}

            {castEditable && (
              <div className="flex flex-col gap-3">
                {form.cast.map((row, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <input
                      value={row.name}
                      onChange={(e) =>
                        updateCastRow(index, { name: e.target.value })
                      }
                      placeholder={`Ator ${index + 1}`}
                      aria-label={`Nome do ator ${index + 1}`}
                      className={`${adminInputClass} flex-1 min-w-40`}
                    />

                    <input
                      type="file"
                      accept="image/*"
                      aria-label={`Foto do ator ${index + 1}`}
                      onChange={(e) =>
                        updateCastRow(index, {
                          photo: e.target.files?.[0] ?? null,
                        })
                      }
                      className={`${adminInputClass} flex-1 min-w-48 file:mr-3 file:rounded file:border-0 file:bg-grayScale-600 file:px-3 file:py-1 file:text-xs file:text-white`}
                    />

                    <button
                      type="button"
                      aria-label={`Remover ator ${index + 1}`}
                      disabled={form.cast.length === 1}
                      onClick={() =>
                        setForm({
                          ...form,
                          cast: form.cast.filter((_, i) => i !== index),
                        })
                      }
                      className="cursor-pointer rounded p-1.5 text-grayScale-400 transition-colors hover:bg-red-500/20 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <DeleteIcon className="text-[18px]" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      cast: [...form.cast, { name: "", photo: null }],
                    })
                  }
                  className="flex w-fit cursor-pointer items-center gap-1 text-xs font-bold text-red-cinema hover:underline"
                >
                  <AddIcon className="text-[16px]" />
                  Adicionar ator
                </button>
              </div>
            )}
          </div>
        </div>
      </AdminModal>

      <DeleteConfirmModal
        open={!!deleting}
        itemName={deleting?.title ?? ""}
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </AdminCrudShell>
  );
}
