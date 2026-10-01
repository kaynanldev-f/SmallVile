"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { ADMIN_SECTIONS } from "./adminSections";

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
      <Link
        href="/admin"
        className={clsx(
          "shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors",
          pathname === "/admin"
            ? "bg-red-cinema text-white"
            : "text-grayScale-400 hover:bg-gray-surface hover:text-white",
        )}
      >
        Visão geral
      </Link>

      {ADMIN_SECTIONS.map((section) => {
        const isActive = pathname.startsWith(section.href);

        return section.ready ? (
          <Link
            key={section.href}
            href={section.href}
            className={clsx(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors",
              isActive
                ? "bg-red-cinema text-white"
                : "text-grayScale-400 hover:bg-gray-surface hover:text-white",
            )}
          >
            {section.label}
          </Link>
        ) : (
          <span
            key={section.href}
            title="Em desenvolvimento"
            className="shrink-0 cursor-not-allowed rounded-lg px-4 py-2 text-sm font-bold text-grayScale-600"
          >
            {section.label}
          </span>
        );
      })}
    </nav>
  );
}
