"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

import Logo from "@/src/components/ui/Logo";
import Navigation from "./Navigation";
import HeaderAuth from "./HeaderAuth";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={clsx(
          "fixed top-0 left-0 z-50 h-16 w-full transition-all duration-300",
          scrolled
            ? "bg-gray-surface backdrop-blur-md shadow-lg"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Navigation />

          <div className="hidden md:flex items-center gap-8">
            <HeaderAuth />
          </div>

          <button
            onClick={() => setOpen(true)}
            className="md:hidden text-white"
          >
            <MenuIcon fontSize="large" />
          </button>
        </div>
      </header>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/40 transition-all z-40 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 h-screen w-72 bg-gray-surface z-50 shadow-xl
        transition-transform duration-300
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-grayScale-600">
          <Logo />

          <button onClick={() => setOpen(false)}>
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-8">
          <Navigation mobile onNavigate={() => setOpen(false)} />

          <HeaderAuth />
        </div>
      </aside>
    </>
  );
}
