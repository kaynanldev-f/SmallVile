import Link from "next/link";
import { ADMIN_SECTIONS } from "@/src/components/admin/adminSections";
import { getServerUser } from "@/src/lib/auth";

export default async function AdminDashboardPage() {
  const user = await getServerUser();

  return (
    <div className="flex flex-col gap-8">
      <p className="text-grayScale-400 text-sm">
        Bem-vindo, <span className="font-bold text-white">{user?.name}</span>.
        Aqui você administra o catálogo e o estoque do Cineville.
      </p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {ADMIN_SECTIONS.map((section) => {
          const card = (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black">{section.label}</h2>

                {!section.ready && (
                  <span className="rounded border border-grayScale-600 px-2 py-0.5 text-[10px] font-bold text-grayScale-400 uppercase">
                    Em breve
                  </span>
                )}
              </div>

              <p className="text-grayScale-400 text-xs">
                {section.description}
              </p>
            </>
          );

          return section.ready ? (
            <Link
              key={section.href}
              href={section.href}
              className="flex flex-col gap-3 rounded-xl border border-grayScale-600 bg-gray-surface p-6 transition-all hover:border-red-cinema"
            >
              {card}
            </Link>
          ) : (
            <div
              key={section.href}
              className="flex flex-col gap-3 rounded-xl border border-grayScale-600 bg-gray-surface p-6 opacity-60"
            >
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
