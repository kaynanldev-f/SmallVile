"use client";

interface SessionCityFilterProps {
  /** Cidades com este filme em cartaz, em ordem alfabética. */
  cities: string[];
  /** `null` quando ainda não há cidade escolhida (visitante sem cadastro). */
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
  disabled?: boolean;
}

/**
 * Seletor de cidade da página do filme. Fica ao lado do filtro de dias e usa a
 * mesma linguagem visual dos chips (superfície escura, borda que acende em
 * vermelho no foco). Trocar a cidade só muda o que é exibido — a cidade
 * cadastrada no perfil do usuário não é alterada.
 */
export default function SessionCityFilter({
  cities,
  selectedCity,
  onSelectCity,
  disabled = false,
}: SessionCityFilterProps) {
  if (!cities.length) return null;

  // A cidade do perfil pode não ter cinema com este filme em cartaz. Ela
  // continua no seletor (com a mensagem de "nenhuma sessão") para o usuário
  // enxergar de onde partiu e poder trocar.
  const options = cities.includes(selectedCity ?? "")
    ? cities
    : [...cities, selectedCity].filter((city): city is string => !!city);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="session-city"
        className="text-xs font-bold uppercase tracking-wide text-grayScale-400"
      >
        Cidade
      </label>

      <select
        id="session-city"
        value={selectedCity ?? ""}
        disabled={disabled}
        onChange={(event) => onSelectCity(event.target.value || null)}
        className="w-full max-w-xs cursor-pointer rounded-lg border border-grayScale-600 bg-gray-surface px-4 py-2 text-xs font-bold text-grayScale-200 outline-none transition-all hover:border-red-cinema focus:border-red-cinema disabled:cursor-not-allowed disabled:opacity-60 sm:w-64"
      >
        <option value="">Selecione uma cidade</option>

        {options.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </div>
  );
}
