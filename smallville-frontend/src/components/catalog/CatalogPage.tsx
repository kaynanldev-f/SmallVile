import Header from "@/src/components/layout/Header";
import Footer from "@/src/components/layout/Footer/Footer";

interface CatalogPageProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/** Moldura compartilhada pelas páginas públicas de catálogo. */
export default function CatalogPage({
  title,
  subtitle,
  children,
}: CatalogPageProps) {
  return (
    <>
      <Header />

      <div className="bg-deep-black text-grayScale-200 min-h-screen pt-16">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
          <header className="mb-10">
            <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>

            {subtitle && (
              <p className="mt-2 text-sm text-grayScale-400">{subtitle}</p>
            )}
          </header>

          {children}
        </div>

        <Footer />
      </div>
    </>
  );
}
