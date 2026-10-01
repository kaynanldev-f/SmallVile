/** Título de seção com a régua vermelha do SmallVille. */
export default function HeadingContent({ title }: { title: string }) {
  return (
    <div className="mb-10 flex items-center gap-3 sm:mb-16 sm:gap-4">
      <h2 className="text-2xl font-semibold sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      <div className="h-0.5 w-16 bg-linear-to-r from-red-cinema to-transparent sm:w-32 lg:w-56" />
    </div>
  );
}
