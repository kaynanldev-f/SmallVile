"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateMyProfile,
  UpdateProfileInput,
  UserProfile,
} from "@/src/actions/userActions";
import { useAuth } from "@/src/context/AuthContext";
import { BRAZIL_STATES } from "@/src/types/admin";
import { masks } from "@/src/utils/masks";
import AdminField, { adminInputClass } from "../admin/AdminField";
import InputForm from "../ui/InputForm";
import Button from "../ui/Button";

interface Props {
  profile: UserProfile;
}

export default function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<UpdateProfileInput>({
    name: profile.name ?? "",
    surname: profile.surname ?? "",
    birthDate: profile.birthDate ?? "",
    phone: profile.phone ?? "",
    cep: profile.cep ?? "",
    address: profile.address ?? "",
    number: profile.number ?? "",
    complement: profile.complement ?? "",
    neighborhood: profile.neighborhood ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "SP",
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set<K extends keyof UpdateProfileInput>(
    key: K,
    value: UpdateProfileInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim() || !form.surname.trim()) {
      setError("Nome e sobrenome são obrigatórios.");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await updateMyProfile(form);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Só depois do OK da API, e com a resposta do backend na frente do que
      // foi digitado: o menu lateral lê deste mesmo contexto e atualiza na hora.
      updateUser({
        name: result.data?.name ?? form.name,
        surname: result.data?.surname ?? form.surname,
      });

      setSuccess("Perfil atualizado com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400"
        >
          {success}
        </p>
      )}

      <section className="rounded-xl border border-grayScale-600 bg-gray-surface p-5">
        <h2 className="mb-4 text-sm font-black uppercase text-grayScale-400">
          Dados pessoais
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminField label="Nome" htmlFor="profile-name">
            <input
              id="profile-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Sobrenome" htmlFor="profile-surname">
            <input
              id="profile-surname"
              value={form.surname}
              onChange={(e) => set("surname", e.target.value)}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField
            label="Data de nascimento"
            htmlFor="profile-birth"
            hint="DD/MM/AAAA"
          >
            <InputForm
              id="profile-birth"
              value={form.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
              {...masks.birthDate}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Telefone" htmlFor="profile-phone">
            <InputForm
              id="profile-phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              {...masks.phone}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField
            label="E-mail"
            htmlFor="profile-email"
            hint="O e-mail e o CPF não podem ser alterados por aqui."
            className="sm:col-span-2"
          >
            <input
              id="profile-email"
              value={profile.email ?? ""}
              disabled
              className={`${adminInputClass} cursor-not-allowed opacity-60`}
            />
          </AdminField>
        </div>
      </section>

      <section className="rounded-xl border border-grayScale-600 bg-gray-surface p-5">
        <h2 className="mb-4 text-sm font-black uppercase text-grayScale-400">
          Endereço
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminField label="CEP" htmlFor="profile-cep">
            <InputForm
              id="profile-cep"
              value={form.cep}
              onChange={(e) => set("cep", e.target.value)}
              {...masks.cep}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Logradouro" htmlFor="profile-address">
            <input
              id="profile-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Número" htmlFor="profile-number">
            <input
              id="profile-number"
              value={form.number ?? ""}
              onChange={(e) => set("number", e.target.value)}
              className={adminInputClass}
              inputMode="numeric"
            />
          </AdminField>

          <AdminField label="Complemento" htmlFor="profile-complement">
            <input
              id="profile-complement"
              value={form.complement ?? ""}
              onChange={(e) => set("complement", e.target.value)}
              className={adminInputClass}
              placeholder="Apto 101"
            />
          </AdminField>

          <AdminField label="Bairro" htmlFor="profile-neighborhood">
            <input
              id="profile-neighborhood"
              value={form.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Cidade" htmlFor="profile-city">
            <input
              id="profile-city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Estado" htmlFor="profile-state">
            <select
              id="profile-state"
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              className={adminInputClass}
            >
              {BRAZIL_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </AdminField>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
