'use client';

import { SeatMapHeaderProps } from '@/src/types/session-types';
import { X } from 'lucide-react';


export function SeatMapHeader({ onClose }: SeatMapHeaderProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors hover:cursor-pointer"
        aria-label="Fechar modal"
      >
        <X size={24} />
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-red-600">
          Mapeamento de assentos
        </h2>
        <p className="mt-1 text-xs text-neutral-400 max-w-md leading-relaxed">
          Cada sala possui exatamente 120 lugares distribuídos entre categorias comuns, preferenciais e de acessibilidade.
        </p>
      </div>
    </>
  );
}