"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import MovieIcon from "@mui/icons-material/MovieOutlined";
import {
  createCinema,
  deleteCinema,
  setCinemaMovies,
  updateCinema,
  CinemaInput,
} from "@/src/actions/admin/cinemaActions";
import {
  AdminCinema,
  AdminMovie,
  BRAZIL_STATES,
  CINEMA_STATUSES,
} from "@/src/types/admin";
import AdminCrudShell from "../AdminCrudShell";
import AdminTable from "../AdminTable";
import AdminModal from "../AdminModal";
import AdminField, { adminInputClass } from "../AdminField";
import DeleteConfirmModal from "../DeleteConfirmModal";
import Button from "../../ui/Button";

const EMPTY_FORM: CinemaInput = {
  name: "",
  address: "",
  city: "",
  state: "SP",
  status: "ATIVO",
};

interface Props {
  cinemas: AdminCinema[];
  movies: AdminMovie[];
  loadError?: string;
}

export default function CinemasManager({ cinemas, movies, loadError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<CinemaInput>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminCinema | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminCinema | null>(null);

  // Cartaz: qual cinema está aberto e quais filmes estão marcados nele.
  const [billing, setBilling] = useState<AdminCinema | null>(null);
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(loadError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(cinema: AdminCinema) {
    setEditing(cinema);
    setForm({
      name: cinema.name,
      address: cinema.address,
      city: cinema.city,
      state: cinema.state,
      status: cinema.status,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      setError("Preencha nome, endereço e cidade.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = editing
        ? await updateCinema(editing._id, form)
        : await createCinema(form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(editing ? "Cinema atualizado." : "Cinema cadastrado.");
      setFormOpen(false);
      router.refresh();
    });
  }

  function openBilling(cinema: AdminCinema) {
    setBilling(cinema);
    setSelectedMovies((cinema.movies ?? []).map(String));
  }

  function toggleMovie(movieId: string) {
    setSelectedMovies((current) =>
      current.includes(movieId)
        ? current.filter((id) => id !== movieId)
        : [...current, movieId],
    );
  }

  function handleSaveBilling() {
    if (!billing) return;

    setError(null);

    startTransition(async () => {
      const result = await setCinemaMovies(billing._id, selectedMovies);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(`Cartaz de ${billing.name} atualizado.`);
      setBilling(null);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;

    startTransition(async () => {
      const result = await deleteCinema(deleting._id);

      if (!result.success) {
        setError(result.error);
        setDeleting(null);
        return;
      }

      setSuccess("Cinema removido.");
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <AdminCrudShell
      title="Cinemas"
      description="Unidades cadastradas, endereço, situação e filmes em cartaz."
      createLabel="Novo cinema"
      onCreate={openCreate}
      error={error}
      success={success}
      onDismiss={() => {
        setError(null);
        setSuccess(null);
      }}
    >
      <AdminTable
        rows={cinemas}
        rowKey={(cinema) => cinema._id}
        emptyMessage="Nenhum cinema cadastrado ainda."
        actions={[
          {
            icon: <MovieIcon className="text-[18px]" />,
            label: "Filmes em cartaz",
            onClick: openBilling,
          },
        ]}
        onEdit={openEdit}
        onDelete={setDeleting}
        columns={[
          {
            header: "Nome",
            render: (cinema) => (
              <span className="font-bold text-white">{cinema.name}</span>
            ),
          },
          { header: "Endereço", render: (cinema) => cinema.address },
          {
            header: "Cidade/UF",
            render: (cinema) => `${cinema.city} - ${cinema.state}`,
          },
          {
            header: "Cartaz",
            render: (cinema) => {
              const total = cinema.movies?.length ?? 0;

              return total ? (
                `${total} ${total === 1 ? "filme" : "filmes"}`
              ) : (
                <span className="text-yellow-400">Sem filmes</span>
              );
            },
          },
          {
            header: "Situação",
            render: (cinema) => (
              <span
                className={
                  cinema.status === "ATIVO"
                    ? "text-green-400"
                    : "text-grayScale-400"
                }
              >
                {cinema.status}
              </span>
            ),
          },
        ]}
      />

      <AdminModal
        open={formOpen}
        title={editing ? "Editar cinema" : "Novo cinema"}
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
          <AdminField label="Nome" htmlFor="cinema-name" className="sm:col-span-2">
            <input
              id="cinema-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={adminInputClass}
              placeholder="Cinemark Shopping Iguatemi"
            />
          </AdminField>

          <AdminField
            label="Endereço"
            htmlFor="cinema-address"
            className="sm:col-span-2"
          >
            <input
              id="cinema-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={adminInputClass}
              placeholder="Av. Brigadeiro Faria Lima, 2232"
            />
          </AdminField>

          <AdminField label="Cidade" htmlFor="cinema-city">
            <input
              id="cinema-city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className={adminInputClass}
              placeholder="São Paulo"
            />
          </AdminField>

          <AdminField label="Estado" htmlFor="cinema-state">
            <select
              id="cinema-state"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={adminInputClass}
            >
              {BRAZIL_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Situação" htmlFor="cinema-status">
            <select
              id="cinema-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={adminInputClass}
            >
              {CINEMA_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </AdminField>
        </div>
      </AdminModal>

      <AdminModal
        open={!!billing}
        title={`Filmes em cartaz — ${billing?.name ?? ""}`}
        onClose={() => setBilling(null)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBilling(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSaveBilling}
              disabled={isPending || !movies.length}
            >
              {isPending ? "Salvando..." : "Salvar cartaz"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-xs text-grayScale-400">
          Uma sessão só pode ser criada para um filme que esteja em cartaz no
          cinema. Marque aqui o que essa unidade exibe.
        </p>

        {!movies.length ? (
          <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            Nenhum filme cadastrado ainda. Cadastre em Filmes antes de montar o
            cartaz.
          </p>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {movies.map((movie) => (
              <label
                key={movie._id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-grayScale-700/60"
              >
                <input
                  type="checkbox"
                  checked={selectedMovies.includes(movie._id)}
                  onChange={() => toggleMovie(movie._id)}
                  className="size-4 accent-red-cinema"
                />

                <span className="font-bold text-white">{movie.title}</span>

                <span className="text-xs text-grayScale-400">
                  {movie.classification} · {movie.duration}min
                </span>
              </label>
            ))}
          </div>
        )}
      </AdminModal>

      <DeleteConfirmModal
        open={!!deleting}
        itemName={deleting?.name ?? ""}
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </AdminCrudShell>
  );
}
