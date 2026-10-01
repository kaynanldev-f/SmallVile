"use client";

import Logo from "@/src/components/ui/Logo";
import SpinLoader from "@/src/components/ui/SpinLoader";
import Image from "next/image";
import { Suspense } from "react";
interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}

export default function AuthLayout({
  title,
  children,
  wide,
  subtitle,
}: AuthLayoutProps) {
  return (
    <Suspense fallback={<SpinLoader />}>
      <div className="min-h-screen flex bg-deep-black">
        <div className="relative hidden lg:block w-1/2">
          <Image
            src="/assets/backAuth.png"
            alt="Background"
            fill
            className="object-cover object-left"
            priority
          />
        </div>

        <div className="flex flex-1 items-center justify-center px-8">
          <div
            className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} bg-deep-black rounded-xl p-8 shadow-md`}
          >
            <div className="flex justify-center mb-6">
              <Logo className="mx-auto" />
            </div>

            <h2 className="text-2xl text-center font-bold text-white">
              {title}
            </h2>

            <p className="mt-2 mb-8 text-center text-gray-300">{subtitle}</p>

            {children}
          </div>
        </div>
      </div>
    </Suspense>
  );
}
