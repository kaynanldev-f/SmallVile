import SpinLoader from "@/src/components/ui/SpinLoader";

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <SpinLoader size="lg" />
    </div>
  );
}
