import SpinLoader from "@/src/components/ui/SpinLoader";

export default function Loading() {
  return (
    <div className="bg-deep-black flex min-h-screen flex-col items-center justify-center gap-4">
      <SpinLoader size="lg" />

      <p className="text-sm text-grayScale-400">Carregando seus ingressos...</p>
    </div>
  );
}
