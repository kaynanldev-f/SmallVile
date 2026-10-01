interface MovieInfoProps {
  synopsis: string;
  director: string;
  releaseDate: string;
}

export default function MovieInfo({
  synopsis,
  director,
  releaseDate,
}: MovieInfoProps) {
  return (
    // `min-w-0` nas duas colunas: item de flex tem `min-width: auto` por
    // padrão, então uma palavra gigante na sinopse esticaria a coluna, empurraria
    // o card "Informações do Filme" para fora e criaria scroll horizontal na
    // página inteira. Com o mínimo zerado, o `break-words` do parágrafo
    // consegue quebrar a palavra dentro do container.
    <section className="flex flex-col md:flex-row gap-8">
      <div className="min-w-0 flex-1">
        <h2 className="text-3xl font-black mb-4">Sinopse</h2>
        <p className="text-grayScale-400 leading-relaxed break-words hyphens-auto md:max-w-3/4">
          {synopsis}
        </p>
      </div>

      <div className="w-full min-w-0 md:w-72 md:shrink-0 bg-gray-surface rounded-xl p-6 flex flex-col gap-4 h-fit">
        <h3 className="text-lg font-bold mb-2">Informações do Filme</h3>
        <div className="flex justify-between gap-3 border-b border-grayScale-600 pb-3">
          <span className="text-grayScale-400 text-sm shrink-0">Diretor</span>
          <span className="font-semibold text-sm min-w-0 break-words text-right">
            {director}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-grayScale-400 text-sm shrink-0">
            Lançamento
          </span>
          <span className="font-semibold text-sm min-w-0 break-words text-right">
            {releaseDate}
          </span>
        </div>
      </div>
    </section>
  );
}
