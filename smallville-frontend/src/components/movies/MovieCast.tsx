import Image from 'next/image';
import { MovieDetailsResult } from '@/src/types/movie-types';

interface MovieCastProps {
  cast: MovieDetailsResult['cast'];
}

export default function MovieCast({ cast }: MovieCastProps) {
  return (
    <section>
      <h2 className="text-3xl font-black mb-8">Atores</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {cast.map((ator, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              <Image src={ator.imageUrl} alt={ator.name} fill className="object-cover" />
            </div>
            <p className="font-bold text-sm text-center">{ator.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}